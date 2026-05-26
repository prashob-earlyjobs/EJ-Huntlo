const { getMetaGraphBaseUrl } = require("./metaWhatsAppConfig");

const PHONE_NUMBER_ID_RE = /^\d{8,20}$/;

function normalizePhoneNumberId(value) {
  return String(value || "").trim().replace(/\s/g, "");
}

function normalizeAccessToken(value) {
  return String(value || "").trim();
}

function normalizeWabaId(value) {
  const trimmed = String(value || "").trim().replace(/\s/g, "");
  return trimmed || "";
}

function parseGraphError(payload, status) {
  const err = payload?.error;
  if (err?.message) return String(err.message);
  if (err?.error_user_msg) return String(err.error_user_msg);
  if (status === 401) return "Invalid Meta access token.";
  if (status === 404) return "Phone number ID not found. Check your Meta WhatsApp Phone Number ID.";
  return "Meta API request failed.";
}

/**
 * Verify Meta Cloud API credentials by loading the phone number resource.
 */
async function verifyMetaWhatsAppCredentials(body) {
  const phoneNumberId = normalizePhoneNumberId(body?.phoneNumberId || body?.metaPhoneNumberId);
  const accessToken = normalizeAccessToken(body?.accessToken || body?.metaAccessToken);
  const wabaId = normalizeWabaId(body?.wabaId || body?.metaWabaId);

  if (!phoneNumberId) {
    const err = new Error("WhatsApp Phone Number ID is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!PHONE_NUMBER_ID_RE.test(phoneNumberId)) {
    const err = new Error("Phone Number ID must be numeric (from Meta Business Manager).");
    err.statusCode = 400;
    throw err;
  }
  if (!accessToken) {
    const err = new Error("Meta access token is required.");
    err.statusCode = 400;
    throw err;
  }
  if (accessToken.length < 20) {
    const err = new Error("Meta access token looks too short.");
    err.statusCode = 400;
    throw err;
  }

  const info = await fetchMetaPhoneNumber(phoneNumberId, accessToken);

  if (wabaId) {
    await assertWabaAccessible(wabaId, accessToken);
  }

  const displayPhone = info.display_phone_number || "";
  const verifiedName = info.verified_name || "";

  return {
    verified: true,
    mode: "meta",
    message: verifiedName
      ? `Connected to ${verifiedName}${displayPhone ? ` (${displayPhone})` : ""}.`
      : displayPhone
        ? `Connected to WhatsApp number ${displayPhone}.`
        : "Meta WhatsApp credentials verified.",
    phoneNumber: {
      id: phoneNumberId,
      displayPhoneNumber: displayPhone,
      verifiedName,
      wabaId: wabaId || "",
    },
  };
}

async function fetchMetaPhoneNumber(phoneNumberId, accessToken) {
  const base = getMetaGraphBaseUrl();
  const params = new URLSearchParams({
    fields: "display_phone_number,verified_name,quality_rating",
  });
  const url = `${base}/${encodeURIComponent(phoneNumberId)}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const err = new Error(parseGraphError(payload, res.status));
      err.statusCode = res.status === 401 || res.status === 403 ? 400 : res.status >= 500 ? 502 : 400;
      throw err;
    }

    if (!payload?.id) {
      const err = new Error("Unexpected response from Meta API.");
      err.statusCode = 502;
      throw err;
    }

    return payload;
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.name === "AbortError") {
      const err = new Error("Meta API timed out. Try again.");
      err.statusCode = 504;
      throw err;
    }
    const err = new Error(error.message || "Could not reach Meta API.");
    err.statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function assertWabaAccessible(wabaId, accessToken) {
  const base = getMetaGraphBaseUrl();
  const url = `${base}/${encodeURIComponent(wabaId)}?fields=id,name`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const err = new Error(
        parseGraphError(payload, res.status) +
          " Check your WhatsApp Business Account ID or token permissions."
      );
      err.statusCode = 400;
      throw err;
    }
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.name === "AbortError") return;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  PHONE_NUMBER_ID_RE,
  normalizePhoneNumberId,
  normalizeAccessToken,
  normalizeWabaId,
  verifyMetaWhatsAppCredentials,
  fetchMetaPhoneNumber,
};
