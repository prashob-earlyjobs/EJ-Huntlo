const { sendGmailMessage } = require("./gmailSendService");
const { sendOutlookMessage } = require("./outlookMailSendService");
const { sendZohoMailMessage } = require("./zohoMailSendService");
const { resolveEmailProviderForUser } = require("./emailIntegrationService");

async function sendCampaignEmail(userId, payload) {
  const provider = await resolveEmailProviderForUser(userId);
  if (!provider) {
    const err = new Error(
      "No email integration connected. Connect Gmail, Outlook, or Zoho Mail under Integrations first."
    );
    err.statusCode = 400;
    throw err;
  }
  if (provider === "outlook") {
    return sendOutlookMessage(userId, payload);
  }
  if (provider === "zoho_mail") {
    return sendZohoMailMessage(userId, payload);
  }
  return sendGmailMessage(userId, payload);
}

module.exports = {
  resolveEmailProviderForSend: resolveEmailProviderForUser,
  sendCampaignEmail,
};
