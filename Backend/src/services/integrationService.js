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
const {
  getWebhookVerifyToken,
  getMetaWebhookSetupForClient,
  getPublicApiBaseUrl,
} = require("../utils/metaWebhookSetup");
const {
  isGupshupWhatsAppConfigured,
  getGupshupWhatsAppCredentials,
} = require("./gupshupWhatsAppConfig");
const { getGupshupWebhookSetupForClient } = require("../utils/gupshupWebhookSetup");
const { getActiveMessagingChannel } = require("./platformSettingsService");

const { GMAIL_SCOPES } = require("./gmailClient");

const { fetchCalendlyUser, fetchCalendlyEventTypes } = require("./calendlyClient");
const { exchangeAuthCodeForTokens: exchangeZohoAuthCode } = require("./zohoMailOAuth");
const {
  buildZohoOAuthAuthorizeUrl,
  getZohoOAuthConfig,
  getZohoOAuthRedirectUri,
  normalizeDataCenter,
  dataCenterFromZohoLocation,
  ZOHO_MAIL_SCOPES,
} = require("./zohoMailConfig");
const { pickPrimaryZohoAccount } = require("./zohoMailClient");
const { verifyZohoSmtpCredentials } = require("./zohoMailSmtpService");
const { sendZohoMailMessage } = require("./zohoMailSendService");
const { exchangeAuthCodeForTokens: exchangeOutlookAuthCode, fetchMicrosoftProfile } =
  require("./outlookMailOAuth");
const {
  buildOutlookOAuthAuthorizeUrl,
  getOutlookOAuthConfig,
  getOutlookOAuthRedirectUri,
  OUTLOOK_MAIL_SCOPES,
} = require("./outlookMailConfig");
const { sendOutlookMessage } = require("./outlookMailSendService");
const {
  verifyCustomMailSmtpCredentials,
  smtpConfigFromBody,
} = require("./customMailSmtpService");
const { sendCustomMailMessage } = require("./customMailSendService");
const {
  ensureDefaultEmailOnConnect,
  reassignDefaultEmailIntegration,
  setDefaultEmailIntegration: setUserDefaultEmailIntegration,
  EMAIL_PROVIDERS,
} = require("./emailIntegrationService");

const PROVIDER_LABELS = {
  gmail: { integration: "Gmail", provider: "Google" },
  outlook: { integration: "Outlook", provider: "Microsoft" },
  zoho_mail: { integration: "Zoho Mail", provider: "Zoho" },
  custom_mail: { integration: "Custom config", provider: "SMTP" },
  whatsapp: { integration: "WhatsApp Business", provider: "Meta" },
  calendly: { integration: "Calendly", provider: "Calendly" },
};

