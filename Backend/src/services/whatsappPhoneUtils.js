const E164_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Normalize to E.164 (+country...) for validation and Meta API.
 */
function normalizeToE164(phone) {
  const raw = String(phone || "").trim().replace(/[\s\-().]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) {
    return E164_RE.test(raw) ? raw : "";
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
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
