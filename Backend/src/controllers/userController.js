const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");
const CreditHistory = require("../models/CreditHistory");
const UsageHistory = require("../models/UsageHistory");
const UserSession = require("../models/UserSession");
const { signToken, verifyToken } = require("../utils/jwt");
const { recordCreditHistory } = require("../utils/recordCreditHistory");
const { recordPlanHistory } = require("../utils/recordPlanHistory");
const PlanHistory = require("../models/PlanHistory");
const { utilisationFromUser } = require("../utils/userUsage");
const {
  getDefaultPlanId,
  getUserPlanSummary,
  validatePlanIdExists,
  getEnrichedTiers,
} = require("../services/planQuotas");
const {
  createOrganizationForOwner,
  ensureOrganizationForOwner,
} = require("../services/organizationService");

const normalizeCredits = (user) =>
  Math.max(0, Math.floor(Number(user?.credits ?? 0)));

const sanitizeWorkspaceOwnerForMember = (owner, planSummary) => ({
  id: String(owner._id),
  fullName: typeof owner.fullName === "string" ? owner.fullName : "",
  email: typeof owner.email === "string" ? owner.email : "",
  companyName: typeof owner.companyName === "string" ? owner.companyName : "",
  mobile: typeof owner.mobile === "string" ? owner.mobile : "",
  location: typeof owner.location === "string" ? owner.location : "",
  profilePhotoUrl:
    typeof owner.profilePhotoUrl === "string" ? owner.profilePhotoUrl.trim() : "",
  planId: planSummary?.planId || owner.planId || "trial",
  planName: planSummary?.planName || planSummary?.planId || "Trial",
});

async function resolveWorkspaceOwnerForMember(member) {
  if (!member || member.accountRole !== "member") return null;

  let ownerId = member.ownerUserId;
  if (!ownerId && member.organizationId) {
    const org = await Organization.findById(member.organizationId).select("ownerUserId").lean();
    ownerId = org?.ownerUserId || null;
  }
  if (!ownerId || !mongoose.Types.ObjectId.isValid(String(ownerId))) return null;

  const owner = await User.findById(ownerId);
  if (!owner) return null;

  const plan = await getUserPlanSummary(owner);
  return sanitizeWorkspaceOwnerForMember(owner, plan);
}

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  companyName: user.companyName,
  mobile: user.mobile,
  location: typeof user.location === "string" ? user.location : "",
  profilePhotoUrl:
    typeof user.profilePhotoUrl === "string" ? user.profilePhotoUrl.trim() : "",
  email: user.email,
  role: user.role === "admin" ? "admin" : "user",
  credits: normalizeCredits(user),
  planId:
    typeof user.planId === "string" && user.planId.trim()
      ? user.planId.trim()
      : "trial",
  onboardingCompleted: Boolean(user.onboardingCompleted),
  organizationId: user.organizationId ? String(user.organizationId) : null,
  accountRole: user.accountRole || null,
  ownerUserId: user.ownerUserId ? String(user.ownerUserId) : null,
  memberStatus: user.memberStatus || "active",
  memberPermission: user.memberPermission || "full",
  onboarding: {
    companyType:
      typeof user.onboardingCompanyType === "string" ? user.onboardingCompanyType : "",
    hiringChallenges: Array.isArray(user.onboardingHiringChallenges)
      ? user.onboardingHiringChallenges
      : [],
    outreachChannels: Array.isArray(user.onboardingOutreachChannels)
      ? user.onboardingOutreachChannels
      : [],
    hiringVolume:
      typeof user.onboardingHiringVolume === "string" ? user.onboardingHiringVolume : "",
    completedAt: user.onboardingCompletedAt || null,
  },
  passwordChangedAt: user.passwordChangedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const VALID_COMPANY_TYPES = new Set([
  "recruitment_agency",
  "startup",
  "enterprise_gcc",
  "staffing_firm",
  "executive_search",
]);

const VALID_HIRING_CHALLENGES = new Set([
  "finding_qualified",
  "low_response",
  "manual_outreach",
  "screening",
  "followups",
  "high_volume",
]);

const VALID_OUTREACH_CHANNELS = new Set([
  "whatsapp",
  "email",
  "linkedin",
  "calls",
  "sms",
]);

