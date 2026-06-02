/**
 * Lightweight structured logs for outbound HTTP calls and API handlers.
 */

const ts = () => new Date().toISOString();

const safeJsonPreview = (obj, maxLen = 800) => {
  try {
    const s = JSON.stringify(obj);
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}…(${s.length} chars)`;
  } catch {
    return "[unserializable]";
  }
};

/** Full payload for support logs (Future Jobs handoff); truncates only very large bodies. */
const payloadForSupportLog = (obj, maxLen = 100_000) => {
  if (obj === undefined) return undefined;
  try {
    const s = JSON.stringify(obj);
    if (s.length <= maxLen) return obj;
    return {
      _truncated: true,
      totalChars: s.length,
      preview: `${s.slice(0, maxLen)}…`,
    };
  } catch {
    return { _error: "unserializable" };
  }
};

/**
 * @param {string} service - e.g. "futurejobs"
 * @param {string} event - short description
 * @param {object} [meta] - extra fields (avoid secrets)
 */
const logOutbound = (service, event, meta = {}) => {
  console.log(`[${ts()}] [outbound:${service}] ${event}`, meta);
};

/**
 * Inbound API handler context (our Express routes).
 */
const logApi = (handler, event, meta = {}) => {
  console.log(`[${ts()}] [api:${handler}] ${event}`, meta);
};

/**
 * One line per Future Jobs HTTP call: method, URL, request body, response, timing.
 * Copy this log when reporting issues to Future Jobs.
 */
const logFutureJobsExchange = (meta = {}) => {
  logOutbound("futurejobs", "CALL SUMMARY (request + response — share with Future Jobs)", meta);
};

module.exports = {
  ts,
  safeJsonPreview,
  payloadForSupportLog,
  logOutbound,
  logApi,
  logFutureJobsExchange,
};
