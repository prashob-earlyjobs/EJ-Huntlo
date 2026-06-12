const {
  getOutlookOAuthConfig,
  getOutlookOAuthRedirectUri,
  getOutlookOAuthEndpoints,
  getOutlookTenantId,
} = require("./outlookMailConfig");

function outlookOAuthErrorMessage(data) {
  const code = typeof data?.error === "string" ? data.error : "";
  const description =
    typeof data?.error_description === "string" ? data.error_description : "";

  if (code === "invalid_grant") {
    return (
      "Microsoft authorization code is invalid or already used. Start connect again from Integrations " +
      "(do not refresh the callback page)."
    );
  }
  if (description) return description;
  if (code) return code;
  return "Microsoft token exchange failed";
}

async function exchangeAuthCodeForTokens(code, tenantId) {
  const config = getOutlookOAuthConfig();
  const redirectUri = getOutlookOAuthRedirectUri();
  if (!config) {
    const err = new Error(
      "Microsoft OAuth is not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in Backend/.env."
    );
    err.statusCode = 503;
    throw err;
  }
  if (!redirectUri) {
    const err = new Error(
      "Microsoft OAuth redirect URI is not configured. Set MICROSOFT_OAUTH_REDIRECT_URI or FRONTEND_URL."
    );
    err.statusCode = 503;
    throw err;
  }

  const { tokenUrl } = getOutlookOAuthEndpoints(tenantId || getOutlookTenantId());
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: String(code),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const err = new Error(outlookOAuthErrorMessage(data));
    err.statusCode = 400;
    err.microsoftError = data;
    throw err;
  }

  return data;
}

async function refreshAccessToken(refreshToken, tenantId) {
  const config = getOutlookOAuthConfig();
  if (!config) {
    throw new Error("Microsoft OAuth is not configured.");
  }

  const { tokenUrl } = getOutlookOAuthEndpoints(tenantId || getOutlookTenantId());
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: String(refreshToken),
    grant_type: "refresh_token",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const msg =
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
          ? data.error
          : "Microsoft token refresh failed";
    throw new Error(msg);
  }
  return data;
}

async function fetchMicrosoftProfile(accessToken) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : "Failed to load Microsoft profile";
    throw new Error(msg);
  }
  return data;
}

module.exports = {
  exchangeAuthCodeForTokens,
  refreshAccessToken,
  fetchMicrosoftProfile,
};
