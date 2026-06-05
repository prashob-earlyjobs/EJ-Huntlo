const mongoose = require("mongoose");
const User = require("../models/User");
const SourcingSession = require("../models/SourcingSession");
const SavedCandidate = require("../models/SavedCandidate");
const SourcedCandidateDetail = require("../models/SourcedCandidateDetail");
const PeopleScoutLookup = require("../models/PeopleScoutLookup");
const UsageHistory = require("../models/UsageHistory");
const { utilisationFromUser } = require("../utils/userUsage");
const { getUserPlanSummary, resolveTierForUser } = require("../services/planQuotas");
const { getBillingUser } = require("../services/organizationService");
const { userIdFilterForActor } = require("../utils/orgScope");

const sanitizeUsageHistoryEntry = (doc) => ({
  id: doc._id.toString(),
  action: doc.action,
  amount: Math.max(1, Math.floor(Number(doc.amount) || 1)),
  createdAt: doc.createdAt,
});

async function storedProfileCountBySessionIds(sessionIds, scopeFilter = {}) {
  const ids = [...new Set(sessionIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const match = { ...scopeFilter, sourcingSessionId: { $in: ids } };
  const rows = await SourcedCandidateDetail.aggregate([
    { $match: match },
    { $group: { _id: "$sourcingSessionId", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

const mapRecentSession = (d, storedCountBySession = {}) => {
  const sid =
    typeof d.futureJobsSessionId === "string" ? d.futureJobsSessionId.trim() : "";
  const storedCount = sid ? storedCountBySession[sid] : undefined;
  const totalDocs =
    typeof storedCount === "number"
      ? storedCount
      : typeof d.totalDocs === "number"
        ? d.totalDocs
        : null;
  return {
    id: d._id.toString(),
    futureJobsSessionId: d.futureJobsSessionId || "",
    prompt: typeof d.prompt === "string" ? d.prompt : "",
    sessionTitle: typeof d.sessionTitle === "string" ? d.sessionTitle : "",
    futureJobsStatus: typeof d.futureJobsStatus === "string" ? d.futureJobsStatus : "",
    totalDocs,
    candidateCountFirstPage:
      typeof d.candidateCountFirstPage === "number" ? d.candidateCountFirstPage : 0,
    createdAt: d.createdAt,
  };
};

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

    const scopeFilter =
      (await userIdFilterForActor(uid)) || { userId: new mongoose.Types.ObjectId(uid) };
    const billingUser = (await getBillingUser(user)) || user;

    const [plan, { tier }, counts, recentSessions, recentActivity] = await Promise.all([
      getUserPlanSummary(user),
      resolveTierForUser(user),
      Promise.all([
        SourcingSession.countDocuments(scopeFilter),
        SavedCandidate.countDocuments(scopeFilter),
        SourcedCandidateDetail.countDocuments(scopeFilter),
        PeopleScoutLookup.countDocuments(scopeFilter),
      ]),
      SourcingSession.find(scopeFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "futureJobsSessionId prompt sessionTitle futureJobsStatus totalDocs candidateCountFirstPage createdAt userId"
        )
        .lean(),
      UsageHistory.find(scopeFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const [sourcingSessions, savedCandidates, sourcedProfiles, peopleScoutLookups] = counts;

    const storedCountBySession = await storedProfileCountBySessionIds(
      recentSessions.map((d) => d.futureJobsSessionId),
      scopeFilter
    );

    const utilisation = utilisationFromUser(billingUser);
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
        emailOutreach: {
          used: Math.max(0, Math.floor(Number(plan?.outreachThreads?.email) || 0)),
          limit:
            typeof tier?.emailOutreaches === "number" && tier.emailOutreaches > 0
              ? tier.emailOutreaches
              : null,
        },
        whatsappOutreach: {
          used: Math.max(0, Math.floor(Number(plan?.outreachThreads?.whatsapp) || 0)),
          limit:
            typeof tier?.whatsappOutreaches === "number" && tier.whatsappOutreaches > 0
              ? tier.whatsappOutreaches
              : null,
        },
      },
      stats: {
        sourcingSessions,
        savedCandidates,
        sourcedProfiles,
        peopleScoutLookups,
      },
      recentSessions: recentSessions.map((d) => mapRecentSession(d, storedCountBySession)),
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
