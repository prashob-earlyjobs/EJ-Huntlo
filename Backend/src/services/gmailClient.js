const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");
const { refreshAccessToken } = require("./googleGmailOAuth");

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

function tokenExpiryFromExpiresIn(expiresIn) {
  const sec = Number(expiresIn);
  return Number.isFinite(sec) && sec > 0 ? new Date(Date.now() + sec * 1000) : null;
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

async function getValidAccessToken(integrationDoc) {
  const doc = integrationDoc;
  const stillValid =
    doc.tokenExpiry && new Date(doc.tokenExpiry).getTime() > Date.now() + 60_000;
  if (stillValid) return doc.accessToken;

  if (!doc.refreshToken) {
    const err = new Error(
      "Gmail session expired. Reconnect Gmail under Integrations (read access required)."
    );
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

async function gmailApiFetch(userId, path, query = {}) {
  const integration = await getGmailIntegration(userId);
  const accessToken = await getValidAccessToken(integration);
  const qs = new URLSearchParams(query);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const url = `${GMAIL_API}${path}${suffix}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : "Gmail API request failed";
    const err = new Error(msg);
    err.statusCode = res.status === 401 ? 401 : 502;
    err.gmailError = data.error;
    throw err;
  }
  return { data, integration };
}

module.exports = {
  GMAIL_API,
  GMAIL_SCOPES,
  getGmailIntegration,
  getValidAccessToken,
  gmailApiFetch,
};