const VALID_HIRING_VOLUMES = new Set(["1_5", "5_20", "20_100", "100_plus"]);

const issueAuthPayload = async (req, user) => {
  const tokenId = randomUUID();
  const token = signToken(
    {
      sub: user._id.toString(),
      role: user.role === "admin" ? "admin" : "user",
    },
    { jwtid: tokenId }
  );
  const decoded = verifyToken(token);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 86400000);
  await UserSession.create({
    userId: user._id,
    tokenId,
    userAgent: req.headers["user-agent"] || "",
    ipAddress:
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "",
    expiresAt,
    lastSeenAt: new Date(),
  });
  return {
    user: sanitizeUser(user),
    token,
  };
};

const getActiveSessionCount = async (userId) =>
  UserSession.countDocuments({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

const sanitizeCreditEntry = (entry) => {
  const pb = entry.performedBy;
  const populated =
    pb &&
    typeof pb === "object" &&
    pb.fullName !== undefined &&
    pb.email !== undefined;

  return {
    id: entry._id,
    userId: entry.userId,
    balanceBefore: entry.balanceBefore,
    balanceAfter: entry.balanceAfter,
    delta: entry.delta,
    reason: entry.reason,
    performedBy: populated
      ? {
          id: pb._id,
          fullName: pb.fullName,
          email: pb.email,
        }
      : null,
    createdAt: entry.createdAt,
  };
};

const registerUser = async (req, res) => {
  try {
    const { fullName, companyName, mobile, email, password, confirmPassword } =
      req.body;

    if (
      !fullName ||
      !companyName ||
      !mobile ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password must match",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const tiers = await getEnrichedTiers();
    const defaultPlanId = getDefaultPlanId(tiers);

    const user = await User.create({
      fullName,
      companyName,
      mobile,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      planId: defaultPlanId,
    });

    await recordCreditHistory({
      userId: user._id,
      balanceBefore: 0,
      balanceAfter: normalizeCredits(user),
      reason: "signup",
      performedBy: null,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      ...(await issueAuthPayload(req, user)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role !== "admin" && user.memberStatus === "blocked") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BLOCKED",
        message:
          "Your account has been blocked. Contact your team owner or support.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      ...(await issueAuthPayload(req, user)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

const updateUserCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits, delta } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const current = normalizeCredits(user);
    let next = current;
    let changeReason = "admin_set";

    if (delta !== undefined && delta !== null && delta !== "") {
      const d = Number(delta);
      if (!Number.isFinite(d)) {
        return res.status(400).json({
          success: false,
          message: "Delta must be a valid number",
        });
      }
      next = Math.max(0, Math.floor(current + d));
      changeReason = "admin_delta";
    } else if (credits !== undefined && credits !== null && credits !== "") {
      const c = Number(credits);
      if (!Number.isFinite(c) || c < 0) {
        return res.status(400).json({
          success: false,
          message: "Credits must be a non-negative number",
        });
      }
      next = Math.floor(c);
      changeReason = "admin_set";
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide either credits (set balance) or delta (add/subtract)",
      });
    }

    if (next === current) {
      return res.status(200).json({
        success: true,
        message: "Credits unchanged",
        user: sanitizeUser(user),
      });
    }

    user.credits = next;
    await user.save();

    const actorId = req.auth?.userId;
    await recordCreditHistory({
      userId: user._id,
      balanceBefore: current,
      balanceAfter: next,
      reason: changeReason,
      performedBy: actorId ? new mongoose.Types.ObjectId(actorId) : null,
    });

    return res.status(200).json({
      success: true,
      message: "Credits updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update credits",
      error: error.message,
    });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const {
      fullName,
      companyName,
      mobile,
      email,
      password,
      confirmPassword,
      role,
      credits: initialCredits,
      planId: incomingPlanId,
    } = req.body;

    if (
      !fullName ||
      !companyName ||
      !mobile ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password must match",
      });
    }

    const targetRole = role === "admin" ? "admin" : "user";

    let startingCredits = 0;
    if (initialCredits !== undefined && initialCredits !== null && initialCredits !== "") {
      const c = Number(initialCredits);
      if (!Number.isFinite(c) || c < 0) {
        return res.status(400).json({
          success: false,
          message: "Initial credits must be a non-negative number",
        });
      }
      startingCredits = Math.floor(c);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const planCheck = await validatePlanIdExists(incomingPlanId);
    if (!planCheck.ok) {
      return res.status(400).json({
        success: false,
        message: planCheck.message,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      companyName,
      mobile,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      credits: startingCredits,
      planId: planCheck.planId,
    });

    const adminId = req.auth?.userId;
    await recordCreditHistory({
      userId: user._id,
      balanceBefore: 0,
      balanceAfter: startingCredits,
      reason: "admin_create",
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : null,
    });

    await recordPlanHistory({
      userId: user._id,
      planIdBefore: "",
      planIdAfter: planCheck.planId,
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : null,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

const updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (planId === undefined || planId === null || String(planId).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const planCheck = await validatePlanIdExists(planId);
    if (!planCheck.ok) {
      return res.status(400).json({
        success: false,
        message: planCheck.message,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const planIdBefore =
      typeof user.planId === "string" && user.planId.trim() ? user.planId.trim() : "";
    const planIdAfter = planCheck.planId;

    if (planIdBefore !== planIdAfter) {
      user.planId = planIdAfter;
      await user.save();

      const actorId = req.auth?.userId;
      await recordPlanHistory({
        userId: user._id,
        planIdBefore,
        planIdAfter,
        performedBy: actorId ? new mongoose.Types.ObjectId(actorId) : null,
      });
    }

    const plan = await getUserPlanSummary(user);

    return res.status(200).json({
      success: true,
      message:
        planIdBefore === planIdAfter ? "Plan unchanged" : "User plan updated",
      user: sanitizeUser(user),
      plan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user plan",
      error: error.message,
    });
  }
};

const getMyCreditHistory = async (req, res) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50)
    );
    const uid = req.auth.userId;
    if (!mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }

    const entries = await CreditHistory.find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("performedBy", "fullName email");

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizeCreditEntry),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch credit history",
      error: error.message,
    });
  }
};

const sanitizeUsageHistoryEntry = (doc) => ({
  id: doc._id.toString(),
  action: doc.action,
  amount: Math.max(1, Math.floor(Number(doc.amount) || 1)),
  createdAt: doc.createdAt,
});

const parseUsageHistoryPaging = (query) => {
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query?.limit ?? "20"), 10) || 20)
  );
  const page = Math.max(1, parseInt(String(query?.page ?? "1"), 10) || 1);
  return { limit, page, skip: (page - 1) * limit };
};

