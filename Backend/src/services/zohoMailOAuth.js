const {
  getZohoDcConfig,
  getZohoOAuthConfig,
  getZohoOAuthRedirectUri,
  normalizeDataCenter,
} = require("./zohoMailConfig");

function resolveZohoTokenUrl(dataCenter, accountsServer) {
  const server = String(accountsServer || "").trim();
  if (server) {
    const base = server.replace(/\/$/, "");
    return `${base}/oauth/v2/token`;
  }
  const dc = getZohoDcConfig(dataCenter);
  return `https://${dc.accountsHost}/oauth/v2/token`;
}

function zohoOAuthErrorMessage(data) {
  const code = typeof data?.error === "string" ? data.error : "";
  const description =
    typeof data?.error_description === "string" ? data.error_description : "";

  if (code === "invalid_code") {
    return (
      "Zoho authorization code is invalid or already used. Start connect again from Integrations " +
      "(do not refresh the callback page)."
    );
  }
  if (description) return description;
  if (code) return code;
  return "Zoho token exchange failed";
}

async function exchangeAuthCodeForTokens(code, dataCenter, accountsServer) {
  const config = getZohoOAuthConfig();
  const redirectUri = getZohoOAuthRedirectUri();
  if (!config) {
    const err = new Error(
      "Zoho OAuth is not configured. Set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in Backend/.env."
    );
    err.statusCode = 503;
    throw err;
  }
  if (!redirectUri) {
    const err = new Error(
      "Zoho OAuth redirect URI is not configured. Set ZOHO_OAUTH_REDIRECT_URI or FRONTEND_URL."
    );
    err.statusCode = 503;
    throw err;
  }

  const body = new URLSearchParams({
    code: String(code),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenUrl = resolveZohoTokenUrl(dataCenter, accountsServer);
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const err = new Error(zohoOAuthErrorMessage(data));
    err.statusCode = 400;
    err.zohoError = data;
    throw err;
  }

  const resolvedDc =
    inferDataCenterFromApiDomain(data.api_domain) || normalizeDataCenter(dataCenter);

  return { ...data, dataCenter: resolvedDc };
}

function inferDataCenterFromApiDomain(apiDomain) {
  const host = String(apiDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");
  if (!host) return "";
  if (host.includes(".zohoapis.in") || host.endsWith(".zoho.in")) return "in";
  if (host.includes(".zohoapis.eu") || host.endsWith(".zoho.eu")) return "eu";
  if (host.includes(".zohoapis.com.au") || host.endsWith(".zoho.com.au")) return "com.au";
  if (host.includes(".zohoapis.jp") || host.endsWith(".zoho.jp")) return "jp";
  if (host.includes("zohocloud.ca")) return "ca";
  if (host.includes(".zoho.sa")) return "sa";
  return "com";
}

async function refreshAccessToken(refreshToken, dataCenter) {
  const config = getZohoOAuthConfig();
  const redirectUri = getZohoOAuthRedirectUri();
  if (!config) {
    throw new Error("Zoho OAuth is not configured.");
  }

  const dc = getZohoDcConfig(dataCenter);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: String(refreshToken),
    redirect_uri: redirectUri,
    grant_type: "refresh_token",
  });

  const res = await fetch(`https://${dc.accountsHost}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : typeof data.error_description === "string"
          ? data.error_description
          : "Zoho token refresh failed";
    throw new Error(msg);
  }
  return data;
}

module.exports = {
  exchangeAuthCodeForTokens,
  refreshAccessToken,
  inferDataCenterFromApiDomain,
};
