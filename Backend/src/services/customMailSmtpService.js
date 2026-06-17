const nodemailer = require("nodemailer");
const { bodyToHtml, bodyToPlainText } = require("./gmailSendService");

function normalizeSmtpSecurity(raw) {
  const value = String(raw || "tls").trim().toLowerCase();
  if (value === "ssl" || value === "none" || value === "tls") return value;
  return "tls";
}

function parseSmtpPort(raw, security) {
  const portNum = Number(raw);
  if (Number.isFinite(portNum) && portNum >= 1 && portNum <= 65535) {
    return Math.floor(portNum);
  }
  return security === "ssl" ? 465 : 587;
}

function smtpConfigFromBody(body) {
  const fromEmail = String(body?.fromEmail || body?.email || "").trim();
  const smtpHost = String(body?.smtpHost || body?.host || "").trim();
  const security = normalizeSmtpSecurity(body?.security || body?.smtpSecurity);
  const smtpPort = parseSmtpPort(body?.smtpPort || body?.port, security);
  const username = String(body?.username || fromEmail).trim();
  const password = String(body?.password || body?.smtpPassword || "").trim();
  const senderName = String(body?.displayName || body?.senderName || "").trim();

  return {
    fromEmail,
    smtpHost,
    smtpPort,
    security,
    username,
    password,
    senderName,
  };
}

function smtpConfigFromIntegrationDoc(doc) {
  const fromEmail = String(doc?.email || "").trim();
  const smtpHost = String(doc?.smtpHost || "").trim();
  const security = normalizeSmtpSecurity(doc?.smtpSecurity);
  const smtpPort = parseSmtpPort(doc?.smtpPort, security);
  const username = String(doc?.accessToken || fromEmail).trim();
  const password = String(doc?.refreshToken || "").trim();
  const senderName = String(doc?.senderName || "").trim();

  return {
    fromEmail,
    smtpHost,
    smtpPort,
    security,
    username,
    password,
    senderName,
  };
}

function assertSmtpConfig(config) {
  if (!config.fromEmail.includes("@")) {
    const err = new Error("A valid from email address is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!config.smtpHost) {
    const err = new Error("SMTP host is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!config.username) {
    const err = new Error("SMTP username is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!config.password) {
    const err = new Error("SMTP password is required.");
    err.statusCode = 400;
    throw err;
  }
}

function createSmtpTransport(config) {
  const security = normalizeSmtpSecurity(config.security);
  const port = parseSmtpPort(config.smtpPort, security);
  const secure = security === "ssl";

  return nodemailer.createTransport({
    host: config.smtpHost,
    port,
    secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    ...(security === "tls"
      ? { requireTLS: true }
      : security === "none"
        ? { tls: { rejectUnauthorized: false } }
        : {}),
  });
}

async function verifyCustomMailSmtpCredentials(body) {
  const config = smtpConfigFromBody(body);
  assertSmtpConfig(config);

  const transport = createSmtpTransport(config);
  try {
    await transport.verify();
  } catch (error) {
    const err = new Error(
      error instanceof Error
        ? error.message
        : "Could not verify SMTP credentials. Check host, port, username, and password."
    );
    err.statusCode = 400;
    throw err;
  } finally {
    transport.close();
  }

  return {
    verified: true,
    message: `SMTP connection to ${config.smtpHost}:${config.smtpPort} verified.`,
  };
}

async function sendCustomSmtpMessage(
  integrationDoc,
  { to, subject, body, inReplyTo, references }
) {
  const config = smtpConfigFromIntegrationDoc(integrationDoc);
  assertSmtpConfig(config);

  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const mailBody = String(body || "").trim();

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

  const transport = createSmtpTransport(config);
  const text = bodyToPlainText(mailBody);
  const html = bodyToHtml(mailBody);
  const fromName = config.senderName;
  const from = fromName ? `"${fromName}" <${config.fromEmail}>` : config.fromEmail;

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
      fromEmail: config.fromEmail,
      to: recipient,
      rfcMessageId: messageId,
    };
  } finally {
    transport.close();
  }
}

module.exports = {
  normalizeSmtpSecurity,
  parseSmtpPort,
  smtpConfigFromBody,
  smtpConfigFromIntegrationDoc,
  verifyCustomMailSmtpCredentials,
  sendCustomSmtpMessage,
};