const buildUsageHistoryPagination = ({ page, limit, totalDocs }) => {
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
  const safePage = Math.min(page, totalPages);
  return {
    page: safePage,
    limit,
    totalDocs,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
    nextPage: safePage < totalPages ? safePage + 1 : null,
    prevPage: safePage > 1 ? safePage - 1 : null,
  };
};

const sanitizeUsageHistoryEntryWithUser = (doc) => {
  const base = sanitizeUsageHistoryEntry(doc);
  const user = doc.userId;
  const populated =
    user &&
    typeof user === "object" &&
    user._id &&
    user.fullName !== undefined;

  return {
    ...base,
    user: populated
      ? {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
        }
      : null,
  };
};

const getAllUtilisationHistory = async (req, res) => {
  try {
    const { limit, page } = parseUsageHistoryPaging(req.query);
    const filter = {};
    const userIdFilter = String(req.query.userId || "").trim();
    if (userIdFilter) {
      if (!mongoose.Types.ObjectId.isValid(userIdFilter)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id filter",
        });
      }
      filter.userId = userIdFilter;
    }

    const totalDocs = await UsageHistory.countDocuments(filter);
    const pagination = buildUsageHistoryPagination({ page, limit, totalDocs });
    const effectiveSkip = (pagination.page - 1) * limit;

    const entries = await UsageHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(effectiveSkip)
      .limit(limit)
      .populate("userId", "fullName email")
      .lean();

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizeUsageHistoryEntryWithUser),
      pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team utilisation history",
      error: error.message,
    });
  }
};

