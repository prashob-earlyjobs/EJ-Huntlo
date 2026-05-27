const mongoose = require("mongoose");
const User = require("../models/User");
const UserIntegration = require("../models/UserIntegration");
const {
  exchangeAuthCodeForTokens,
  fetchGoogleEmail,
  getGoogleOAuthConfig,
} = require("./googleGmailOAuth");
const { verifyMetaWhatsAppCredentials } = require("./metaWhatsAppClient");
const {
  getHuntloWhatsAppCredentials,
  isHuntloWhatsAppConfigured,
} = require("./metaWhatsAppConfig");

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const { fetchCalendlyUser } = require("./calendlyClient");

const PROVIDER_LABELS = {
  gmail: { integration: "Gmail", provider: "Google" },
  whatsapp: { integration: "WhatsApp Business", provider: "Meta" },
  calendly: { integration: "Calendly", provider: "Calendly" },
};

function formatIntegrationRow(doc) {
  if (doc.provider === "calendly") {
    return {
      id: String(doc._id),
      provider: "calendly",
      integration: "Calendly",
      providerLabel: "Calendly",
      senderName: doc.senderName || "",
      email: doc.email || "",
      status: "connected",
      schedulingUrl: doc.accessToken || "",
      connectedAt: doc.updatedAt || doc.createdAt,
    };
  }

  if (doc.provider === "whatsapp") {
    const waProvider = resolveWhatsappProvider(doc);
    const viaMeta = waProvider === "meta";
    const isHuntlo = doc.whatsappMode === "huntlo" && viaMeta;
    return {
      id: String(doc._id),
      provider: "whatsapp",
      integration: "WhatsApp Business",
      providerLabel: isHuntlo ? "Huntlo" : viaMeta ? "Meta API" : "WhatsApp",
      senderName: doc.senderName || doc.metaPhoneNumberId || "WhatsApp",
      email: doc.email || "",
      status: "connected",
      whatsappProvider: waProvider,
      whatsappMode: doc.whatsappMode || (viaMeta ? "own" : ""),
      metaPhoneNumberId: viaMeta ? doc.metaPhoneNumberId || "" : "",
      metaWabaId: viaMeta ? doc.metaWabaId || "" : "",
      connectedAt: doc.updatedAt || doc.createdAt,
    };
  }

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

function resolveWhatsappProvider(doc) {
  if (!doc) return "";
  if (doc.whatsappMode === "huntlo") {
    return isHuntloWhatsAppConfigured() ? "meta" : "";
  }
  if (doc.whatsappProvider === "meta" && doc.metaPhoneNumberId && doc.accessToken) {
    return "meta";
  }
  if (doc.metaPhoneNumberId && doc.accessToken) return "meta";
  return "";
}

function clearMetaFields() {
  return {
    metaPhoneNumberId: "",
    metaWabaId: "",
    accessToken: "",
    tokenExpiry: null,
  };
}

async function saveWhatsAppIntegration(userOid, patch) {
  let doc = await UserIntegration.findOne({ userId: userOid, provider: "whatsapp" });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "whatsapp",
      ...patch,
    });
  }
  await doc.save();
  return doc;
}

/**
 * Test Huntlo platform WhatsApp availability (no DB write).
 */
async function verifyHuntloWhatsAppCredentials() {
  const creds = getHuntloWhatsAppCredentials();
  if (!creds) {
    const err = new Error(
      "Huntlo WhatsApp is not configured on this server. Contact support or connect your own Meta account."
    );
    err.statusCode = 503;
    throw err;
  }

  const verified = await verifyMetaWhatsAppCredentials({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    wabaId: creds.wabaId,
  });

  return {
    ...verified,
    mode: "huntlo",
    message: verified.message.replace(/^Connected/, "Huntlo WhatsApp is ready"),
  };
}

/**
 * Test Meta WhatsApp credentials before connect (no DB write).
 */
async function verifyWhatsAppIntegrationCredentials(body) {
  const mode = String(body?.whatsappMode || body?.mode || "").toLowerCase();
  if (mode === "huntlo") {
    return verifyHuntloWhatsAppCredentials();
  }
  return verifyMetaWhatsAppCredentials(body);
}

