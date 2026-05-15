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

module.exports = {
  ts,
  safeJsonPreview,
  logOutbound,
  logApi,
};
