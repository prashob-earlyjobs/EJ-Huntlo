const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const UserSession = require("../models/UserSession");
const Organization = require("../models/Organization");
const UsageHistory = require("../models/UsageHistory");
const SourcingSession = require("../models/SourcingSession");
const { utilisationFromUser } = require("../utils/userUsage");
const { getUserPlanSummary } = require("../services/planQuotas");
const {
  assertTeamOwner,
  getBillingUser,
  listOrganizationMemberIds,
} = require("../services/organizationService");

function sanitizeTeamMember(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    accountRole: user.accountRole,
    memberStatus: user.memberStatus || "active",
    memberPermission: user.memberPermission || "full",
    onboardingCompleted: Boolean(user.onboardingCompleted),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    utilisation: utilisationFromUser(user),
  };
}

const getMyTeam = async (req, res) => {
  try {
    const owner = await assertTeamOwner(req.auth?.userId);
    const org = await Organization.findById(owner.organizationId).lean();
    const memberIds = await listOrganizationMemberIds(owner.organizationId);
    const members = await User.find({ _id: { $in: memberIds } })
      .sort({ accountRole: 1, createdAt: 1 })
      .lean();

    const billingUser = await getBillingUser(owner);
    const plan = billingUser ? await getUserPlanSummary(billingUser) : null;
    const teamUtilisation = utilisationFromUser(billingUser || owner);

    const subMembers = members.filter((m) => m.accountRole === "member");

    return res.status(200).json({
      success: true,
      organization: org
        ? {
            id: org._id.toString(),
            name: org.name,
            ownerUserId: String(org.ownerUserId),
          }
        : null,
      plan,
      teamUtilisation,
      members: members.map(sanitizeTeamMember),
      subMemberCount: subMembers.length,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load team",
    });
  }
};

const createTeamMember = async (req, res) => {
  try {
    const owner = await assertTeamOwner(req.auth?.userId);
    const body = req.body || {};

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const memberPermission =
      body.memberPermission === "search" ? "search" : "full";

    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, mobile, and password are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const member = await User.create({
      fullName,
      companyName: owner.companyName,
      mobile,
      email,
      password: hashedPassword,
      role: "user",
      planId: owner.planId,
      organizationId: owner.organizationId,
      accountRole: "member",
      ownerUserId: owner._id,
      memberStatus: "active",
      memberPermission,
      createdByUserId: owner._id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      onboardingCompanyType: owner.onboardingCompanyType || "",
      onboardingHiringChallenges: owner.onboardingHiringChallenges || [],
      onboardingOutreachChannels: owner.onboardingOutreachChannels || [],
      onboardingHiringVolume: owner.onboardingHiringVolume || "",
    });

    return res.status(201).json({
      success: true,
      message: "Team member created",
      member: sanitizeTeamMember(member),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to create team member",
    });
  }
};

