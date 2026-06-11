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

/** Inbound HTTP request completed (method, path, status, duration, optional DB stats). */
const logRequestTiming = (meta = {}) => {
  console.log(`[${ts()}] [api:timing] request completed`, meta);
};

/** MongoDB operation (collection, operation, duration). */
const logDbQuery = (meta = {}) => {
  console.log(`[${ts()}] [db:query]`, meta);
};

function stringifyForFjLog(obj) {
  if (obj === undefined) return "";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "[unserializable]";
  }
}

/**
 * One log block per Future Jobs HTTP call with full JSON bodies (no nested [Object]).
 * Copy REQUEST BODY / CURL lines when reporting issues to Future Jobs.
 */
const logFutureJobsExchange = (meta = {}) => {
  const { requestBody, responseBody, method, url, ...summary } = meta;

  logOutbound("futurejobs", "CALL SUMMARY (request + response — share with Future Jobs)", {
    ...summary,
    method,
    url,
    requestBodyJsonLength:
      requestBody !== undefined ? stringifyForFjLog(requestBody).length : 0,
    responseBodyJsonLength:
      responseBody !== undefined ? stringifyForFjLog(responseBody).length : 0,
  });

  if (requestBody !== undefined) {
    const requestJson = stringifyForFjLog(requestBody);
    console.log(
      `[${ts()}] [outbound:futurejobs] REQUEST BODY (exact JSON — copy for curl -d):\n${requestJson}`
    );

    const m = String(method || "POST").toUpperCase();
    const targetUrl = String(url || "").trim();
    if (targetUrl && (m === "POST" || m === "PATCH" || m === "PUT")) {
      console.log(
        `[${ts()}] [outbound:futurejobs] CURL TEMPLATE (set FUTURE_JOBS_API_KEY, or use FUTURE_JOBS_AUTH_STYLE=bearer):\n` +
          `curl -sS -X ${m} '${targetUrl}' \\\n` +
          `  -H 'Content-Type: application/json' \\\n` +
          `  -H 'x-fj-api-key: $FUTURE_JOBS_API_KEY' \\\n` +
          `  --data-binary @- <<'FJ_JSON'\n${requestJson}\nFJ_JSON`
      );
    }
  }

  if (responseBody !== undefined) {
    console.log(
      `[${ts()}] [outbound:futurejobs] RESPONSE BODY (exact JSON):\n${stringifyForFjLog(responseBody)}`
    );
  }
};

module.exports = {
  ts,
  safeJsonPreview,
  payloadForSupportLog,
  logOutbound,
  logApi,
  logRequestTiming,
  logDbQuery,
  logFutureJobsExchange,
};
