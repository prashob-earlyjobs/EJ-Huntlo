const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = verifyToken(token);
    req.auth = {
      userId: decoded.sub,
      role: decoded.role,
      tokenId: decoded.jti || "",
    };

    if (decoded.role !== "admin") {
      const user = await User.findById(decoded.sub).select(
        "memberStatus accountRole memberPermission organizationId ownerUserId onboardingCompleted role"
      );
      if (user?.memberStatus === "blocked") {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_BLOCKED",
          message: "Your account has been blocked. Contact your team owner or support.",
        });
      }
      req.auth.accountRole = user?.accountRole || null;
      req.auth.memberPermission = user?.memberPermission || "full";
      req.auth.organizationId = user?.organizationId
        ? String(user.organizationId)
        : null;
      req.auth.ownerUserId = user?.ownerUserId ? String(user.ownerUserId) : null;
      req.auth.isTeamOwner = user?.accountRole === "owner";
      req.auth.isTeamMember = user?.accountRole === "member";
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.auth || req.auth.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
