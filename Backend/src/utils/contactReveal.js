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

/**
 * Canonical LinkedIn profile URL for DB keys. Host is normalized; slug case is preserved
 * (member IDs like ACoAA… are case-sensitive for Future Jobs).
 */
function normalizeLinkedinProfileUrl(url) {
  let s = String(url || "").trim();
  if (!s) return "";

  try {
    if (!/^https?:\/\//i.test(s)) {
      s = `https://${s}`;
    }
    const parsed = new URL(s);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "linkedin.com") {
      const path = parsed.pathname.replace(/\/+$/, "");
      const inMatch = path.match(/^\/in\/([^/]+)/i);
      if (inMatch && inMatch[1]) {
        const slug = decodeURIComponent(inMatch[1]).replace(/\/+$/, "");
        if (slug) {
          return `https://www.linkedin.com/in/${slug}`;
        }
      }
      return `https://www.linkedin.com${path || ""}`.replace(/\/+$/, "");
    }
    return s.replace(/\/+$/, "");
  } catch {
    return s.replace(/\/+$/, "");
  }
}

/** Lowercase slug variant for legacy cache rows written before case was preserved. */
function lowercaseLinkedinProfileUrl(url) {
  const canonical = normalizeLinkedinProfileUrl(url);
  if (!canonical) return "";
  return canonical.replace(
    /^(https:\/\/www\.linkedin\.com\/in\/)([^/]+)/i,
    (_, prefix, slug) => `${prefix}${slug.toLowerCase()}`
  );
}

/** Keys to try when loading cache (canonical first, then legacy lowercase). */
function linkedinCacheLookupKeys(url) {
  const canonical = normalizeLinkedinProfileUrl(url);
  if (!canonical) return [];
  const lower = lowercaseLinkedinProfileUrl(canonical);
  return lower && lower !== canonical ? [canonical, lower] : [canonical];
}

module.exports = {
  looksValidContact,
  extractRevealValues,
  normalizeLinkedinProfileUrl,
  lowercaseLinkedinProfileUrl,
  linkedinCacheLookupKeys,
};
