/** Meta WhatsApp Cloud API (Graph) — server defaults. */

function getMetaGraphApiVersion() {
  const raw = String(process.env.META_GRAPH_API_VERSION || "v21.0").trim();
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function getMetaGraphBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}

/**
 * Huntlo-managed WhatsApp (Meta Cloud API credentials on the server only).
 */

function getHuntloWhatsAppCredentials() {
  const phoneNumberId = String(process.env.HUNTLO_WHATSAPP_PHONE_NUMBER_ID || "")
    .trim()
    .replace(/\s/g, "");
  const accessToken = String(process.env.HUNTLO_WHATSAPP_ACCESS_TOKEN || "").trim();
  const wabaId = String(process.env.HUNTLO_WHATSAPP_WABA_ID || "")
    .trim()
    .replace(/\s/g, "");
  if (!phoneNumberId || !accessToken) {
    return null;
  }
  return { phoneNumberId, accessToken, wabaId };
}

function isHuntloWhatsAppConfigured() {
  return Boolean(getHuntloWhatsAppCredentials());
}

module.exports = {
  getMetaGraphApiVersion,
  getMetaGraphBaseUrl,
  getHuntloWhatsAppCredentials,
  isHuntloWhatsAppConfigured,
};
