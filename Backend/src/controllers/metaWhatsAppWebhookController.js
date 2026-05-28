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

function summarizeWebhookBody(body) {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  let messageCount = 0;
  let statusCount = 0;
  const phoneNumberIds = new Set();

  for (const entry of entries) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value || {};
      const phoneId = String(value?.metadata?.phone_number_id || "").trim();
      if (phoneId) phoneNumberIds.add(phoneId);
      messageCount += Array.isArray(value?.messages) ? value.messages.length : 0;
      statusCount += Array.isArray(value?.statuses) ? value.statuses.length : 0;
    }
  }

  return {
    object: String(body?.object || ""),
    entryCount: entries.length,
    messageCount,
    statusCount,
    phoneNumberIds: [...phoneNumberIds],
  };
}

async function receiveMetaWebhookHandler(req, res) {
  const summary = summarizeWebhookBody(req.body || {});
  console.log("[meta-webhook] POST received", summary);

  try {
    const result = await processMetaWebhookPayload(req.body || {});
    console.log("[meta-webhook] POST processed", { ...summary, ...result });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[meta-webhook] POST failed", summary, error?.message || error);
    return res.status(200).json({ success: false });
  }
}

module.exports = {
  verifyMetaWebhookHandler,
  receiveMetaWebhookHandler,
};

