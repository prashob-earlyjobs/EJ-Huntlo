function firstNameFromFullName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
}

/** `{{token}}` or `{{token|fallback if empty}}` */
const MERGE_TAG_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;

function buildReplacementMap(contact, senderFirstName, options = {}) {
  const firstName = firstNameFromFullName(contact?.name);
  const email = String(contact?.email || "").trim();
  const phone = String(contact?.phone || "").trim();
  const company = String(contact?.company || "").trim();
  const candidateRole = String(contact?.role || "").trim();
  const openRoleTitle = String(options.openRoleTitle || "").trim();
  const jobTitle = openRoleTitle || candidateRole;
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

function resolveCampaignOpenRoleTitle(campaign) {
  const jobTitle = String(campaign?.jobTitle || "").trim();
  if (jobTitle) return jobTitle;
  const name = String(campaign?.name || "").trim();
  if (name) return name;
  const jd = String(campaign?.jobDescription || "").trim();
  if (!jd) return "";
  const firstLine = jd
    .split(/\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine && firstLine.length <= 160 ? firstLine : "";
}

function applyNumericMetaPlaceholders(text, templateName, replacements) {
  const { getWhatsAppMetaTemplateBodyFields, resolveMetaTemplateName } = require("../constants/whatsappMetaTemplates");
  const fieldKeys = getWhatsAppMetaTemplateBodyFields(resolveMetaTemplateName(templateName));
  if (!fieldKeys?.length) return text;

  let merged = String(text || "");
  fieldKeys.forEach((key, index) => {
    const value =
      String(lookupReplacementValue(key, replacements) ?? "").trim() || "—";
    const num = index + 1;
    merged = merged.replace(new RegExp(`\\{\\{\\s*${num}\\s*\\}\\}`, "g"), value);
  });
  return merged;
}

function buildWhatsAppReplacementMap(contact, senderFirstName, campaign) {
  return buildReplacementMap(contact, senderFirstName, {
    openRoleTitle: resolveCampaignOpenRoleTitle(campaign),
  });
}

/**
 * WhatsApp sequence merge: open role from campaign; supports Meta numeric {{1}} placeholders.
 */
function applyWhatsAppMergeFields(
  text,
  { contact, senderFirstName = "", campaign, templateId = "" } = {}
) {
  const raw = String(text || "");
  if (!raw) return raw;

  const replacements = buildWhatsAppReplacementMap(contact, senderFirstName, campaign);

  let merged = raw.replace(MERGE_TAG_RE, (match, key, fallback) => {
    const resolved = resolveMergeToken(key, fallback, replacements);
    if (resolved === null) return match;
    return resolved;
  });

  if (templateId) {
    merged = applyNumericMetaPlaceholders(merged, templateId, replacements);
  }

  return sanitizeMergedOutreachText(merged);
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
  applyWhatsAppMergeFields,
  applyNumericMetaPlaceholders,
  buildWhatsAppReplacementMap,
  resolveCampaignOpenRoleTitle,
  firstNameFromFullName,
  buildReplacementMap,
  sanitizeMergedOutreachText,
};
