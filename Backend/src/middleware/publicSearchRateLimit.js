const buckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function parsePositiveInt(raw, fallback) {
  const value = parseInt(String(raw), 10);
  if (Number.isNaN(value) || value < 1) return fallback;
  return value;
}

/**
 * In-memory IP throttle for unauthenticated landing searches.
 * Resets hourly; suitable for single-instance dev/staging (not distributed).
 */
function publicSearchRateLimit(req, res, next) {
  const limit = parsePositiveInt(process.env.PUBLIC_SEARCH_RATE_LIMIT_PER_HOUR, 20);
  const windowMs = 60 * 60 * 1000;
  const ip = getClientIp(req);
  const now = Date.now();
  const key = `public-search:${ip}`;

  let entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      success: false,
      code: "PUBLIC_SEARCH_RATE_LIMIT",
      message: "Too many preview searches. Please try again later or sign up for full access.",
      retryAfterSec,
    });
  }

  return next();
}

module.exports = {
  publicSearchRateLimit,
  getClientIp,
};
