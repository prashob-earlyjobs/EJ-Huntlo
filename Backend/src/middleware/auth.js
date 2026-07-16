const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

function isIntegrationsApiRequest(req) {
  const url = String(req.originalUrl || req.url || "");
  return url.startsWith("/api/integrations");
}

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

    const timeAuth = isIntegrationsApiRequest(req);
    if (timeAuth) console.time("jwt verify");
    const decoded = verifyToken(token);
    if (timeAuth) console.timeEnd("jwt verify");

    req.auth = {
      userId: decoded.sub,
      role: decoded.role,
      tokenId: decoded.jti || "",
    };

    if (decoded.role !== "admin") {
      if (timeAuth) console.time("user lookup");
      const user = await User.findById(decoded.sub)
        .select(
          "memberStatus accountRole memberPermission organizationId ownerUserId onboardingCompleted role"
        )
        .lean();
      if (timeAuth) console.timeEnd("user lookup");
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
  } catch (error) {
    const expired =
      error &&
      typeof error === "object" &&
      "name" in error &&
      String(error.name) === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
      message: expired ? "Session expired. Please sign in again." : "Invalid or expired token",
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