function formatIntegrationRow(doc, platformChannel = "huntlo_meta") {
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

  if (doc.provider === "zoho_mail") {
    const mode = doc.zohoAuthMode || (doc.accessToken ? "oauth" : doc.refreshToken ? "smtp" : "");
    return {
      id: String(doc._id),
      provider: "zoho_mail",
      integration: "Zoho Mail",
      providerLabel: mode === "smtp" ? "Zoho SMTP" : "Zoho",
      senderName: doc.senderName || "",
      email: doc.email || "",
      status: "connected",
      zohoAuthMode: mode,
      zohoDataCenter: doc.zohoDataCenter || "com",
      isDefaultEmail: Boolean(doc.isDefaultEmail),
      connectedAt: doc.updatedAt || doc.createdAt,
    };
  }

  if (doc.provider === "custom_mail") {
    return {
      id: String(doc._id),
      provider: "custom_mail",
      integration: "Custom config",
      providerLabel: "SMTP",
      senderName: doc.senderName || "",
      email: doc.email || "",
      status: "connected",
      smtpHost: doc.smtpHost || "",
      smtpPort: doc.smtpPort || 587,
      smtpSecurity: doc.smtpSecurity || "tls",
      isDefaultEmail: Boolean(doc.isDefaultEmail),
      connectedAt: doc.updatedAt || doc.createdAt,
    };
  }

  if (doc.provider === "whatsapp") {
    const waProvider = resolveWhatsappProvider(doc, platformChannel);
    const viaMeta = waProvider === "meta";
    const viaGupshup = waProvider === "gupshup";
    const isHuntlo = doc.whatsappMode === "huntlo" && (viaMeta || viaGupshup);
    return {
      id: String(doc._id),
      provider: "whatsapp",
      integration: "WhatsApp Business",
      providerLabel: viaGupshup
        ? "Gupshup"
        : isHuntlo
          ? "Huntlo"
          : viaMeta
            ? "Meta API"
            : "WhatsApp",
      senderName: doc.senderName || doc.metaPhoneNumberId || "WhatsApp",
      email: doc.email || "",
      status: waProvider ? "connected" : "disconnected",
      whatsappProvider: waProvider,
      whatsappMode: doc.whatsappMode || (viaMeta || viaGupshup ? "own" : ""),
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
    isDefaultEmail: EMAIL_PROVIDERS.includes(doc.provider) ? Boolean(doc.isDefaultEmail) : false,
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
    scopes: [...GMAIL_SCOPES],
  };

  let doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "gmail",
    email: email || "",
  });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "gmail",
      email: email || "",
      ...patch,
    });
  }

  await doc.save();
  await ensureDefaultEmailOnConnect(userOid, doc);
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
  const platformChannel = await getActiveMessagingChannel();
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
    formatIntegrationRow(
      {
        ...doc,
        senderName: doc.senderName || fallbackSenderName,
      },
      platformChannel
    )
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
  const docs = await UserIntegration.find({ userId: userOid, provider });
  if (docs.length === 0) return { deleted: false };
  const hadDefault = docs.some((doc) => doc.isDefaultEmail);
  await UserIntegration.deleteMany({ userId: userOid, provider });
  if (hadDefault && EMAIL_PROVIDERS.includes(provider)) {
    await reassignDefaultEmailIntegration(userOid);
  }
  return { deleted: true, count: docs.length };
}

async function disconnectIntegrationById(userId, integrationId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  if (!mongoose.Types.ObjectId.isValid(String(integrationId))) {
    const err = new Error("Invalid integration id");
    err.statusCode = 400;
    throw err;
  }
  const doc = await UserIntegration.findOne({
    _id: integrationId,
    userId: userOid,
  });
  if (!doc) return { deleted: false };
  const wasDefault = doc.isDefaultEmail;
  const provider = doc.provider;
  await doc.deleteOne();
  if (wasDefault && EMAIL_PROVIDERS.includes(provider)) {
    await reassignDefaultEmailIntegration(userOid);
  }
  return { deleted: true, provider };
}

