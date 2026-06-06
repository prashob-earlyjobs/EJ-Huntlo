/** Gupshup Gateway API (userid / password) — EarlyJobs Portal style. */

const GUPSHUP_GATEWAY_BASE_URL =
  "https://mediaapi.smsgupshup.com/GatewayAPI/rest";
const GUPSHUP_GATEWAY_METHOD = "SENDMESSAGE";

function readPair(useridKey, passwordKey, fallbackUseridKey, fallbackPasswordKey) {
  const userid = String(process.env[useridKey] || process.env[fallbackUseridKey] || "").trim();
  const password = String(
    process.env[passwordKey] || process.env[fallbackPasswordKey] || ""
  ).trim();
  if (!userid || !password) return null;
  return { userid, password };
}

/** Reply / session messages (chat, AI, manual reply). */
function getGupshupReplyCredentials() {
  return readPair(
    "GUPSHUP_REPLY_USER_ID",
    "GUPSHUP_REPLY_PASSWORD",
    "GUPSHUP_USERID",
    "GUPSHUP_PASSWORD"
  );
}

/** Template / campaign outbound messages. */
function getGupshupTemplateCredentials() {
  return readPair(
    "GUPSHUP_TEMPLATE_USER_ID",
    "GUPSHUP_TEMPLATE_PASSWORD",
    "GUPSHUP_USERID",
    "GUPSHUP_PASSWORD"
  );
}

function getGupshupWhatsAppCredentials(mode = "template") {
  const creds =
    mode === "reply" ? getGupshupReplyCredentials() : getGupshupTemplateCredentials();
  if (!creds) return null;
  return {
    ...creds,
    gatewayBaseUrl: GUPSHUP_GATEWAY_BASE_URL,
    method: GUPSHUP_GATEWAY_METHOD,
  };
}

function isGupshupWhatsAppConfigured() {
  return Boolean(getGupshupReplyCredentials() || getGupshupTemplateCredentials());
}

function getGupshupGatewayBaseUrl() {
  return GUPSHUP_GATEWAY_BASE_URL;
}

function getGupshupApiBaseUrl() {
  return GUPSHUP_GATEWAY_BASE_URL;
}

module.exports = {
  GUPSHUP_GATEWAY_BASE_URL,
  GUPSHUP_GATEWAY_METHOD,
  getGupshupReplyCredentials,
  getGupshupTemplateCredentials,
  getGupshupWhatsAppCredentials,
  isGupshupWhatsAppConfigured,
  getGupshupGatewayBaseUrl,
  getGupshupApiBaseUrl,
};
