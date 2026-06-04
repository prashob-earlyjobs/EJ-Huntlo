const UserIntegration = require("../models/UserIntegration");
const mongoose = require("mongoose");
const { getMetaCredentialsForUser, resolveWhatsappProvider } = require("./integrationService");
const { sendMetaWhatsAppMessage, sendMetaWhatsAppSessionText } = require("./metaWhatsAppSendService");

/**
 * Ensure user has a connected Meta WhatsApp integration.
 */
async function assertWhatsAppReadyForSend(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "whatsapp",
  }).lean();

  if (!doc) {
    const err = new Error("WhatsApp is not connected. Connect WhatsApp under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  const waProvider = resolveWhatsappProvider(doc);
  if (waProvider !== "meta") {
    const err = new Error(
      "WhatsApp is not connected with Meta API. Reconnect under Integrations using Meta WhatsApp Cloud API."
    );
    err.statusCode = 400;
    throw err;
  }

  await getMetaCredentialsForUser(userId);
  return { provider: "meta" };
}

/**
 * Send one WhatsApp message via Meta Cloud API.
 */
async function sendWhatsAppMessage(userId, { to, body, templateId, contact, senderFirstName }) {
  const creds = await getMetaCredentialsForUser(userId);
  return sendMetaWhatsAppMessage(creds, {
    to,
    body,
    templateId,
    contact,
    senderFirstName,
  });
}

/** Free-form reply within Meta's 24-hour session window (after candidate message). */
async function sendWhatsAppSessionMessage(userId, { to, body }) {
  await assertWhatsAppReadyForSend(userId);
  const creds = await getMetaCredentialsForUser(userId);
  return sendMetaWhatsAppSessionText(creds, { to, body });
}

module.exports = {
  assertWhatsAppReadyForSend,
  sendWhatsAppMessage,
  sendWhatsAppSessionMessage,
};
