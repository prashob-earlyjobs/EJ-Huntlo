const {
  resolveWhatsappProvider,
  getGupshupCredentialsForUser,
  getMetaCredentialsForUser,
} = require("./integrationService");
const { sendGupshupWhatsAppMessage } = require("./gupshupSendService");
const { sendMetaWhatsAppMessage } = require("./metaWhatsAppSendService");
const UserIntegration = require("../models/UserIntegration");
const mongoose = require("mongoose");

/**
 * Ensure user has a connected WhatsApp integration with send credentials.
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
  if (waProvider === "meta") {
    await getMetaCredentialsForUser(userId);
    return { provider: "meta" };
  }
  if (waProvider === "gupshup") {
    await getGupshupCredentialsForUser(userId);
    return { provider: "gupshup" };
  }

  const err = new Error("WhatsApp integration is incomplete. Reconnect under Integrations.");
  err.statusCode = 400;
  throw err;
}

/**
 * Send one WhatsApp message using the user's connected provider (Gupshup or Meta).
 */
async function sendWhatsAppMessage(userId, { to, body, templateId }) {
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

  if (waProvider === "meta") {
    const creds = await getMetaCredentialsForUser(userId);
    return sendMetaWhatsAppMessage(creds, { to, body, templateId });
  }

  if (waProvider === "gupshup") {
    const creds = await getGupshupCredentialsForUser(userId);
    return sendGupshupWhatsAppMessage(creds, { to, body, templateId });
  }

  const err = new Error("WhatsApp integration is incomplete. Reconnect under Integrations.");
  err.statusCode = 400;
  throw err;
}

module.exports = {
  assertWhatsAppReadyForSend,
  sendWhatsAppMessage,
};