const updateTeamMember = async (req, res) => {
  try {
    const owner = await assertTeamOwner(req.auth?.userId);
    const memberId = req.params.memberId;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid member id" });
    }

    const member = await User.findOne({
      _id: memberId,
      organizationId: owner.organizationId,
      accountRole: "member",
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    const body = req.body || {};
    if (body.memberStatus === "blocked" || body.memberStatus === "active") {
      member.memberStatus = body.memberStatus;
    }
    if (body.memberPermission === "search" || body.memberPermission === "full") {
      member.memberPermission = body.memberPermission;
    }
    if (typeof body.fullName === "string" && body.fullName.trim()) {
      member.fullName = body.fullName.trim();
    }
    if (typeof body.mobile === "string" && body.mobile.trim()) {
      member.mobile = body.mobile.trim();
    }

    await member.save();

    return res.status(200).json({
      success: true,
      message: "Team member updated",
      member: sanitizeTeamMember(member),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update team member",
    });
  }
};

/**
 * POST /api/users/me/team/members/:memberId/reset-password
 * Body: { password, confirmPassword }
 */
const resetTeamMemberPassword = async (req, res) => {
  try {
    const owner = await assertTeamOwner(req.auth?.userId);
    const memberId = req.params.memberId;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid member id" });
    }

    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const confirmPassword =
      typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password must match",
      });
    }

    const member = await User.findOne({
      _id: memberId,
      organizationId: owner.organizationId,
      accountRole: "member",
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    member.password = await bcrypt.hash(password, 10);
    member.passwordChangedAt = new Date();
    await member.save();

    await UserSession.updateMany(
      { userId: member._id, revokedAt: null },
      { $set: { revokedAt: new Date(), lastSeenAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. The member must sign in with the new password.",
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

const getTeamUtilisationHistory = async (req, res) => {
  try {
    const owner = await assertTeamOwner(req.auth?.userId);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || 50), 10) || 50));
    const memberIds = await listOrganizationMemberIds(owner.organizationId);

    const rows = await UsageHistory.find({
      userId: { $in: memberIds },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const users = await User.find({ _id: { $in: memberIds } })
      .select("fullName email accountRole")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const history = rows.map((row) => {
      const u = userMap.get(String(row.userId));
      return {
        id: row._id.toString(),
        userId: String(row.userId),
        userName: u?.fullName || "",
        userEmail: u?.email || "",
        accountRole: u?.accountRole || "",
        action: row.action,
        amount: row.amount,
        billedUserId: row.billedUserId ? String(row.billedUserId) : null,
        createdAt: row.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load team utilisation",
    });
  }
};

const getTeamActivity = async (req, res) => {
  try {
    const owner = await assertTeamOwner(req.auth?.userId);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 30), 10) || 30));
    const memberIds = await listOrganizationMemberIds(owner.organizationId);

    const sessions = await SourcingSession.find({ userId: { $in: memberIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "userId futureJobsSessionId prompt sessionTitle totalDocs candidateCountFirstPage createdAt"
      )
      .lean();

    const users = await User.find({ _id: { $in: memberIds } })
      .select("fullName email accountRole")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const activity = sessions.map((s) => {
      const u = userMap.get(String(s.userId));
      return {
        id: s._id.toString(),
        userId: String(s.userId),
        userName: u?.fullName || "",
        userEmail: u?.email || "",
        accountRole: u?.accountRole || "",
        futureJobsSessionId: s.futureJobsSessionId,
        prompt: s.prompt,
        sessionTitle: s.sessionTitle,
        totalDocs: s.totalDocs,
        candidateCountFirstPage: s.candidateCountFirstPage,
        createdAt: s.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      activity,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load team activity",
    });
  }
};

/** Admin: all organizations with owner + members */
const listOrganizationsAdmin = async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    const out = [];

    for (const org of orgs) {
      const members = await User.find({ organizationId: org._id })
        .select(
          "fullName email accountRole memberStatus planId usageCandidateSearches usageEmailUnveils usageCandidateUnveils usageMobileUnveils usageLinkedinLookups createdAt"
        )
        .sort({ accountRole: 1, createdAt: 1 })
        .lean();

      const owner = members.find(
        (m) => String(m._id) === String(org.ownerUserId) || m.accountRole === "owner"
      );

      out.push({
        id: org._id.toString(),
        name: org.name,
        ownerUserId: String(org.ownerUserId),
        createdAt: org.createdAt,
        owner: owner
          ? {
              id: owner._id.toString(),
              fullName: owner.fullName,
              email: owner.email,
              planId: owner.planId,
            }
          : null,
        members: members.map((m) => ({
          id: m._id.toString(),
          fullName: m.fullName,
          email: m.email,
          accountRole: m.accountRole,
          memberStatus: m.memberStatus,
          utilisation: utilisationFromUser(m),
          createdAt: m.createdAt,
        })),
        memberCount: members.length,
      });
    }

    return res.status(200).json({
      success: true,
      organizations: out,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list organizations",
    });
  }
};

module.exports = {
  getMyTeam,
  createTeamMember,
  updateTeamMember,
  resetTeamMemberPassword,
  getTeamUtilisationHistory,
  getTeamActivity,
  listOrganizationsAdmin,
};
