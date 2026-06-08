const UserIntegration = require("../models/UserIntegration");
const mongoose = require("mongoose");
const { getMetaCredentialsForUser, resolveWhatsappProvider } = require("./integrationService");
const { sendMetaWhatsAppMessage, sendMetaWhatsAppSessionText } = require("./metaWhatsAppSendService");
const {
  sendGupshupWhatsAppMessage,
  sendGupshupWhatsAppSessionText,
} = require("./gupshupWhatsAppSendService");
const { isGupshupWhatsAppConfigured } = require("./gupshupWhatsAppConfig");
const { getActiveMessagingChannel } = require("./platformSettingsService");

async function resolvePlatformChannel() {
  return getActiveMessagingChannel();
}

/**
 * Ensure user has a connected WhatsApp integration for the active platform channel.
 */
async function assertWhatsAppReadyForSend(userId) {
  const platformChannel = await resolvePlatformChannel();
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

  if (platformChannel === "gupshup") {
    if (!isGupshupWhatsAppConfigured()) {
      const err = new Error(
        "Gupshup WhatsApp is not configured on this server. Contact your administrator."
      );
      err.statusCode = 503;
      throw err;
    }
    const waProvider = resolveWhatsappProvider(doc, "gupshup");
    if (waProvider !== "gupshup") {
      const err = new Error(
        "WhatsApp is not connected for Gupshup. Reconnect under Integrations."
      );
      err.statusCode = 400;
      throw err;
    }
    return { provider: "gupshup" };
  }

  const waProvider = resolveWhatsappProvider(doc, "huntlo_meta");
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

async function sendWhatsAppMessage(userId, { to, body, templateId, contact, senderFirstName, campaign }) {
  const platformChannel = await resolvePlatformChannel();

  if (platformChannel === "gupshup") {
    await assertWhatsAppReadyForSend(userId);
    return sendGupshupWhatsAppMessage(null, {
      to,
      body,
      templateId,
      contact,
      senderFirstName,
      campaign,
    });
  }

  const creds = await getMetaCredentialsForUser(userId);
  return sendMetaWhatsAppMessage(creds, {
    to,
    body,
    templateId,
    contact,
    senderFirstName,
    campaign,
  });
}

/** Free-form reply within WhatsApp customer care window (after candidate message). */
async function sendWhatsAppSessionMessage(userId, { to, body }) {
  const platformChannel = await resolvePlatformChannel();

  if (platformChannel === "gupshup") {
    await assertWhatsAppReadyForSend(userId);
    return sendGupshupWhatsAppSessionText(null, { to, body });
  }

  await assertWhatsAppReadyForSend(userId);
  const creds = await getMetaCredentialsForUser(userId);
  return sendMetaWhatsAppSessionText(creds, { to, body });
}

module.exports = {
  assertWhatsAppReadyForSend,
  sendWhatsAppMessage,
  sendWhatsAppSessionMessage,
  resolvePlatformChannel,
};
