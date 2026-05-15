/**
 * Strip invisible / non-Latin-1 characters often pasted into .env (e.g. U+202F narrow
 * no-break space at code point 8239). HTTP headers must be ByteString-safe.
 */
const normalizeApiKey = (raw) => {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
};

/**
 * Future Jobs (futurejobs.ai) API configuration — loaded from environment only.
 */
const getFutureJobsConfig = () => ({
  baseUrl: (
    process.env.FUTURE_JOBS_API_URL || "https://prod.api.futurejobs.ai/api/v1"
  ).replace(/\/$/, ""),
  apiKey: normalizeApiKey(process.env.FUTURE_JOBS_API_KEY || ""),
});

module.exports = { getFutureJobsConfig, normalizeApiKey };
