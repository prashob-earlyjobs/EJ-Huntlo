const WEBHOOK_PATH = "/api/integrations/whatsapp/meta/webhook";

const DEFAULT_SUBSCRIBE_FIELDS = ["messages"];

function getWebhookVerifyToken() {
  return String(
    process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ""
  ).trim();
}

/**
 * Public API origin for webhook callback URLs (no trailing slash).
 * Prefer PUBLIC_API_BASE_URL in production behind proxies.
 */
function getPublicApiBaseUrl(req) {
  const envBase = String(
    process.env.PUBLIC_API_BASE_URL || process.env.API_PUBLIC_BASE_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (envBase) return envBase;

  if (req) {
    const proto = String(req.get("x-forwarded-proto") || req.protocol || "https")
      .split(",")[0]
      .trim();
    const host = String(req.get("x-forwarded-host") || req.get("host") || "")
      .split(",")[0]
      .trim();
    if (host) return `${proto}://${host}`;
  }

  return "";
}

function buildMetaWebhookCallbackUrl(apiBaseUrl) {
  const base = String(apiBaseUrl || "")
    .trim()
    .replace(/\/$/, "");
  if (!base) return "";
  return `${base}${WEBHOOK_PATH}`;
}

/**
 * Values shown to recruiters configuring their own Meta app webhook.
 */
function getMetaWebhookSetupForClient(apiBaseUrl) {
  const verifyToken = getWebhookVerifyToken();
  const callbackUrl = buildMetaWebhookCallbackUrl(apiBaseUrl);

  return {
    callbackUrl,
    callbackPath: WEBHOOK_PATH,
    verifyTokenConfigured: Boolean(verifyToken),
    verifyToken: verifyToken || "",
    subscribeFields: DEFAULT_SUBSCRIBE_FIELDS,
    instructions:
      "In Meta for Developers → your app → WhatsApp → Configuration, set the callback URL and verify token below, then subscribe to the messages field.",
  };
}

module.exports = {
  WEBHOOK_PATH,
  getWebhookVerifyToken,
  getPublicApiBaseUrl,
  buildMetaWebhookCallbackUrl,
  getMetaWebhookSetupForClient,
};
