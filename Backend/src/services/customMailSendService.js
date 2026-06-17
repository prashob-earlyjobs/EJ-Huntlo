const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");
const { sendCustomSmtpMessage } = require("./customMailSmtpService");

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function isCustomMailConnected(doc) {
  if (!doc) return false;
  return Boolean(
    doc.email &&
      doc.smtpHost &&
      doc.refreshToken &&
      (doc.accessToken || doc.email)
  );
}

async function getCustomMailIntegration(userId, integrationId) {
  let doc = null;

  if (integrationId && mongoose.Types.ObjectId.isValid(String(integrationId))) {
    doc = await UserIntegration.findOne({
      _id: integrationId,
      userId: userOid(userId),
      provider: "custom_mail",
    });
  } else {
    doc = await UserIntegration.findOne({
      userId: userOid(userId),
      provider: "custom_mail",
      isDefaultEmail: true,
    });
    if (!doc) {
      doc = await UserIntegration.findOne({
        userId: userOid(userId),
        provider: "custom_mail",
      });
    }
  }

  if (!isCustomMailConnected(doc)) {
    const err = new Error(
      "Custom mail is not connected. Connect your SMTP settings under Integrations first."
    );
    err.statusCode = 400;
    throw err;
  }
  return doc;
}

async function sendCustomMailMessage(userId, payload, options = {}) {
  const integration =
    options.integration || (await getCustomMailIntegration(userId, options.integrationId));
  return sendCustomSmtpMessage(integration, payload);
}

module.exports = {
  isCustomMailConnected,
  getCustomMailIntegration,
  sendCustomMailMessage,
};