const getMyUtilisationHistory = async (req, res) => {
  try {
    const { limit, page } = parseUsageHistoryPaging(req.query);
    const uid = req.auth.userId;
    if (!mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }

    const filter = { userId: uid };
    const totalDocs = await UsageHistory.countDocuments(filter);
    const pagination = buildUsageHistoryPagination({ page, limit, totalDocs });
    const effectiveSkip = (pagination.page - 1) * limit;

    const entries = await UsageHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(effectiveSkip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizeUsageHistoryEntry),
      pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch utilisation history",
      error: error.message,
    });
  }
};

const getUserCreditHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50)
    );

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const entries = await CreditHistory.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("performedBy", "fullName email");

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizeCreditEntry),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch credit history",
      error: error.message,
    });
  }
};

const sanitizePlanHistoryEntry = (entry) => {
  const pb = entry.performedBy;
  const populated =
    pb &&
    typeof pb === "object" &&
    pb.fullName !== undefined &&
    pb.email !== undefined;

  return {
    id: entry._id.toString(),
    planIdBefore: entry.planIdBefore || "",
    planIdAfter: entry.planIdAfter || "",
    performedBy: populated
      ? {
          id: pb._id.toString(),
          fullName: pb.fullName,
          email: pb.email,
        }
      : null,
    createdAt: entry.createdAt,
  };
};

const getUserUtilisationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, page } = parseUsageHistoryPaging(req.query);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const filter = { userId: id };
    const totalDocs = await UsageHistory.countDocuments(filter);
    const pagination = buildUsageHistoryPagination({ page, limit, totalDocs });
    const effectiveSkip = (pagination.page - 1) * limit;

    const entries = await UsageHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(effectiveSkip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizeUsageHistoryEntry),
      pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch utilisation history",
      error: error.message,
    });
  }
};

const getUserPlanHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50)
    );

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const entries = await PlanHistory.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("performedBy", "fullName email");

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizePlanHistoryEntry),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plan history",
      error: error.message,
    });
  }
};

const getUserPlanDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const plan = await getUserPlanSummary(user);
    const utilisation = utilisationFromUser(user);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      plan,
      utilisation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user plan details",
      error: error.message,
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    const tokenId = req.auth?.tokenId;
    if (uid && tokenId) {
      await UserSession.updateOne(
        { userId: uid, tokenId, revokedAt: null },
        { $set: { revokedAt: new Date(), lastSeenAt: new Date() } }
      );
    }
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error.message,
    });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }

    let user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "admin" && user.accountRole !== "member") {
      user = (await ensureOrganizationForOwner(user)) || user;
    }

    const plan = await getUserPlanSummary(user);
    const workspaceOwner = await resolveWorkspaceOwnerForMember(user);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      utilisation: plan.utilisation || utilisationFromUser(user),
      plan,
      workspaceOwner,
      security: {
        passwordChangedAt: user.passwordChangedAt || user.updatedAt || null,
        activeSessions: await getActiveSessionCount(user._id),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

const updateMyProfile = async (req, res) => {
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

    const incoming = req.body || {};
    const next = {
      fullName:
        typeof incoming.fullName === "string" ? incoming.fullName.trim() : user.fullName,
      companyName:
        typeof incoming.companyName === "string"
          ? incoming.companyName.trim()
          : user.companyName,
      mobile: typeof incoming.mobile === "string" ? incoming.mobile.trim() : user.mobile,
      location:
        typeof incoming.location === "string" ? incoming.location.trim() : user.location || "",
      email:
        typeof incoming.email === "string" ? incoming.email.trim().toLowerCase() : user.email,
    };

    if (!next.fullName || !next.companyName || !next.mobile || !next.email) {
      return res.status(400).json({
        success: false,
        message: "Full name, company name, mobile, and email are required",
      });
    }

    if (next.email !== user.email) {
      const existing = await User.findOne({ email: next.email });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }
    }

    user.fullName = next.fullName;
    user.companyName = next.companyName;
    user.mobile = next.mobile;
    user.location = next.location;
    user.email = next.email;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      user: sanitizeUser(user),
      utilisation: utilisationFromUser(user),
      security: {
        passwordChangedAt: user.passwordChangedAt || user.updatedAt || null,
        activeSessions: await getActiveSessionCount(user._id),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

const completeMyOnboarding = async (req, res) => {
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

    const body = req.body || {};
    const companyType =
      typeof body.companyType === "string" ? body.companyType.trim() : "";
    const hiringVolume =
      typeof body.hiringVolume === "string" ? body.hiringVolume.trim() : "";

    if (!VALID_COMPANY_TYPES.has(companyType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company type",
      });
    }
    if (!VALID_HIRING_VOLUMES.has(hiringVolume)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hiring volume",
      });
    }

    const hiringChallenges = Array.isArray(body.hiringChallenges)
      ? body.hiringChallenges
          .filter((v) => typeof v === "string" && VALID_HIRING_CHALLENGES.has(v.trim()))
          .map((v) => v.trim())
      : [];
    const outreachChannels = Array.isArray(body.outreachChannels)
      ? body.outreachChannels
          .filter((v) => typeof v === "string" && VALID_OUTREACH_CHANNELS.has(v.trim()))
          .map((v) => v.trim())
      : [];

    if (hiringChallenges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one hiring challenge",
      });
    }
    if (outreachChannels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one outreach channel",
      });
    }

    user.onboardingCompanyType = companyType;
    user.onboardingHiringChallenges = hiringChallenges;
    user.onboardingOutreachChannels = outreachChannels;
    user.onboardingHiringVolume = hiringVolume;
    user.onboardingCompleted = true;
    user.onboardingCompletedAt = new Date();
    await user.save();

    if (user.role !== "admin" && user.accountRole !== "member") {
      await createOrganizationForOwner(user);
    }

    const refreshed = await User.findById(user._id);

    return res.status(200).json({
      success: true,
      message: "Onboarding completed",
      user: sanitizeUser(refreshed || user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save onboarding",
      error: error.message,
    });
  }
};

