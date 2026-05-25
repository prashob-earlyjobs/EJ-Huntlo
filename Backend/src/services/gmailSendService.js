const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");
const { refreshAccessToken } = require("./googleGmailOAuth");

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function tokenExpiryFromExpiresIn(expiresIn) {
  const sec = Number(expiresIn);
  return Number.isFinite(sec) && sec > 0 ? new Date(Date.now() + sec * 1000) : null;
}

function encodeMimeMessage({ to, subject, body, fromEmail }) {
  const lines = [
    `To: ${to}`,
    fromEmail ? `From: ${fromEmail}` : null,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br/>")}</p>`,
  ].filter(Boolean);
  const raw = lines.join("\r\n");
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGmailIntegration(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({ userId: userOid, provider: "gmail" });
  if (!doc?.accessToken) {
    const err = new Error("Gmail is not connected. Connect Gmail under Integrations first.");
    err.statusCode = 400;
    throw err;
  }
  return doc;
}

async function getValidAccessToken(doc) {
  const stillValid =
    doc.tokenExpiry && new Date(doc.tokenExpiry).getTime() > Date.now() + 60_000;
  if (stillValid) return doc.accessToken;

  if (!doc.refreshToken) {
    const err = new Error("Gmail session expired. Reconnect Gmail under Integrations.");
    err.statusCode = 401;
    throw err;
  }

  const tokens = await refreshAccessToken(doc.refreshToken);
  if (!tokens.access_token) {
    const err = new Error("Could not refresh Gmail access. Reconnect Gmail under Integrations.");
    err.statusCode = 401;
    throw err;
  }

  doc.accessToken = tokens.access_token;
  if (typeof tokens.refresh_token === "string" && tokens.refresh_token) {
    doc.refreshToken = tokens.refresh_token;
  }
  doc.tokenExpiry = tokenExpiryFromExpiresIn(tokens.expires_in);
  await doc.save();
  return doc.accessToken;
}

async function sendGmailMessage(userId, { to, subject, body }) {
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
  const raw = encodeMimeMessage({
    to: recipient,
    subject: mailSubject,
    body: mailBody,
    fromEmail: integration.email || undefined,
  });

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
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

module.exports = { sendGmailMessage };
