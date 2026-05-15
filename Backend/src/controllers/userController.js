const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const CreditHistory = require("../models/CreditHistory");
const UsageHistory = require("../models/UsageHistory");
const UserSession = require("../models/UserSession");
const { signToken, verifyToken } = require("../utils/jwt");
const { recordCreditHistory } = require("../utils/recordCreditHistory");
const { utilisationFromUser } = require("../utils/incrementUserUsage");

const normalizeCredits = (user) =>
  Math.max(0, Math.floor(Number(user?.credits ?? 0)));

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  companyName: user.companyName,
  mobile: user.mobile,
  location: typeof user.location === "string" ? user.location : "",
  email: user.email,
  role: user.role === "admin" ? "admin" : "user",
  credits: normalizeCredits(user),
  passwordChangedAt: user.passwordChangedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

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

    const user = await User.create({
      fullName,
      companyName,
      mobile,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      companyName,
      mobile,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      credits: startingCredits,
    });

    const adminId = req.auth?.userId;
    await recordCreditHistory({
      userId: user._id,
      balanceBefore: 0,
      balanceAfter: startingCredits,
      reason: "admin_create",
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

const getMyUtilisationHistory = async (req, res) => {
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

    const entries = await UsageHistory.find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      history: entries.map(sanitizeUsageHistoryEntry),
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

    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
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
  getMyCreditHistory,
  getMyUtilisationHistory,
  getUserCreditHistory,
  logoutUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
