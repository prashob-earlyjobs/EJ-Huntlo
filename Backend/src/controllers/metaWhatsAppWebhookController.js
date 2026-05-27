const { processMetaWebhookPayload } = require("../services/metaWhatsAppWebhookService");

function getWebhookVerifyToken() {
  return String(
    process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ""
  ).trim();
}

async function verifyMetaWebhookHandler(req, res) {
  const mode = String(req.query["hub.mode"] || "").trim();
  const token = String(req.query["hub.verify_token"] || "").trim();
  const challenge = req.query["hub.challenge"];
  const expected = getWebhookVerifyToken();

  if (mode !== "subscribe" || !expected || token !== expected) {
    return res.status(403).send("forbidden");
  }

  return res.status(200).send(String(challenge || ""));
}

async function receiveMetaWebhookHandler(req, res) {
  try {
    await processMetaWebhookPayload(req.body || {});
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[meta-webhook]", error?.message || error);
    return res.status(200).json({ success: false });
  }
}

module.exports = {
  verifyMetaWebhookHandler,
  receiveMetaWebhookHandler,
};

