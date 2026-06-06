const { resolveMetaTemplateName } = require("../constants/whatsappMetaTemplates");
const { getGupshupWhatsAppCredentials } = require("./gupshupWhatsAppConfig");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");
const {
  redactUrl,
  logSendRequest,
  logSendResponse,
  logSendError,
} = require("../utils/gupshupLogger");

const MAX_GET_URL_LENGTH = 1800;

function assertGupshupRecipient(to) {
  const destination = normalizeToWhatsAppDigits(to);
  if (!destination || destination.length < 10) {
    const err = new Error("Invalid recipient phone for Gupshup Gateway API.");
    err.statusCode = 400;
    throw err;
  }
  return destination;
}

function isTemplateSend(templateId) {
  return Boolean(resolveMetaTemplateName(templateId));
}

function parseGatewayResponse(rawText, jsonData) {
  if (jsonData && typeof jsonData === "object") {
    const nested =
      jsonData.response && typeof jsonData.response === "object"
        ? jsonData.response
        : jsonData;
    const status = String(nested.status || jsonData.status || "")
      .trim()
      .toLowerCase();
    const details = String(
      nested.details || nested.reason || jsonData.message || jsonData.details || ""
    ).trim();

    if (status === "error" || status === "failed") {
      const err = new Error(details || "Gupshup Gateway send failed.");
      err.statusCode = 400;
      throw err;
    }

    const messageId = String(
      nested.id || nested.messageId || jsonData.id || jsonData.messageId || ""
    ).trim();

    return { messageId, raw: jsonData };
  }

  const text = String(rawText || "").trim();
  if (!text) {
    const err = new Error("Empty response from Gupshup Gateway API.");
    err.statusCode = 502;
    throw err;
  }

  const parts = text.split("|").map((p) => p.trim());
  const head = parts[0]?.toLowerCase() || "";

  if (head === "success" && parts.length >= 3) {
    return { messageId: parts[2], raw: { text, parts } };
  }

  if (head === "error" || head === "failed") {
    const err = new Error(parts[1] || text);
    err.statusCode = 400;
    throw err;
  }

  return { messageId: parts[2] || parts[1] || "", raw: { text, parts } };
}

function buildGatewayQueryParams(creds, { sendTo, msg, isTemplate, footer }) {
  const params = new URLSearchParams();
  params.set("userid", creds.userid);
  params.set("password", creds.password);
  params.set("send_to", sendTo);
  params.set("v", "1.1");
  params.set("format", "json");
  params.set("msg_type", "TEXT");
  params.set("method", creds.method);
  params.set("auth_scheme", "plain");
  params.set("msg", msg);
  if (isTemplate) {
    params.set("isTemplate", "true");
  }
  if (footer) {
    params.set("footer", footer);
  }
  return params;
}

async function gatewaySendMessage({ sendTo, msg, isTemplate, credentialMode = "template", footer }) {
  const creds = getGupshupWhatsAppCredentials(credentialMode);
  if (!creds) {
    const err = new Error(
      credentialMode === "reply"
        ? "Gupshup reply credentials are not configured (GUPSHUP_REPLY_USER_ID / GUPSHUP_REPLY_PASSWORD)."
        : "Gupshup template credentials are not configured (GUPSHUP_TEMPLATE_USER_ID / GUPSHUP_TEMPLATE_PASSWORD)."
    );
    err.statusCode = 503;
    throw err;
  }

  const text = String(msg || "").trim();
  if (!text) {
    const err = new Error("Message body is empty.");
    err.statusCode = 400;
    throw err;
  }

  const params = buildGatewayQueryParams(creds, {
    sendTo,
    msg: text,
    isTemplate,
    footer,
  });
  const query = params.toString();
  const baseUrl = creds.gatewayBaseUrl;
  const usePost = query.length > MAX_GET_URL_LENGTH;
  const httpMethod = usePost ? "POST" : "GET";
  const url = usePost ? baseUrl : `${baseUrl}?${query}`;

  logSendRequest({
    method: httpMethod,
    sendTo,
    isTemplate,
    credentialMode,
    msgPreview: text,
  });
  console.log("[gupshup] send → url", redactUrl(url));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url, {
      method: httpMethod,
      headers: usePost
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : undefined,
      body: usePost ? query : undefined,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let jsonData = null;
    try {
      jsonData = JSON.parse(rawText);
    } catch {
      jsonData = null;
    }

    if (!res.ok) {
      logSendResponse({
        method: httpMethod,
        httpStatus: res.status,
        rawText,
        jsonData,
        parsed: null,
      });
      const err = new Error(
        String(jsonData?.message || jsonData?.response?.details || rawText || "").trim() ||
          "Gupshup Gateway HTTP error."
      );
      err.statusCode = res.status >= 500 ? 502 : 400;
      throw err;
    }

    const parsed = parseGatewayResponse(rawText, jsonData);
    logSendResponse({
      method: httpMethod,
      httpStatus: res.status,
      rawText,
      jsonData,
      parsed,
    });

    return {
      provider: "gupshup",
      messageId: parsed.messageId,
      raw: parsed.raw,
    };
  } catch (error) {
    logSendError({ method: httpMethod, sendTo, error });
    if (error.statusCode) throw error;
    if (error.name === "AbortError") {
      const err = new Error("Gupshup API timed out.");
      err.statusCode = 504;
      throw err;
    }
    const err = new Error(error.message || "Gupshup send failed");
    err.statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendGupshupWhatsAppSessionText(_creds, { to, body }) {
  const sendTo = assertGupshupRecipient(to);
  return gatewaySendMessage({
    sendTo,
    msg: body,
    isTemplate: false,
    credentialMode: "reply",
  });
}

async function sendGupshupWhatsAppMessage(_creds, { to, body, templateId, footer }) {
  const sendTo = assertGupshupRecipient(to);
  const text = String(body || "").trim();
  const useTemplate = isTemplateSend(templateId);

  if (!text) {
    const err = new Error(
      "WhatsApp step needs message body text for Gupshup Gateway (merge fields applied in outreach plan)."
    );
    err.statusCode = 400;
    throw err;
  }

  return gatewaySendMessage({
    sendTo,
    msg: text,
    isTemplate: useTemplate,
    credentialMode: "template",
    footer: footer || undefined,
  });
}

module.exports = {
  sendGupshupWhatsAppMessage,
  sendGupshupWhatsAppSessionText,
  gatewaySendMessage,
};
