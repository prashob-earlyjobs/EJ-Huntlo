const mongoose = require("mongoose");
const User = require("../models/User");
const SourcingSession = require("../models/SourcingSession");
const SavedCandidate = require("../models/SavedCandidate");
const SourcedCandidateDetail = require("../models/SourcedCandidateDetail");
const PeopleScoutLookup = require("../models/PeopleScoutLookup");
const UsageHistory = require("../models/UsageHistory");
const { utilisationFromUser } = require("../utils/userUsage");
const { getUserPlanSummary, resolveTierForUser } = require("../services/planQuotas");

const sanitizeUsageHistoryEntry = (doc) => ({
  id: doc._id.toString(),
  action: doc.action,
  amount: Math.max(1, Math.floor(Number(doc.amount) || 1)),
  createdAt: doc.createdAt,
});

const mapRecentSession = (d) => ({
  id: d._id.toString(),
  futureJobsSessionId: d.futureJobsSessionId || "",
  prompt: typeof d.prompt === "string" ? d.prompt : "",
  sessionTitle: typeof d.sessionTitle === "string" ? d.sessionTitle : "",
  futureJobsStatus: typeof d.futureJobsStatus === "string" ? d.futureJobsStatus : "",
  totalDocs: typeof d.totalDocs === "number" ? d.totalDocs : null,
  candidateCountFirstPage:
    typeof d.candidateCountFirstPage === "number" ? d.candidateCountFirstPage : 0,
  createdAt: d.createdAt,
});

/**
 * GET /api/users/me/dashboard
 * Workspace overview: stats, plan, utilisation, recent sessions & activity.
 */
const getMyDashboard = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }

    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userOid = new mongoose.Types.ObjectId(uid);
    const [plan, { tier }, counts, recentSessions, recentActivity] = await Promise.all([
      getUserPlanSummary(user),
      resolveTierForUser(user),
      Promise.all([
        SourcingSession.countDocuments({ userId: userOid }),
        SavedCandidate.countDocuments({ userId: userOid }),
        SourcedCandidateDetail.countDocuments({ userId: userOid }),
        PeopleScoutLookup.countDocuments({ userId: userOid }),
      ]),
      SourcingSession.find({ userId: userOid })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "futureJobsSessionId prompt sessionTitle futureJobsStatus totalDocs candidateCountFirstPage createdAt"
        )
        .lean(),
      UsageHistory.find({ userId: userOid })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const [sourcingSessions, savedCandidates, sourcedProfiles, peopleScoutLookups] = counts;

    const utilisation = utilisationFromUser(user);
    const searchUsed =
      utilisation.candidateSearches + utilisation.linkedinLookups;
    const searchLimit =
      typeof tier?.searches === "number" && tier.searches > 0 ? tier.searches : null;

    return res.status(200).json({
      success: true,
      greeting: {
        fullName: user.fullName || "",
        companyName: user.companyName || "",
      },
      plan,
      utilisation,
      quotaSummary: {
        searches: {
          used: searchUsed,
          limit: searchLimit,
        },
        verifiedEmails: {
          used: utilisation.emailUnveils,
          limit:
            typeof tier?.verifiedEmails === "number" && tier.verifiedEmails > 0
              ? tier.verifiedEmails
              : null,
        },
        candidateUnlocks: {
          used: utilisation.candidateUnveils,
          limit:
            typeof tier?.candidateUnlocks === "number" && tier.candidateUnlocks > 0
              ? tier.candidateUnlocks
              : null,
        },
        phoneNumbers: {
          used: utilisation.mobileUnveils,
          limit:
            typeof tier?.phoneNumbers === "number" && tier.phoneNumbers > 0
              ? tier.phoneNumbers
              : null,
        },
      },
      stats: {
        sourcingSessions,
        savedCandidates,
        sourcedProfiles,
        peopleScoutLookups,
      },
      recentSessions: recentSessions.map(mapRecentSession),
      recentActivity: recentActivity.map(sanitizeUsageHistoryEntry),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  getMyDashboard,
};
