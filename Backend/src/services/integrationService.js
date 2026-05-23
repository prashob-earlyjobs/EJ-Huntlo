const mongoose = require("mongoose");
const User = require("../models/User");
const UserIntegration = require("../models/UserIntegration");
const {
  exchangeAuthCodeForTokens,
  fetchGoogleEmail,
  getGoogleOAuthConfig,
} = require("./googleGmailOAuth");

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const PROVIDER_LABELS = {
  gmail: { integration: "Gmail", provider: "Google" },
};

function formatIntegrationRow(doc) {
  const labels = PROVIDER_LABELS[doc.provider] || {
    integration: doc.provider,
    provider: "—",
  };
  return {
    id: String(doc._id),
    provider: doc.provider,
    integration: labels.integration,
    providerLabel: labels.provider,
    senderName: doc.senderName || "",
    email: doc.email || "",
    status: "connected",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

function tokenExpiry(expiresIn) {
  const sec = Number(expiresIn);
  return Number.isFinite(sec) && sec > 0 ? new Date(Date.now() + sec * 1000) : null;
}

async function saveGmailIntegration(userOid, email, tokens, senderName) {
  const patch = {
    email: email || "",
    senderName: senderName || "",
    accessToken: tokens.access_token,
    refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : "",
    tokenExpiry: tokenExpiry(tokens.expires_in),
    scopes: [GMAIL_SCOPE],
  };

  let doc = await UserIntegration.findOne({ userId: userOid, provider: "gmail" });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "gmail",
      ...patch,
    });
  }

  await doc.save();
  return doc;
}

async function connectGmail(userId, code) {
  if (!getGoogleOAuthConfig()) {
    const err = new Error(
      "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Backend/.env"
    );
    err.statusCode = 503;
    throw err;
  }

  const tokens = await exchangeAuthCodeForTokens(code);
  if (!tokens.access_token) {
    const err = new Error("No access token from Google");
    err.statusCode = 400;
    throw err;
  }

  const email = await fetchGoogleEmail(tokens.access_token);
  const userOid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userOid).select("fullName").lean();
  const senderName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
  const doc = await saveGmailIntegration(userOid, email, tokens, senderName);

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function listUserIntegrations(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const docs = await UserIntegration.find({ userId: userOid })
    .sort({ updatedAt: -1 })
    .lean();
  let fallbackSenderName = "";
  const needsSender = docs.some((d) => !d.senderName);
  if (needsSender) {
    const user = await User.findById(userOid).select("fullName").lean();
    fallbackSenderName =
      typeof user?.fullName === "string" ? user.fullName.trim() : "";
  }
  return docs.map((doc) =>
    formatIntegrationRow({
      ...doc,
      senderName: doc.senderName || fallbackSenderName,
    })
  );
}

async function getGmailStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "gmail",
  }).lean();

  if (!doc) {
    return { connected: false, configured: Boolean(getGoogleOAuthConfig()) };
  }

  return {
    connected: true,
    configured: true,
    email: doc.email || "",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

async function disconnectIntegration(userId, provider) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const result = await UserIntegration.deleteOne({ userId: userOid, provider });
  return { deleted: result.deletedCount > 0 };
}

async function disconnectGmail(userId) {
  return disconnectIntegration(userId, "gmail");
}

module.exports = {
  connectGmail,
  getGmailStatus,
  listUserIntegrations,
  disconnectGmail,
  disconnectIntegration,
};
