const MailComposer = require("nodemailer/lib/mail-composer");
const { getGmailIntegration, getValidAccessToken } = require("./gmailClient");

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeHtml(body) {
  return /<[a-z][\s\S]*>/i.test(String(body || ""));
}

function bodyToPlainText(body) {
  const raw = String(body || "").trim();
  if (!raw) return "";
  if (looksLikeHtml(raw)) {
    return raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return raw;
}

function bodyToHtml(body) {
  const raw = String(body || "").trim();
  if (!raw) return "";
  if (looksLikeHtml(raw)) return raw;
  return `<div>${escapeHtml(raw).replace(/\r\n/g, "\n").replace(/\n/g, "<br/>")}</div>`;
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Build RFC 2822 MIME via nodemailer (Gmail API requires valid MIME).
 */
async function buildRawMimeMessage({
  to,
  subject,
  body,
  fromEmail,
  inReplyTo,
  references,
}) {
  const text = bodyToPlainText(body);
  const html = bodyToHtml(body);

  const headers = {};
  if (inReplyTo) {
    headers["In-Reply-To"] = inReplyTo;
    headers.References = references || inReplyTo;
  }

  const mail = new MailComposer({
    from: fromEmail,
    to,
    subject,
    text: text || undefined,
    html: html || text || " ",
    headers: Object.keys(headers).length ? headers : undefined,
  });

  const mimeBuffer = await mail.compile().build();
  return toBase64Url(mimeBuffer);
}

function buildReplySubject(subject) {
  const s = String(subject || "").trim();
  if (!s) return "Re: Your message";
  if (/^re:\s*/i.test(s)) return s;
  return `Re: ${s}`;
}

async function sendGmailMessage(userId, { to, subject, body, threadId, inReplyTo, references }) {
  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const mailBody = String(body || "").trim();

  if (!recipient || !recipient.includes("@")) {
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

  const integration = await getGmailIntegration(userId);
  const accessToken = await getValidAccessToken(integration);

  const raw = await buildRawMimeMessage({
    to: recipient,
    subject: mailSubject,
    body: mailBody,
    fromEmail: integration.email || undefined,
    inReplyTo: inReplyTo ? String(inReplyTo).trim() : undefined,
    references: references ? String(references).trim() : undefined,
  });

  const sendPayload = { raw };
  const tid = String(threadId || "").trim();
  if (tid) sendPayload.threadId = tid;

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendPayload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : "Failed to send email via Gmail";
    const err = new Error(msg);
    err.statusCode = res.status === 401 ? 401 : 502;
    throw err;
  }

  return {
    messageId: data.id || "",
    threadId: data.threadId || "",
    fromEmail: integration.email || "",
    to: recipient,
  };
}

module.exports = {
  sendGmailMessage,
  buildReplySubject,
  buildRawMimeMessage,
  bodyToHtml,
  bodyToPlainText,
};
