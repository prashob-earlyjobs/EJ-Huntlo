const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");
const { getZohoDcConfig, normalizeDataCenter } = require("./zohoMailConfig");
const { refreshAccessToken } = require("./zohoMailOAuth");

function tokenExpiryFromExpiresIn(expiresIn) {
  const sec = Number(expiresIn);
  return Number.isFinite(sec) && sec > 0 ? new Date(Date.now() + sec * 1000) : null;
}

async function getZohoMailIntegration(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({ userId: userOid, provider: "zoho_mail" });
  if (!doc) {
    const err = new Error("Zoho Mail is not connected. Connect Zoho Mail under Integrations first.");
    err.statusCode = 400;
    throw err;
  }
  if (doc.zohoAuthMode === "smtp") {
    if (!doc.refreshToken || !doc.email) {
      const err = new Error("Zoho Mail SMTP credentials are incomplete. Reconnect under Integrations.");
      err.statusCode = 400;
      throw err;
    }
    return doc;
  }
  if (!doc.accessToken) {
    const err = new Error("Zoho Mail is not connected. Connect Zoho Mail under Integrations first.");
    err.statusCode = 400;
    throw err;
  }
  return doc;
}

async function getValidAccessToken(integrationDoc) {
  const doc = integrationDoc;
  if (doc.zohoAuthMode === "smtp") {
    const err = new Error("Zoho Mail is connected via SMTP, not OAuth.");
    err.statusCode = 400;
    throw err;
  }

  const stillValid =
    doc.tokenExpiry && new Date(doc.tokenExpiry).getTime() > Date.now() + 60_000;
  if (stillValid) return doc.accessToken;

  // Fresh OAuth connect may omit expires_in; use the token we just received.
  if (doc.accessToken && !doc.tokenExpiry) {
    return doc.accessToken;
  }

  if (!doc.refreshToken) {
    const err = new Error(
      "Zoho Mail session expired. Reconnect Zoho Mail under Integrations."
    );
    err.statusCode = 401;
    throw err;
  }

  const tokens = await refreshAccessToken(doc.refreshToken, doc.zohoDataCenter || "com");
  if (!tokens.access_token) {
    const err = new Error("Could not refresh Zoho Mail access. Reconnect under Integrations.");
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

async function zohoMailApiFetch(integrationDoc, path, options = {}) {
  const dataCenter = normalizeDataCenter(integrationDoc.zohoDataCenter || "com");
  const dc = getZohoDcConfig(dataCenter);
  const accessToken = await getValidAccessToken(integrationDoc);
  const url = `https://${dc.mailApiHost}/api${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Zoho Mail API request failed";
    const err = new Error(msg);
    err.statusCode = res.status === 401 ? 401 : 502;
    err.zohoError = data;
    throw err;
  }
  return data;
}

async function fetchZohoMailAccounts(integrationDoc) {
  const data = await zohoMailApiFetch(integrationDoc, "/accounts");
  const list = Array.isArray(data?.data) ? data.data : [];
  return list;
}

async function pickPrimaryZohoAccount(integrationDoc) {
  const accounts = await fetchZohoMailAccounts(integrationDoc);
  if (!accounts.length) {
    throw new Error("No Zoho Mail accounts found for this user.");
  }

  const email = String(integrationDoc.email || "").trim().toLowerCase();
  if (email) {
    const match = accounts.find(
      (row) => String(row.primaryEmailAddress || row.emailAddress || "").toLowerCase() === email
    );
    if (match) return match;
  }

  return accounts[0];
}

module.exports = {
  getZohoMailIntegration,
  getValidAccessToken,
  zohoMailApiFetch,
  fetchZohoMailAccounts,
  pickPrimaryZohoAccount,
};
