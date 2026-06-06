/** Debug logging for Gupshup Gateway send + webhooks (passwords redacted). */

const PREFIX = "[gupshup]";

function redactUrl(url) {
  return String(url || "").replace(/password=[^&]+/gi, "password=***");
}

function redactQueryString(qs) {
  return redactUrl(String(qs || ""));
}

function safeJson(value, maxLen = 4000) {
  try {
    const text = JSON.stringify(value);
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}…(${text.length} chars)`;
  } catch {
    return String(value);
  }
}

function truncate(text, max = 120) {
  const s = String(text || "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function logSendRequest({ method, sendTo, isTemplate, credentialMode, msgPreview }) {
  console.log(`${PREFIX} send → request`, {
    method,
    sendTo,
    isTemplate: Boolean(isTemplate),
    credentialMode,
    msgPreview: truncate(msgPreview, 200),
  });
}

function logSendResponse({ method, httpStatus, rawText, jsonData, parsed }) {
  console.log(`${PREFIX} send ← response`, {
    method,
    httpStatus,
    rawText: truncate(rawText, 500),
    json: jsonData ? safeJson(jsonData, 2000) : null,
    messageId: parsed?.messageId || "",
    status: parsed?.status || jsonData?.response?.status || jsonData?.status || "",
  });
}

function logSendError({ method, sendTo, error }) {
  console.error(`${PREFIX} send ✗ error`, {
    method,
    sendTo,
    message: error?.message || String(error),
    statusCode: error?.statusCode,
  });
}

function logWebhookReceived({ route, method, query, body }) {
  console.log(`${PREFIX} webhook → received`, {
    route,
    method,
    query: query && Object.keys(query).length ? query : undefined,
    body: safeJson(body, 3000),
  });
}

function logWebhookResponse({ route, httpStatus, payload, emptyBody }) {
  if (emptyBody) {
    console.log(`${PREFIX} webhook ← response`, { route, httpStatus, body: "(empty)" });
    return;
  }
  console.log(`${PREFIX} webhook ← response`, {
    route,
    httpStatus,
    body: safeJson(payload, 3000),
  });
}

function logWebhookError({ route, error }) {
  console.error(`${PREFIX} webhook ✗ error`, {
    route,
    message: error?.message || String(error),
  });
}

module.exports = {
  PREFIX,
  redactUrl,
  redactQueryString,
  logSendRequest,
  logSendResponse,
  logSendError,
  logWebhookReceived,
  logWebhookResponse,
  logWebhookError,
};