/**
 * Connect WhatsApp via Meta Cloud API (Phone Number ID + access token).
 */
async function connectWhatsAppMeta(userId, body) {
  const verified = await verifyMetaWhatsAppCredentials(body);
  const phone = verified.phoneNumber;
  const userOid = new mongoose.Types.ObjectId(userId);
  const accessToken = String(body?.accessToken || body?.metaAccessToken || "").trim();
  const wabaId = String(body?.wabaId || body?.metaWabaId || "").trim().replace(/\s/g, "");

  const doc = await saveWhatsAppIntegration(userOid, {
    whatsappProvider: "meta",
    whatsappMode: "own",
    metaPhoneNumberId: phone.id,
    metaWabaId: wabaId,
    accessToken,
    refreshToken: "",
    senderName: phone.verifiedName || phone.displayPhoneNumber || "Meta WhatsApp",
    email: phone.displayPhoneNumber || "",
    tokenExpiry: null,
    scopes: ["whatsapp", "whatsapp_business_messaging"],
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

/**
 * Connect WhatsApp using Huntlo's platform Meta account (credentials from server env).
 */
async function connectWhatsAppHuntlo(userId) {
  const creds = getHuntloWhatsAppCredentials();
  if (!creds) {
    const err = new Error(
      "Huntlo WhatsApp is not available. Contact support or connect your own Meta account."
    );
    err.statusCode = 503;
    throw err;
  }

  const verified = await verifyMetaWhatsAppCredentials({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    wabaId: creds.wabaId,
  });
  const phone = verified.phoneNumber;
  const userOid = new mongoose.Types.ObjectId(userId);

  const doc = await saveWhatsAppIntegration(userOid, {
    whatsappProvider: "meta",
    whatsappMode: "huntlo",
    metaPhoneNumberId: phone.id,
    metaWabaId: creds.wabaId || "",
    accessToken: "",
    refreshToken: "",
    senderName: phone.verifiedName || "Huntlo WhatsApp",
    email: phone.displayPhoneNumber || "",
    tokenExpiry: null,
    scopes: ["whatsapp", "whatsapp_business_messaging"],
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function getWhatsAppStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "whatsapp",
  }).lean();

  const huntloAvailable = isHuntloWhatsAppConfigured();

  if (!doc) {
    return {
      connected: false,
      configured: true,
      huntloAvailable,
      whatsappMode: "",
    };
  }

  const waProvider = resolveWhatsappProvider(doc);
  const viaMeta = waProvider === "meta";
  const isHuntlo = doc.whatsappMode === "huntlo";

  return {
    connected: viaMeta,
    configured: true,
    huntloAvailable,
    whatsappProvider: waProvider,
    whatsappMode: isHuntlo ? "huntlo" : viaMeta ? "own" : "",
    mode: isHuntlo ? "huntlo" : viaMeta ? "own" : "",
    senderName: doc.senderName || "",
    phoneNumber: viaMeta ? doc.email || "" : "",
    metaPhoneNumberId: viaMeta ? doc.metaPhoneNumberId || "" : "",
    metaWabaId: viaMeta ? doc.metaWabaId || "" : "",
    providerLabel: isHuntlo ? "Huntlo" : viaMeta ? "Meta API" : "Reconnect required",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

/**
 * Connect WhatsApp — Huntlo account or user's own Meta API.
 */
async function connectWhatsApp(userId, body) {
  const mode = String(body?.whatsappMode || body?.mode || "").toLowerCase();
  if (mode === "huntlo") {
    return connectWhatsAppHuntlo(userId);
  }
  return connectWhatsAppMeta(userId, body);
}

async function disconnectWhatsApp(userId) {
  return disconnectIntegration(userId, "whatsapp");
}

async function saveCalendlyIntegration(userOid, patch) {
  let doc = await UserIntegration.findOne({ userId: userOid, provider: "calendly" });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "calendly",
      ...patch,
    });
  }
  await doc.save();
  return doc;
}

async function verifyCalendlyCredentials(body) {
  const personalAccessToken = String(body?.personalAccessToken || "").trim();
  const user = await fetchCalendlyUser(personalAccessToken);
  return {
    verified: true,
    message: user.email
      ? `Connected as ${user.name || user.email} (${user.email}).`
      : `Connected as ${user.name || "Calendly user"}.`,
    user,
  };
}

async function connectCalendly(userId, body) {
  const personalAccessToken = String(body?.personalAccessToken || "").trim();
  const user = await fetchCalendlyUser(personalAccessToken);
  const userOid = new mongoose.Types.ObjectId(userId);

  const doc = await saveCalendlyIntegration(userOid, {
    email: user.email,
    senderName: user.name || user.slug || user.email,
    accessToken: user.schedulingUrl,
    refreshToken: personalAccessToken,
    tokenExpiry: null,
    scopes: ["calendly"],
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function getCalendlyStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "calendly",
  }).lean();

  if (!doc) {
    return { connected: false, configured: true };
  }

  return {
    connected: true,
    configured: true,
    email: doc.email || "",
    senderName: doc.senderName || "",
    schedulingUrl: doc.accessToken || "",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

async function disconnectCalendly(userId) {
  return disconnectIntegration(userId, "calendly");
}

/**
 * Calendly API credentials for scheduling features.
 */
async function getCalendlyCredentialsForUser(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "calendly",
  });

  if (!doc || !doc.refreshToken) {
    const err = new Error("Calendly is not connected. Connect Calendly under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  return {
    personalAccessToken: doc.refreshToken,
    email: doc.email || "",
    name: doc.senderName || "",
    schedulingUrl: doc.accessToken || "",
  };
}

/**
 * Meta Cloud API credentials for outbound WhatsApp (used by send service).
 */
async function getMetaCredentialsForUser(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "whatsapp",
  });

  if (!doc) {
    const err = new Error("WhatsApp is not connected. Connect WhatsApp under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  const waProvider = resolveWhatsappProvider(doc);
  if (waProvider !== "meta") {
    const err = new Error(
      "WhatsApp is not connected. Reconnect under Integrations."
    );
    err.statusCode = 400;
    throw err;
  }

  if (doc.whatsappMode === "huntlo") {
    const huntlo = getHuntloWhatsAppCredentials();
    if (!huntlo) {
      const err = new Error(
        "Huntlo WhatsApp is temporarily unavailable. Reconnect under Integrations or use your own Meta account."
      );
      err.statusCode = 503;
      throw err;
    }
    return {
      provider: "meta",
      phoneNumberId: huntlo.phoneNumberId,
      accessToken: huntlo.accessToken,
      wabaId: huntlo.wabaId || "",
      displayName: doc.senderName || "Huntlo WhatsApp",
      displayPhoneNumber: doc.email || "",
    };
  }

  if (!doc.metaPhoneNumberId || !doc.accessToken) {
    const err = new Error("Meta WhatsApp credentials are incomplete. Reconnect under Integrations.");
    err.statusCode = 400;
    throw err;
  }

  return {
    provider: "meta",
    phoneNumberId: doc.metaPhoneNumberId,
    accessToken: doc.accessToken,
    wabaId: doc.metaWabaId || "",
    displayName: doc.senderName || doc.metaPhoneNumberId,
    displayPhoneNumber: doc.email || "",
  };
}

module.exports = {
  connectGmail,
  connectWhatsApp,
  connectWhatsAppMeta,
  connectWhatsAppHuntlo,
  verifyWhatsAppIntegrationCredentials,
  connectCalendly,
  verifyCalendlyCredentials,
  getGmailStatus,
  getWhatsAppStatus,
  getCalendlyStatus,
  getMetaCredentialsForUser,
  getCalendlyCredentialsForUser,
  listUserIntegrations,
  disconnectGmail,
  disconnectWhatsApp,
  disconnectCalendly,
  disconnectIntegration,
  resolveWhatsappProvider,
};