async function setDefaultEmailIntegration(userId, integrationId) {
  const doc = await setUserDefaultEmailIntegration(userId, integrationId);
  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function disconnectGmail(userId) {
  return disconnectIntegration(userId, "gmail");
}

function resolveWhatsappProvider(doc, platformChannel = "huntlo_meta") {
  if (!doc) return "";
  const channel = platformChannel === "gupshup" ? "gupshup" : "huntlo_meta";

  if (channel === "gupshup") {
    if (doc.whatsappProvider === "gupshup" && isGupshupWhatsAppConfigured()) {
      return "gupshup";
    }
    return "";
  }

  if (doc.whatsappProvider === "gupshup") {
    return "";
  }

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
async function verifyGupshupWhatsAppCredentials() {
  const creds = getGupshupWhatsAppCredentials();
  if (!creds) {
    const err = new Error(
      "Gupshup WhatsApp is not configured on this server. Contact your administrator."
    );
    err.statusCode = 503;
    throw err;
  }

  return {
    verified: true,
    mode: "gupshup",
    message: `Gupshup Gateway is ready (userid ${creds.userid}).`,
  };
}

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
  const platformChannel = await getActiveMessagingChannel();
  if (platformChannel === "gupshup") {
    return verifyGupshupWhatsAppCredentials();
  }

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
  if (!getWebhookVerifyToken()) {
    const err = new Error(
      "WhatsApp inbound webhooks are not configured on this server (META_WEBHOOK_VERIFY_TOKEN). Contact your administrator before connecting your own Meta account."
    );
    err.statusCode = 503;
    throw err;
  }

  const confirmedWebhook = Boolean(
    body?.confirmWebhookSetup ?? body?.confirmWebhookConfigured
  );
  if (!confirmedWebhook) {
    const err = new Error(
      "Confirm that you configured the Meta webhook with Huntlo's callback URL and verify token."
    );
    err.statusCode = 400;
    throw err;
  }

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
async function connectWhatsAppGupshup(userId) {
  const creds = getGupshupWhatsAppCredentials();
  if (!creds) {
    const err = new Error(
      "Gupshup WhatsApp is not available. Contact support or ask an admin to configure Gupshup on the server."
    );
    err.statusCode = 503;
    throw err;
  }

  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await saveWhatsAppIntegration(userOid, {
    whatsappProvider: "gupshup",
    whatsappMode: "huntlo",
    metaPhoneNumberId: "",
    metaWabaId: "",
    accessToken: "",
    refreshToken: "",
    senderName: "Gupshup WhatsApp",
    email: creds.userid,
    tokenExpiry: null,
    scopes: ["whatsapp", "gupshup_messaging"],
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc, "gupshup");
}

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

function attachMetaWebhookSetup(payload, req) {
  const metaWebhookSetup = getMetaWebhookSetupForClient(getPublicApiBaseUrl(req));
  return {
    ...payload,
    requiresMetaWebhookSetup: true,
    metaWebhookSetup,
  };
}

async function getWhatsAppStatus(userId, req) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const platformChannel = await getActiveMessagingChannel();
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "whatsapp",
  }).lean();

  const huntloAvailable = isHuntloWhatsAppConfigured();
  const gupshupAvailable = isGupshupWhatsAppConfigured();
  const apiBase = getPublicApiBaseUrl(req);
  const gupshupWebhookSetup = getGupshupWebhookSetupForClient(apiBase);

  if (!doc) {
    const disconnected = {
      connected: false,
      configured: true,
      platformMessagingChannel: platformChannel,
      huntloAvailable,
      gupshupAvailable,
      whatsappMode: "",
      requiresMetaWebhookSetup: platformChannel === "huntlo_meta",
      gupshupWebhookSetup,
    };
    if (platformChannel === "gupshup") {
      return { ...disconnected, requiresMetaWebhookSetup: false };
    }
    return attachMetaWebhookSetup(disconnected, req);
  }

  const waProvider = resolveWhatsappProvider(doc, platformChannel);
  const viaMeta = waProvider === "meta";
  const viaGupshup = waProvider === "gupshup";
  const isHuntlo = doc.whatsappMode === "huntlo";

  const base = {
    connected: viaMeta || viaGupshup,
    configured: true,
    platformMessagingChannel: platformChannel,
    huntloAvailable,
    gupshupAvailable,
    whatsappProvider: waProvider,
    whatsappMode: isHuntlo ? "huntlo" : viaMeta ? "own" : viaGupshup ? "huntlo" : "",
    mode: isHuntlo ? "huntlo" : viaMeta ? "own" : viaGupshup ? "huntlo" : "",
    senderName: doc.senderName || "",
    phoneNumber: viaMeta || viaGupshup ? doc.email || "" : "",
    metaPhoneNumberId: viaMeta ? doc.metaPhoneNumberId || "" : "",
    metaWabaId: viaMeta ? doc.metaWabaId || "" : "",
    providerLabel: viaGupshup
      ? "Gupshup"
      : isHuntlo
        ? "Huntlo"
        : viaMeta
          ? "Meta API"
          : "Reconnect required",
    connectedAt: doc.updatedAt || doc.createdAt,
    gupshupWebhookSetup,
  };

  if (platformChannel === "gupshup") {
    return {
      ...base,
      requiresMetaWebhookSetup: false,
    };
  }

  if (isHuntlo) {
    return {
      ...base,
      requiresMetaWebhookSetup: false,
    };
  }

  return attachMetaWebhookSetup(base, req);
}

async function getWhatsAppMetaWebhookSetup(req) {
  return getMetaWebhookSetupForClient(getPublicApiBaseUrl(req));
}

/**
 * Connect WhatsApp — Huntlo account or user's own Meta API.
 */
