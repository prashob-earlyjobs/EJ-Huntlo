const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");
const { GRAPH_API_BASE } = require("./outlookMailConfig");
const { refreshAccessToken } = require("./outlookMailOAuth");

function tokenExpiryFromExpiresIn(expiresIn) {
  const sec = Number(expiresIn);
  return Number.isFinite(sec) && sec > 0 ? new Date(Date.now() + sec * 1000) : null;
}

async function getOutlookIntegration(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({ userId: userOid, provider: "outlook" });
  if (!doc?.accessToken) {
    const err = new Error("Outlook is not connected. Connect Outlook under Integrations first.");
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

  if (doc.accessToken && !doc.tokenExpiry) {
    return doc.accessToken;
  }

  if (!doc.refreshToken) {
    const err = new Error("Outlook session expired. Reconnect Outlook under Integrations.");
    err.statusCode = 401;
    throw err;
  }

  const tokens = await refreshAccessToken(doc.refreshToken, doc.outlookTenantId || "common");
  if (!tokens.access_token) {
    const err = new Error("Could not refresh Outlook access. Reconnect under Integrations.");
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

async function outlookGraphFetch(integrationDoc, path, options = {}) {
  const accessToken = await getValidAccessToken(integrationDoc);
  const url = path.startsWith("http") ? path : `${GRAPH_API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) {
    return {};
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : "Microsoft Graph API request failed";
    const err = new Error(msg);
    err.statusCode = res.status === 401 ? 401 : 502;
    err.microsoftError = data;
    throw err;
  }
  return data;
}

module.exports = {
  getOutlookIntegration,
  getValidAccessToken,
  outlookGraphFetch,
};
