const { sendGmailMessage } = require("./gmailSendService");
const { sendOutlookMessage } = require("./outlookMailSendService");
const { sendZohoMailMessage } = require("./zohoMailSendService");
const { sendCustomMailMessage } = require("./customMailSendService");
const { resolveEmailIntegration } = require("./emailIntegrationService");

async function sendCampaignEmail(userId, payload, options = {}) {
  const integration = options.integration || (await resolveEmailIntegration(userId, options.integrationId));
  const provider = integration.provider;
  const sendOptions = { integration, integrationId: String(integration._id) };

  if (provider === "outlook") {
    return sendOutlookMessage(userId, payload, sendOptions);
  }
  if (provider === "zoho_mail") {
    return sendZohoMailMessage(userId, payload, sendOptions);
  }
  if (provider === "custom_mail") {
    return sendCustomMailMessage(userId, payload, sendOptions);
  }
  if (provider === "gmail") {
    return sendGmailMessage(userId, payload, sendOptions);
  }

  const err = new Error("Unknown email provider.");
  err.statusCode = 400;
  throw err;
}

async function resolveEmailProviderForSend(userId, integrationId) {
  const integration = await resolveEmailIntegration(userId, integrationId);
  return integration.provider;
}

module.exports = {
  resolveEmailProviderForSend,
  sendCampaignEmail,
};
