function firstNameFromFullName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
}

/** `{{token}}` or `{{token|fallback if empty}}` */
const MERGE_TAG_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;

function buildReplacementMap(contact, senderFirstName) {
  const firstName = firstNameFromFullName(contact?.name);
  const email = String(contact?.email || "").trim();
  const phone = String(contact?.phone || "").trim();
  const company = String(contact?.company || "").trim();
  const jobTitle = String(contact?.role || "").trim();
  const sender = String(senderFirstName || "").trim();

  return {
    candidate_name: firstName,
    candidatename: firstName,
    firstname: firstName,
    name: firstName,
    candidate_email: email,
    candidateemail: email,
    email,
    candidate_phone: phone,
    candidatephone: phone,
    phone,
    currentcompany: company,
    company,
    jobtitle: jobTitle,
    role: jobTitle,
    senderfirstname: sender,
    FirstName: firstName,
    CurrentCompany: company,
    JobTitle: jobTitle,
    SenderFirstName: sender,
  };
}

function lookupReplacementValue(key, replacements) {
  const normalized = String(key || "").replace(/\s+/g, "");
  if (!normalized) return undefined;
  if (Object.prototype.hasOwnProperty.call(replacements, normalized)) {
    return replacements[normalized];
  }
  const lower = normalized.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(replacements, lower)) {
    return replacements[lower];
  }
  return undefined;
}

function resolveMergeToken(key, fallback, replacements) {
  if (!Object.prototype.hasOwnProperty.call(replacements, key) &&
      lookupReplacementValue(key, replacements) === undefined) {
    return null;
  }
  const value = String(lookupReplacementValue(key, replacements) ?? "").trim();
  if (value) return value;
  if (fallback !== undefined && fallback !== null) {
    return String(fallback).trim();
  }
  return "";
}

/**
 * Light cleanup after merge so empty fields do not leave awkward gaps.
 */
function sanitizeMergedOutreachText(text) {
  return String(text || "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

/**
 * Replace merge tokens in subject/body.
 * Candidate tokens: FirstName, CurrentCompany (employer today), JobTitle (title today), candidate_email, candidate_phone.
 * Sender: SenderFirstName.
 * JobTitle/CurrentCompany are NOT the open role — that comes from the campaign job description.
 * Fallback: {{candidate_name|there}} uses "there" when the field is empty.
 */
function applyMergeFields(text, { contact, senderFirstName = "" }) {
  const raw = String(text || "");
  if (!raw) return raw;

  const replacements = buildReplacementMap(contact, senderFirstName);

  const merged = raw.replace(MERGE_TAG_RE, (match, key, fallback) => {
    const resolved = resolveMergeToken(key, fallback, replacements);
    if (resolved === null) return match;
    return resolved;
  });

  return sanitizeMergedOutreachText(merged);
}

module.exports = {
  applyMergeFields,
  firstNameFromFullName,
  buildReplacementMap,
  sanitizeMergedOutreachText,
};
