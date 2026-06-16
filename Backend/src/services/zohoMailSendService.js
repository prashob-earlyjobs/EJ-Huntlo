const {
  getZohoMailIntegration,
  pickPrimaryZohoAccount,
  zohoMailApiFetch,
} = require("./zohoMailClient");
const { sendZohoSmtpMessage } = require("./zohoMailSmtpService");
const { bodyToHtml, bodyToPlainText } = require("./gmailSendService");

async function sendZohoApiMessage(
  integrationDoc,
  { to, subject, body, inReplyTo, references, threadId }
) {
  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const mailBody = String(body || "").trim();
  const fromEmail = String(integrationDoc.email || "").trim();

  if (!recipient.includes("@")) {
    const err = new Error("A valid recipient email is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!mailSubject || !mailBody) {
    const err = new Error("Subject and message body are required.");
    err.statusCode = 400;
    throw err;
  }

  let accountId = String(integrationDoc.zohoAccountId || "").trim();
  if (!accountId) {
    const account = await pickPrimaryZohoAccount(integrationDoc);
    accountId = String(account.accountId || account.accountid || "").trim();
    if (!accountId) {
      throw new Error("Could not resolve Zoho Mail account id.");
    }
    integrationDoc.zohoAccountId = accountId;
    if (!fromEmail) {
      integrationDoc.email =
        account.primaryEmailAddress || account.emailAddress || integrationDoc.email;
    }
    await integrationDoc.save();
  }

  const html = bodyToHtml(mailBody);
  const text = bodyToPlainText(mailBody);
  const replyToId = String(threadId || "")
    .trim()
    .replace(/^zoho:/, "");
  const path =
    inReplyTo && replyToId
      ? `/accounts/${accountId}/messages/${encodeURIComponent(replyToId)}`
      : `/accounts/${accountId}/messages`;

  const payload = {
    fromAddress: fromEmail,
    toAddress: recipient,
    subject: mailSubject,
    content: html || text,
    mailFormat: html ? "html" : "plaintext",
    ...(inReplyTo ? { inReplyTo: String(inReplyTo).trim() } : {}),
    ...(references ? { references: String(references).trim() } : {}),
  };

  const data = await zohoMailApiFetch(integrationDoc, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const messageId =
    data?.data?.messageId ||
    data?.data?.messageid ||
    data?.messageId ||
    data?.messageid ||
    "";

  return {
    messageId: String(messageId),
    threadId: String(messageId),
    fromEmail: fromEmail || integrationDoc.email || "",
    to: recipient,
  };
}

async function sendZohoMailMessage(userId, payload, options = {}) {
  const integration =
    options.integration || (await getZohoMailIntegration(userId, options.integrationId));
  if (integration.zohoAuthMode === "smtp") {
    return sendZohoSmtpMessage(integration, payload);
  }
  return sendZohoApiMessage(integration, payload);
}

module.exports = {
  sendZohoMailMessage,
};
