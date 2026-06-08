const E164_RE = /^\+[1-9]\d{7,14}$/;

function defaultCountryCallingCode() {
  const raw = String(process.env.DEFAULT_PHONE_COUNTRY_CODE || "91").trim().replace(/\D/g, "");
  return raw || "91";
}

/**
 * Normalize to E.164 (+country...) for validation and Meta API.
 * 10-digit numbers without + get DEFAULT_PHONE_COUNTRY_CODE (default 91).
 */
function normalizeToE164(phone) {
  const raw = String(phone || "").trim().replace(/[\s\-().]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) {
    return E164_RE.test(raw) ? raw : "";
  }
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) return `+${defaultCountryCallingCode()}${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}

/** Digits only (no +) for Meta Cloud API `to` field. */
function normalizeToWhatsAppDigits(phone) {
  const e164 = normalizeToE164(phone);
  if (!e164) {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits || "";
  }
  return e164.replace(/\D/g, "");
}

function assertValidRecipientPhone(phone) {
  const e164 = normalizeToE164(phone);
  if (!e164) {
    const err = new Error("Contact phone is missing or not a valid E.164 number.");
    err.statusCode = 400;
    throw err;
  }
  return e164;
}

module.exports = {
  E164_RE,
  normalizeToE164,
  normalizeToWhatsAppDigits,
  /** @deprecated alias — Meta `to` field uses digits only */
  normalizeToMetaRecipient: normalizeToWhatsAppDigits,
  assertValidRecipientPhone,
};