const deleteStoredProfilePhoto = async (relativeUrl) => {
  if (typeof relativeUrl !== "string" || !relativeUrl.trim()) return;
  const normalized = relativeUrl.trim();
  if (!normalized.startsWith("/uploads/profile-photos/")) return;
  const filename = path.basename(normalized);
  if (!filename || filename.includes("..")) return;
  const fullPath = path.join(__dirname, "../uploads/profile-photos", filename);
  try {
    await fs.unlink(fullPath);
  } catch {
    // ignore missing files
  }
};

const uploadMyProfilePhoto = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Photo file is required",
      });
    }

    const user = await User.findById(uid);
    if (!user) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const previousPhoto = user.profilePhotoUrl;
    const relativePath = `/uploads/profile-photos/${req.file.filename}`;
    user.profilePhotoUrl = relativePath;
    await user.save();

    if (previousPhoto && previousPhoto !== relativePath) {
      await deleteStoredProfilePhoto(previousPhoto);
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    return res.status(500).json({
      success: false,
      message: "Failed to upload profile photo",
      error: error.message,
    });
  }
};

const removeMyProfilePhoto = async (req, res) => {
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

    const previousPhoto = user.profilePhotoUrl;
    user.profilePhotoUrl = "";
    await user.save();

    if (previousPhoto) {
      await deleteStoredProfilePhoto(previousPhoto);
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo removed",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove profile photo",
      error: error.message,
    });
  }
};

const changeMyPassword = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password, and confirm password are required",
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password must match",
      });
    }

    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const validCurrent = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrent) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }
    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();

    const tokenId = req.auth?.tokenId || "";
    await UserSession.updateMany(
      {
        userId: user._id,
        revokedAt: null,
        tokenId: { $ne: tokenId },
      },
      { $set: { revokedAt: new Date(), lastSeenAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      security: {
        passwordChangedAt: user.passwordChangedAt,
        activeSessions: await getActiveSessionCount(user._id),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update password",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  listUsers,
  createUserByAdmin,
  updateUserCredits,
  updateUserPlan,
  getMyCreditHistory,
  getMyUtilisationHistory,
  getAllUtilisationHistory,
  getUserCreditHistory,
  getUserUtilisationHistory,
  getUserPlanHistory,
  getUserPlanDetails,
  logoutUser,
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  removeMyProfilePhoto,
  completeMyOnboarding,
  changeMyPassword,
};