async function connectWhatsApp(userId, body) {
  const platformChannel = await getActiveMessagingChannel();
  if (platformChannel === "gupshup") {
    return connectWhatsAppGupshup(userId);
  }

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

async function getCalendlyMeetingLinks(userId) {
  const creds = await getCalendlyCredentialsForUser(userId);
  const eventTypes = await fetchCalendlyEventTypes(creds.personalAccessToken);
  const unique = new Map();

  for (const item of eventTypes) {
    if (!item?.schedulingUrl) continue;
    if (!unique.has(item.schedulingUrl)) {
      unique.set(item.schedulingUrl, item);
    }
  }

  return Array.from(unique.values());
}

async function disconnectCalendly(userId) {
  return disconnectIntegration(userId, "calendly");
}

async function saveOutlookIntegration(userOid, patch) {
  const email = String(patch.email || "").trim();
  let doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "outlook",
    email,
  });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "outlook",
      ...patch,
    });
  }
  await doc.save();
  await ensureDefaultEmailOnConnect(userOid, doc);
  return doc;
}

async function connectOutlookOAuth(userId, body) {
  if (!getOutlookOAuthConfig()) {
    const err = new Error(
      "Microsoft OAuth is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to Backend/.env"
    );
    err.statusCode = 503;
    throw err;
  }

  const code = String(body?.code || "").trim();
  if (!code) {
    const err = new Error("OAuth authorization code is required.");
    err.statusCode = 400;
    throw err;
  }

  const tokens = await exchangeOutlookAuthCode(code);
  if (!tokens.access_token) {
    const err = new Error("No access token from Microsoft");
    err.statusCode = 400;
    throw err;
  }

  const profile = await fetchMicrosoftProfile(tokens.access_token);
  const email =
    String(profile.mail || profile.userPrincipalName || "").trim();
  const senderName = String(profile.displayName || "").trim();
  const outlookUserId = String(profile.id || "").trim();
  const outlookTenantId = String(body?.tenantId || tokens.tenant_id || "common").trim();

  const userOid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userOid).select("fullName").lean();
  const fallbackName =
    typeof user?.fullName === "string" ? user.fullName.trim() : "";

  const doc = await saveOutlookIntegration(userOid, {
    email,
    senderName: senderName || fallbackName,
    accessToken: tokens.access_token,
    refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : "",
    tokenExpiry: tokenExpiry(tokens.expires_in),
    scopes: [...OUTLOOK_MAIL_SCOPES],
    outlookTenantId: outlookTenantId || "common",
    outlookUserId,
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

function getOutlookOAuthAuthorizePayload() {
  const configured = Boolean(getOutlookOAuthConfig() && getOutlookOAuthRedirectUri());
  const authorizeUrl = configured ? buildOutlookOAuthAuthorizeUrl() : "";
  return {
    configured,
    redirectUri: getOutlookOAuthRedirectUri(),
    authorizeUrl,
    scopes: OUTLOOK_MAIL_SCOPES,
  };
}

async function getOutlookStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "outlook",
  }).lean();

  const oauthConfigured = Boolean(getOutlookOAuthConfig() && getOutlookOAuthRedirectUri());

  if (!doc) {
    return {
      connected: false,
      configured: true,
      oauthConfigured,
    };
  }

  return {
    connected: Boolean(doc.accessToken),
    configured: true,
    oauthConfigured,
    email: doc.email || "",
    senderName: doc.senderName || "",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

async function disconnectOutlook(userId) {
  return disconnectIntegration(userId, "outlook");
}

async function sendOutlookTest(userId, body = {}) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const integrationId = String(body?.integrationId || "").trim();
  let doc = null;
  if (integrationId && mongoose.Types.ObjectId.isValid(integrationId)) {
    doc = await UserIntegration.findOne({
      _id: integrationId,
      userId: userOid,
      provider: "outlook",
    }).lean();
  } else {
    doc = await UserIntegration.findOne({
      userId: userOid,
      provider: "outlook",
      isDefaultEmail: true,
    }).lean();
    if (!doc) {
      doc = await UserIntegration.findOne({ userId: userOid, provider: "outlook" }).lean();
    }
  }

  if (!doc?.accessToken) {
    const err = new Error("Outlook is not connected. Connect Outlook under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  const to = String(body?.to || doc.email || "").trim();
  if (!to.includes("@")) {
    const err = new Error(
      "No recipient for test email. Reconnect Outlook so Huntlo can use your inbox address."
    );
    err.statusCode = 400;
    throw err;
  }

  const result = await sendOutlookMessage(
    userId,
    {
      to,
      subject: "Huntlo — Outlook connection test",
      body:
        "This is a test email from Huntlo.\n\nIf you received this, your Outlook integration is working and ready for candidate outreach.",
    },
    { integrationId: doc._id }
  );

  return {
    to: result.to || to,
    fromEmail: result.fromEmail || doc.email || "",
    messageId: result.messageId || "",
  };
}

async function saveZohoMailIntegration(userOid, patch) {
  const email = String(patch.email || "").trim();
  let doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "zoho_mail",
    email,
  });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "zoho_mail",
      ...patch,
    });
  }
  await doc.save();
  await ensureDefaultEmailOnConnect(userOid, doc);
  return doc;
}

