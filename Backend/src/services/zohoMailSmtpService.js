const nodemailer = require("nodemailer");
const { getZohoDcConfig, normalizeDataCenter } = require("./zohoMailConfig");
const {
  bodyToHtml,
  bodyToPlainText,
} = require("./gmailSendService");

function createSmtpTransport({ email, appPassword, dataCenter }) {
  const dc = getZohoDcConfig(dataCenter);
  return nodemailer.createTransport({
    host: dc.smtpHost,
    port: 587,
    secure: false,
    auth: {
      user: email,
      pass: appPassword,
    },
    requireTLS: true,
  });
}

async function verifyZohoSmtpCredentials({ email, appPassword, dataCenter }) {
  const address = String(email || "").trim();
  const password = String(appPassword || "").trim();
  if (!address.includes("@")) {
    const err = new Error("A valid Zoho Mail address is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!password) {
    const err = new Error("App-specific password is required.");
    err.statusCode = 400;
    throw err;
  }

  const transport = createSmtpTransport({
    email: address,
    appPassword: password,
    dataCenter: normalizeDataCenter(dataCenter),
  });

  try {
    await transport.verify();
  } catch (error) {
    const err = new Error(
      error instanceof Error
        ? error.message
        : "Could not verify Zoho SMTP credentials. Check email, app password, and data center."
    );
    err.statusCode = 400;
    throw err;
  } finally {
    transport.close();
  }

  return {
    verified: true,
    message: `SMTP credentials verified for ${address}.`,
  };
}

async function sendZohoSmtpMessage(
  integrationDoc,
  { to, subject, body, inReplyTo, references }
) {
  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const mailBody = String(body || "").trim();
  const fromEmail = String(integrationDoc.email || "").trim();
  const appPassword = String(integrationDoc.refreshToken || "").trim();

  if (!recipient.includes("@")) {
    const err = new Error("A valid recipient email is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!mailSubject) {
    const err = new Error("Subject is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!mailBody) {
    const err = new Error("Message body is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!fromEmail || !appPassword) {
    const err = new Error("Zoho Mail SMTP credentials are incomplete. Reconnect under Integrations.");
    err.statusCode = 400;
    throw err;
  }

  const transport = createSmtpTransport({
    email: fromEmail,
    appPassword,
    dataCenter: integrationDoc.zohoDataCenter || "com",
  });

  const text = bodyToPlainText(mailBody);
  const html = bodyToHtml(mailBody);
  const fromName = String(integrationDoc.senderName || "").trim();
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  const headers = {};
  if (inReplyTo) headers["In-Reply-To"] = String(inReplyTo).trim();
  if (references) headers.References = String(references).trim();

  try {
    const info = await transport.sendMail({
      from,
      to: recipient,
      subject: mailSubject,
      text: text || undefined,
      html: html || text || " ",
      headers: Object.keys(headers).length ? headers : undefined,
    });
    const messageId = String(info.messageId || `smtp-${Date.now()}`).trim();
    return {
      messageId,
      threadId: messageId,
      fromEmail,
      to: recipient,
      rfcMessageId: messageId,
    };
  } finally {
    transport.close();
  }
}

module.exports = {
  verifyZohoSmtpCredentials,
  sendZohoSmtpMessage,
};
