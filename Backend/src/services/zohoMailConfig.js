const dotenv = require("dotenv");

dotenv.config();

/** @typedef {"com" | "eu" | "in" | "com.au" | "jp" | "ca" | "sa"} ZohoDataCenter */

const ZOHO_DC_CONFIG = {
  com: {
    accountsHost: "accounts.zoho.com",
    mailApiHost: "mail.zoho.com",
    smtpHost: "smtp.zoho.com",
    imapHost: "imap.zoho.com",
  },
  eu: {
    accountsHost: "accounts.zoho.eu",
    mailApiHost: "mail.zoho.eu",
    smtpHost: "smtp.zoho.eu",
    imapHost: "imap.zoho.eu",
  },
  in: {
    accountsHost: "accounts.zoho.in",
    mailApiHost: "mail.zoho.in",
    smtpHost: "smtp.zoho.in",
    imapHost: "imap.zoho.in",
  },
  "com.au": {
    accountsHost: "accounts.zoho.com.au",
    mailApiHost: "mail.zoho.com.au",
    smtpHost: "smtp.zoho.com.au",
    imapHost: "imap.zoho.com.au",
  },
  jp: {
    accountsHost: "accounts.zoho.jp",
    mailApiHost: "mail.zoho.jp",
    smtpHost: "smtp.zoho.jp",
    imapHost: "imap.zoho.jp",
  },
  ca: {
    accountsHost: "accounts.zohocloud.ca",
    mailApiHost: "mail.zohocloud.ca",
    smtpHost: "smtp.zohocloud.ca",
    imapHost: "imap.zohocloud.ca",
  },
  sa: {
    accountsHost: "accounts.zoho.sa",
    mailApiHost: "mail.zoho.sa",
    smtpHost: "smtp.zoho.sa",
    imapHost: "imap.zoho.sa",
  },
};

const ZOHO_MAIL_SCOPES = [
  "ZohoMail.messages.CREATE",
  "ZohoMail.messages.READ",
  "ZohoMail.accounts.READ",
  "ZohoMail.folders.READ",
];

function normalizeDataCenter(value) {
  const raw = String(value || "com").trim().toLowerCase();
  if (raw === "us" || raw === "com") return "com";
  if (raw === "au") return "com.au";
  if (raw in ZOHO_DC_CONFIG) return raw;
  return "com";
}

/** Map Zoho OAuth callback `location` query param to our data center id. */
function dataCenterFromZohoLocation(location) {
  const raw = String(location || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "au") return "com.au";
  if (raw in ZOHO_DC_CONFIG) return raw;
  if (raw === "us") return "com";
  return "";
}

function getZohoDcConfig(dataCenter) {
  return ZOHO_DC_CONFIG[normalizeDataCenter(dataCenter)];
}

function getZohoOAuthConfig() {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function getZohoOAuthRedirectUri() {
  const fromEnv = process.env.ZOHO_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  const frontend = process.env.FRONTEND_URL?.trim();
  if (frontend) return `${frontend.replace(/\/$/, "")}/integrations/zoho/callback`;
  return "";
}

function buildZohoOAuthAuthorizeUrl({ dataCenter, state }) {
  const config = getZohoOAuthConfig();
  const redirectUri = getZohoOAuthRedirectUri();
  if (!config || !redirectUri) return null;

  const dc = getZohoDcConfig(dataCenter);
  const params = new URLSearchParams({
    scope: ZOHO_MAIL_SCOPES.join(","),
    client_id: config.clientId,
    response_type: "code",
    access_type: "offline",
    redirect_uri: redirectUri,
    prompt: "consent",
  });
  if (state) params.set("state", state);

  return `https://${dc.accountsHost}/oauth/v2/auth?${params.toString()}`;
}

module.exports = {
  ZOHO_MAIL_SCOPES,
  ZOHO_DC_CONFIG,
  normalizeDataCenter,
  dataCenterFromZohoLocation,
  getZohoDcConfig,
  getZohoOAuthConfig,
  getZohoOAuthRedirectUri,
  buildZohoOAuthAuthorizeUrl,
};