async function verifyZohoMailIntegrationCredentials(body) {
  const mode = String(body?.authMode || body?.mode || "smtp").toLowerCase();
  if (mode === "oauth") {
    if (!getZohoOAuthConfig()) {
      const err = new Error(
        "Zoho OAuth is not configured on this server. Use SMTP or ask an admin to set ZOHO_CLIENT_ID."
      );
      err.statusCode = 503;
      throw err;
    }
    return {
      verified: true,
      mode: "oauth",
      message: "Zoho OAuth is configured. Continue with Sign in with Zoho.",
    };
  }

  return verifyZohoSmtpCredentials({
    email: body?.email,
    appPassword: body?.appPassword,
    dataCenter: body?.dataCenter,
  });
}

async function connectZohoMailSmtp(userId, body) {
  const email = String(body?.email || "").trim();
  const appPassword = String(body?.appPassword || "").trim();
  const dataCenter = normalizeDataCenter(body?.dataCenter);
  const senderName = String(body?.senderName || "").trim();

  await verifyZohoSmtpCredentials({ email, appPassword, dataCenter });

  const userOid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userOid).select("fullName").lean();
  const fallbackName =
    typeof user?.fullName === "string" ? user.fullName.trim() : "";

  const doc = await saveZohoMailIntegration(userOid, {
    email,
    senderName: senderName || fallbackName,
    accessToken: "",
    refreshToken: appPassword,
    tokenExpiry: null,
    scopes: ["zoho_mail_smtp"],
    zohoDataCenter: dataCenter,
    zohoAuthMode: "smtp",
    zohoAccountId: "",
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function connectZohoMailOAuth(userId, body) {
  if (!getZohoOAuthConfig()) {
    const err = new Error(
      "Zoho OAuth is not configured. Add ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET to Backend/.env"
    );
    err.statusCode = 503;
    throw err;
  }

  const code = String(body?.code || "").trim();
  if (!code) {
    const err = new Error("OAuth authorization code is required.");
    err.statusCode = 400;
    throw err;
  }

  const locationDc = dataCenterFromZohoLocation(body?.location);
  const dataCenter = normalizeDataCenter(locationDc || body?.dataCenter);
  const accountsServer = String(body?.accountsServer || "").trim();
  const tokens = await exchangeZohoAuthCode(code, dataCenter, accountsServer);
  if (!tokens.access_token) {
    const err = new Error("No access token from Zoho");
    err.statusCode = 400;
    throw err;
  }

  const userOid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userOid).select("fullName").lean();
  const fallbackName =
    typeof user?.fullName === "string" ? user.fullName.trim() : "";

  let doc = await saveZohoMailIntegration(userOid, {
    email: "",
    senderName: fallbackName,
    accessToken: tokens.access_token,
    refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : "",
    tokenExpiry: tokenExpiry(tokens.expires_in),
    scopes: [...ZOHO_MAIL_SCOPES],
    zohoDataCenter: dataCenter,
    zohoAuthMode: "oauth",
    zohoAccountId: "",
  });

  const account = await pickPrimaryZohoAccount(doc);
  const accountEmail =
    account.primaryEmailAddress || account.emailAddress || account.incomingUserName || "";
  const accountId = String(account.accountId || account.accountid || "").trim();
  const displayName =
    account.displayName || account.accountDisplayName || fallbackName || accountEmail;

  doc.email = String(accountEmail).trim();
  doc.senderName = String(displayName).trim() || doc.senderName;
  doc.zohoAccountId = accountId;
  await doc.save();

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function connectZohoMail(userId, body) {
  const mode = String(body?.authMode || body?.mode || "").toLowerCase();
  if (mode === "oauth" || body?.code) {
    return connectZohoMailOAuth(userId, body);
  }
  return connectZohoMailSmtp(userId, body);
}

function getZohoMailOAuthAuthorizePayload(dataCenter) {
  const configured = Boolean(getZohoOAuthConfig() && getZohoOAuthRedirectUri());
  const dc = normalizeDataCenter(dataCenter);
  const authorizeUrl = configured ? buildZohoOAuthAuthorizeUrl({ dataCenter: dc }) : "";
  return {
    configured,
    dataCenter: dc,
    redirectUri: getZohoOAuthRedirectUri(),
    authorizeUrl,
    scopes: ZOHO_MAIL_SCOPES,
  };
}

async function getZohoMailStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "zoho_mail",
  }).lean();

  const oauthConfigured = Boolean(getZohoOAuthConfig() && getZohoOAuthRedirectUri());

  if (!doc) {
    return {
      connected: false,
      configured: true,
      oauthConfigured,
      zohoAuthMode: "",
      zohoDataCenter: "com",
    };
  }

  return {
    connected: true,
    configured: true,
    oauthConfigured,
    email: doc.email || "",
    senderName: doc.senderName || "",
    zohoAuthMode: doc.zohoAuthMode || "",
    zohoDataCenter: doc.zohoDataCenter || "com",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

async function disconnectZohoMail(userId) {
  return disconnectIntegration(userId, "zoho_mail");
}

async function saveCustomMailIntegration(userOid, patch) {
  const email = String(patch.email || "").trim();
  const smtpHost = String(patch.smtpHost || "").trim();
  let doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "custom_mail",
    email,
    smtpHost,
  });
  if (doc) {
    Object.assign(doc, patch);
  } else {
    doc = new UserIntegration({
      userId: userOid,
      provider: "custom_mail",
      ...patch,
    });
  }
  await doc.save();
  await ensureDefaultEmailOnConnect(userOid, doc);
  return doc;
}

