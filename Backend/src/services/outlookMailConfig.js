const dotenv = require("dotenv");

dotenv.config();

const OUTLOOK_MAIL_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Send",
  "Mail.Read",
];

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

function getOutlookOAuthConfig() {
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function getOutlookTenantId() {
  const tenant = String(process.env.MICROSOFT_TENANT_ID || "common").trim();
  return tenant || "common";
}

function getOutlookOAuthRedirectUri() {
  const explicit = String(process.env.MICROSOFT_OAUTH_REDIRECT_URI || "").trim();
  if (explicit) return explicit;
  const frontend = String(process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  if (!frontend) return "";
  return `${frontend}/integrations/outlook/callback`;
}

function getOutlookOAuthEndpoints(tenantId) {
  const tenant = String(tenantId || getOutlookTenantId()).trim() || "common";
  const base = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0`;
  return {
    authorizeUrl: `${base}/authorize`,
    tokenUrl: `${base}/token`,
    tenant,
  };
}

function buildOutlookOAuthAuthorizeUrl({ state } = {}) {
  const config = getOutlookOAuthConfig();
  const redirectUri = getOutlookOAuthRedirectUri();
  if (!config || !redirectUri) return "";

  const { authorizeUrl } = getOutlookOAuthEndpoints();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: OUTLOOK_MAIL_SCOPES.join(" "),
    prompt: "consent",
  });
  if (state) params.set("state", String(state));

  return `${authorizeUrl}?${params.toString()}`;
}

module.exports = {
  OUTLOOK_MAIL_SCOPES,
  GRAPH_API_BASE,
  getOutlookOAuthConfig,
  getOutlookTenantId,
  getOutlookOAuthRedirectUri,
  getOutlookOAuthEndpoints,
  buildOutlookOAuthAuthorizeUrl,
};
