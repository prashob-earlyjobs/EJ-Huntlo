const { getPublicApiBaseUrl } = require("./metaWebhookSetup");

const PATHS = {
  incoming: "/api/integrations/whatsapp/gupshup/webhook/incoming",
  deliveryReport: "/api/integrations/whatsapp/gupshup/webhook/delivery-report",
  status: "/api/integrations/whatsapp/gupshup/webhook/status",
  unified: "/api/integrations/whatsapp/gupshup/webhook",
};

function buildUrl(apiBaseUrl, path) {
  const base = String(apiBaseUrl || "")
    .trim()
    .replace(/\/$/, "");
  if (!base) return "";
  return `${base}${path}`;
}

function getGupshupWebhookSetupForClient(apiBaseUrl) {
  return {
    incomingCallbackUrl: buildUrl(apiBaseUrl, PATHS.incoming),
    deliveryReportCallbackUrl: buildUrl(apiBaseUrl, PATHS.deliveryReport),
    statusCallbackUrl: buildUrl(apiBaseUrl, PATHS.status),
    callbackUrl: buildUrl(apiBaseUrl, PATHS.unified),
    paths: PATHS,
    instructions:
      "Configure in Gupshup (EarlyJobs Portal style): incoming → incoming URL; delivery reports → delivery-report URL (GET or POST). Optional status URL for simple messageId updates.",
  };
}

module.exports = {
  GUPSHUP_WEBHOOK_PATHS: PATHS,
  buildUrl,
  getGupshupWebhookSetupForClient,
  getPublicApiBaseUrl,
};