async function verifyCustomMailIntegrationCredentials(body) {
  return verifyCustomMailSmtpCredentials(body);
}

async function connectCustomMail(userId, body) {
  const config = smtpConfigFromBody(body);
  await verifyCustomMailSmtpCredentials(body);

  const userOid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userOid).select("fullName").lean();
  const fallbackName =
    typeof user?.fullName === "string" ? user.fullName.trim() : "";

  const doc = await saveCustomMailIntegration(userOid, {
    email: config.fromEmail,
    senderName: config.senderName || fallbackName || config.fromEmail.split("@")[0],
    accessToken: config.username,
    refreshToken: config.password,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecurity: config.security,
    tokenExpiry: null,
    scopes: ["custom_smtp"],
  });

  return formatIntegrationRow(doc.toObject ? doc.toObject() : doc);
}

async function getCustomMailStatus(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await UserIntegration.findOne({
    userId: userOid,
    provider: "custom_mail",
  }).lean();

  if (!doc) {
    return {
      connected: false,
      configured: true,
    };
  }

  return {
    connected: true,
    configured: true,
    email: doc.email || "",
    senderName: doc.senderName || "",
    smtpHost: doc.smtpHost || "",
    smtpPort: doc.smtpPort || 587,
    smtpSecurity: doc.smtpSecurity || "tls",
    connectedAt: doc.updatedAt || doc.createdAt,
  };
}

async function disconnectCustomMail(userId) {
  return disconnectIntegration(userId, "custom_mail");
}

