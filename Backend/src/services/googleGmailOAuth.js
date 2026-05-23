const dotenv = require("dotenv");
dotenv.config();

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/** @react-oauth/google auth-code popup uses this redirect_uri */
const AUTH_CODE_REDIRECT_URI = "postmessage";

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function exchangeAuthCodeForTokens(code) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env."
    );
  }
  const body = new URLSearchParams({
    code: String(code),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: AUTH_CODE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
          ? data.error
          : "Token exchange failed";
    throw new Error(msg);
  }
  return data;
}

async function fetchGoogleEmail(accessToken) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Could not load Google account email");
  return typeof data.email === "string" ? data.email.trim() : "";
}

async function refreshAccessToken(refreshToken) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured.");
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: String(refreshToken),
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
          ? data.error
          : "Token refresh failed";
    throw new Error(msg);
  }
  return data;
}

module.exports = {
  exchangeAuthCodeForTokens,
  fetchGoogleEmail,
  getGoogleOAuthConfig,
  refreshAccessToken,
};
