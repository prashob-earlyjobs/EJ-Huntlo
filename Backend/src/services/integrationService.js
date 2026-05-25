const mongoose = require("mongoose");
const User = require("../models/User");
const UserIntegration = require("../models/UserIntegration");
const {
  exchangeAuthCodeForTokens,
  fetchGoogleEmail,
  getGoogleOAuthConfig,
} = require("./googleGmailOAuth");
const { isHuntloGupshupConfigured } = require("./gupshupConfig");
const { normalizeGupshupSourceNumber } = require("./gupshupClient");

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const { fetchCalendlyUser } = require("./calendlyClient");

const PROVIDER_LABELS = {
  gmail: { integration: "Gmail", provider: "Google" },
  whatsapp: { integration: "WhatsApp Business", provider: "Gupshup" },
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
    const viaHuntlo = doc.gupshupMode === "huntlo";
    return {
      id: String(doc._id),
      provider: "whatsapp",
      integration: "WhatsApp Business",
      providerLabel: viaHuntlo ? "Huntlo" : "Gupshup",
      senderName: doc.senderName || (viaHuntlo ? "Huntlo managed" : doc.gupshupUserId || ""),
      email: doc.email || (viaHuntlo ? "Managed sender" : ""),
      status: "connected",
      gupshupMode: doc.gupshupMode || "",
      gupshupUserId: viaHuntlo ? "" : doc.gupshupUserId || "",
      gupshupAppName: viaHuntlo ? "" : doc.gupshupAppName || "",
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
 * Test Gupshup credentials before connect (no DB write).
 * TODO: replace stub with live Gupshup API credential check.
 */
async function verifyWhatsAppGupshupCredentials(body) {
  const mode = body?.gupshupMode === "huntlo" ? "huntlo" : "existing";

  if (mode === "huntlo") {
    if (!isHuntloGupshupConfigured()) {
      const err = new Error(
        "Huntlo WhatsApp is not configured on the server. Contact support or use your own Gupshup account."
      );
      err.statusCode = 503;
      throw err;
    }
    return {
      verified: true,
      mode: "huntlo",
      message: "Huntlo WhatsApp is available.",
    };
  }

  const gupshupUserId = String(body?.gupshupUserId || "").trim();
  const gupshupPassword = String(body?.gupshupPassword || "");

  if (!gupshupUserId) {
    const err = new Error("Gupshup user ID is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!gupshupPassword) {
    const err = new Error("Gupshup password is required.");
    err.statusCode = 400;
    throw err;
  }

  // Stub: accept well-formed credentials until Gupshup verify API is wired.
  return {
    verified: true,
    mode: "existing",
    message: "Credentials look valid. You can connect WhatsApp.",
  };
}

/**
 * Connect WhatsApp via Gupshup (user-owned or Huntlo-managed credentials).
 */
async function connectWhatsAppGupshup(userId, body) {
  const mode = body?.gupshupMode === "huntlo" ? "huntlo" : "existing";
  const userOid = new mongoose.Types.ObjectId(userId);

  if (mode === "huntlo") {
    if (!isHuntloGupshupConfigured()) {
      const err = new Error(
        "Huntlo WhatsApp is not configured on the server. Contact support or use your own Gupshup account."
      );
      err.statusCode = 503;
      throw err;
    }

    const doc = await saveWhatsAppIntegration(userOid, {
      gupshupMode: "huntlo",
      gupshupUserId: "",
      gupshupAppName: "",
      senderName: "Huntlo managed",
      email: "Managed sender",
      accessToken: "",
      refreshToken: "",
      tokenExpiry: null,
      scopes: ["whatsapp"],
    });

    return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
  }

  const gupshupUserId = String(body?.gupshupUserId || "").trim();
  const gupshupPassword = String(body?.gupshupPassword || "");
  const gupshupAppName = String(body?.gupshupAppName || "").trim();
  const phoneNumber = String(body?.phoneNumber || "").trim().replace(/\s/g, "");

  if (!gupshupUserId) {
    const err = new Error("Gupshup user ID is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!gupshupPassword) {
    const err = new Error("Gupshup password is required.");
    err.statusCode = 400;
    throw err;
  }

  const doc = await saveWhatsAppIntegration(userOid, {
    gupshupMode: "existing",
    gupshupUserId,
    gupshupAppName,
    senderName: gupshupUserId,
    email: phoneNumber,
    accessToken: "",
    refreshToken: gupshupPassword,
    tokenExpiry: null,
    scopes: ["whatsapp"],
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function getWhatsAppStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "whatsapp",
  }).lean();

  if (!doc) {
    return {
      connected: false,
      configured: isHuntloGupshupConfigured(),
      huntloAvailable: isHuntloGupshupConfigured(),
    };
  }

  const viaHuntlo = doc.gupshupMode === "huntlo";

  return {
    connected: true,
    configured: true,
    huntloAvailable: isHuntloGupshupConfigured(),
    mode: doc.gupshupMode || "existing",
    senderName: doc.senderName || "",
    phoneNumber: viaHuntlo ? "" : doc.email || "",
    gupshupUserId: viaHuntlo ? "" : doc.gupshupUserId || "",
    gupshupAppName: viaHuntlo ? "" : doc.gupshupAppName || "",
    providerLabel: viaHuntlo ? "Huntlo" : "Gupshup",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
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
    gupshupMode: "",
    gupshupUserId: "",
    gupshupAppName: "",
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
 * Resolve Gupshup credentials for outbound WhatsApp (used by future send service).
 */
async function getGupshupCredentialsForUser(userId) {
  const { getHuntloGupshupConfig } = require("./gupshupConfig");
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

  if (doc.gupshupMode === "huntlo") {
    const platform = getHuntloGupshupConfig();
    if (!platform) {
      const err = new Error("Huntlo WhatsApp is not configured on the server.");
      err.statusCode = 503;
      throw err;
    }
    const source =
      platform.sourceNumber ||
      normalizeGupshupSourceNumber(doc.email) ||
      "";
    return {
      mode: "huntlo",
      userId: platform.userId,
      password: platform.password,
      appName: platform.appName,
      sourceNumber: source,
      displayName: doc.senderName || "Huntlo",
    };
  }

  if (!doc.gupshupUserId || !doc.refreshToken) {
    const err = new Error("WhatsApp Gupshup credentials are incomplete. Reconnect under Integrations.");
    err.statusCode = 400;
    throw err;
  }

  return {
    mode: "existing",
    userId: doc.gupshupUserId,
    password: doc.refreshToken,
    appName: doc.gupshupAppName || "",
    sourceNumber: normalizeGupshupSourceNumber(doc.email),
    displayName: doc.senderName || doc.gupshupUserId,
  };
}

module.exports = {
  connectGmail,
  connectWhatsAppGupshup,
  verifyWhatsAppGupshupCredentials,
  connectCalendly,
  verifyCalendlyCredentials,
  getGmailStatus,
  getWhatsAppStatus,
  getCalendlyStatus,
  getGupshupCredentialsForUser,
  getCalendlyCredentialsForUser,
  listUserIntegrations,
  disconnectGmail,
  disconnectWhatsApp,
  disconnectCalendly,
  disconnectIntegration,
};