async function sendCustomMailTest(userId, body = {}) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const integrationId = String(body?.integrationId || "").trim();
  let doc = null;
  if (integrationId && mongoose.Types.ObjectId.isValid(integrationId)) {
    doc = await UserIntegration.findOne({
      _id: integrationId,
      userId: userOid,
      provider: "custom_mail",
    }).lean();
  } else {
    doc = await UserIntegration.findOne({
      userId: userOid,
      provider: "custom_mail",
      isDefaultEmail: true,
    }).lean();
    if (!doc) {
      doc = await UserIntegration.findOne({ userId: userOid, provider: "custom_mail" }).lean();
    }
  }

  if (!doc) {
    const err = new Error("Custom mail is not connected. Connect SMTP under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  const to = String(body?.to || doc.email || "").trim();
  if (!to.includes("@")) {
    const err = new Error(
      "No recipient for test email. Reconnect custom mail so Huntlo can use your from address."
    );
    err.statusCode = 400;
    throw err;
  }

  const result = await sendCustomMailMessage(
    userId,
    {
      to,
      subject: "Huntlo — Custom SMTP connection test",
      body:
        "This is a test email from Huntlo.\n\nIf you received this, your custom SMTP integration is working and ready for candidate outreach.",
    },
    { integrationId: doc._id }
  );

  return {
    to: result.to || to,
    fromEmail: result.fromEmail || doc.email || "",
    messageId: result.messageId || "",
  };
}

async function sendZohoMailTest(userId, body = {}) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const integrationId = String(body?.integrationId || "").trim();
  let doc = null;
  if (integrationId && mongoose.Types.ObjectId.isValid(integrationId)) {
    doc = await UserIntegration.findOne({
      _id: integrationId,
      userId: userOid,
      provider: "zoho_mail",
    }).lean();
  } else {
    doc = await UserIntegration.findOne({
      userId: userOid,
      provider: "zoho_mail",
      isDefaultEmail: true,
    }).lean();
    if (!doc) {
      doc = await UserIntegration.findOne({ userId: userOid, provider: "zoho_mail" }).lean();
    }
  }

  if (!doc) {
    const err = new Error("Zoho Mail is not connected. Connect Zoho Mail under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  const to = String(body?.to || doc.email || "").trim();
  if (!to.includes("@")) {
    const err = new Error(
      "No recipient for test email. Reconnect Zoho Mail so Huntlo can use your inbox address."
    );
    err.statusCode = 400;
    throw err;
  }

  const result = await sendZohoMailMessage(
    userId,
    {
      to,
      subject: "Huntlo — Zoho Mail connection test",
      body:
        "This is a test email from Huntlo.\n\nIf you received this, your Zoho Mail integration is working and ready for candidate outreach.",
    },
    { integrationId: doc._id }
  );

  return {
    to: result.to || to,
    fromEmail: result.fromEmail || doc.email || "",
    messageId: result.messageId || "",
  };
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

async function listCalendlyEventTypesForUser(userId) {
  const creds = await getCalendlyCredentialsForUser(userId);
  const user = await fetchCalendlyUser(creds.personalAccessToken);
  const meetings = await fetchCalendlyEventTypes(creds.personalAccessToken, user.uri);
  return {
    meetings,
    user: {
      name: user.name || "",
      email: user.email || "",
      schedulingUrl: user.schedulingUrl || "",
    },
  };
}

/**
 * Meta Cloud API credentials for outbound WhatsApp (used by send service).
 */
async function getMetaCredentialsForUser(userId) {
  const platformChannel = await getActiveMessagingChannel();
  if (platformChannel === "gupshup") {
    const err = new Error(
      "Platform WhatsApp is configured for Gupshup, not Meta. Reconnect under Integrations."
    );
    err.statusCode = 400;
    throw err;
  }

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

  const waProvider = resolveWhatsappProvider(doc, platformChannel);
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
  connectOutlookOAuth,
  getOutlookOAuthAuthorizePayload,
  getOutlookStatus,
  sendOutlookTest,
  connectZohoMail,
  connectZohoMailSmtp,
  connectZohoMailOAuth,
  verifyZohoMailIntegrationCredentials,
  getZohoMailOAuthAuthorizePayload,
  getZohoMailStatus,
  sendZohoMailTest,
  connectWhatsApp,
  connectWhatsAppMeta,
  connectWhatsAppHuntlo,
  connectWhatsAppGupshup,
  verifyGupshupWhatsAppCredentials,
  verifyWhatsAppIntegrationCredentials,
  connectCalendly,
  verifyCalendlyCredentials,
  getGmailStatus,
  getWhatsAppStatus,
  getWhatsAppMetaWebhookSetup,
  getCalendlyStatus,
  getCalendlyMeetingLinks,
  listCalendlyEventTypesForUser,
  getMetaCredentialsForUser,
  getCalendlyCredentialsForUser,
  listUserIntegrations,
  disconnectGmail,
  disconnectOutlook,
  disconnectZohoMail,
  connectCustomMail,
  verifyCustomMailIntegrationCredentials,
  getCustomMailStatus,
  sendCustomMailTest,
  disconnectCustomMail,
  disconnectIntegrationById,
  setDefaultEmailIntegration,
  disconnectWhatsApp,
  disconnectCalendly,
  disconnectIntegration,
  resolveWhatsappProvider,
};
