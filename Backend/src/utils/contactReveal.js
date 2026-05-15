/**
 * Shared helpers for sourcing-session and People Scout contact reveal flows.
 */

function looksValidContact(value, revealType) {
  const s = String(value || "").trim();
  if (!s || s === "[object Object]") return false;
  if (revealType === "EMAIL") return s.includes("@");
  const digits = s.replace(/\D/g, "");
  return digits.length >= 7;
}

function collectStringsFromUnknown(input, out) {
  if (input == null) return;
  if (typeof input === "string" || typeof input === "number") {
    out.push(String(input));
    return;
  }
  if (Array.isArray(input)) {
    for (const v of input) collectStringsFromUnknown(v, out);
    return;
  }
  if (typeof input === "object") {
    const obj = input;
    const keys = [
      "value",
      "values",
      "email",
      "emails",
      "phone",
      "phones",
      "mobile",
      "mobile_phone",
      "number",
      "numbers",
      "contact",
    ];
    for (const k of keys) {
      if (k in obj) collectStringsFromUnknown(obj[k], out);
    }
  }
}

function extractRevealValues(fj, revealType) {
  const raw = [];

  // Future Jobs POST /wl/scout-people/reveal-contacts:
  // { data: { revealStatus: { email: { values: [] }, phone: { values: [] } } } }
  const rs = fj?.data?.revealStatus;
  if (rs && typeof rs === "object") {
    const channel = revealType === "EMAIL" ? rs.email : rs.phone;
    if (channel && typeof channel === "object" && Array.isArray(channel.values)) {
      collectStringsFromUnknown(channel.values, raw);
    }
  }

  if (Array.isArray(fj?.data?.values) && fj.data.values.length > 0) {
    collectStringsFromUnknown(fj.data.values, raw);
  } else if (Array.isArray(fj?.data) && fj.data.length > 0) {
    const match = fj.data.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        String(entry.type || "").toUpperCase() === revealType
    );
    if (match) {
      if (Array.isArray(match.values) && match.values.length > 0) {
        collectStringsFromUnknown(match.values, raw);
      } else {
        collectStringsFromUnknown(match, raw);
      }
    }
  } else if (fj?.data?.value != null) {
    collectStringsFromUnknown(fj.data.value, raw);
  } else if (fj?.data && typeof fj.data === "object" && !Array.isArray(fj.data)) {
    collectStringsFromUnknown(fj.data, raw);
  }

  const deduped = [];
  const seen = new Set();
  for (const v of raw.map((x) => String(x).trim())) {
    if (!looksValidContact(v, revealType)) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    deduped.push(v);
  }
  return deduped;
}

/** Trim for DB keys and comparison */
function normalizeLinkedinProfileUrl(url) {
  return String(url || "").trim();
}

module.exports = {
  looksValidContact,
  extractRevealValues,
  normalizeLinkedinProfileUrl,
};
