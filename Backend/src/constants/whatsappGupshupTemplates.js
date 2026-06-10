const { buildReplacementMap } = require("../services/outreachMergeService");
const {
  getWhatsAppMetaTemplateBodyFields,
  resolveMetaTemplateName,
} = require("./whatsappMetaTemplates");

/** Huntlo template id → Gupshup-approved template id (override via env). */
const GUPSHUP_TEMPLATE_ID_ENV_KEYS = {
  profile_review_reminder_v1: "GUPSHUP_TEMPLATE_PROFILE_REVIEW_REMINDER_V1",
  role_alignment_review: "GUPSHUP_TEMPLATE_ROLE_ALIGNMENT_REVIEW",
  recruitment_update_reminder_v1: "GUPSHUP_TEMPLATE_RECRUITMENT_UPDATE_REMINDER_V1",
  final_profile_follow_up_v1: "GUPSHUP_TEMPLATE_FINAL_PROFILE_FOLLOW_UP_V1",
  profile_review_closure_v1: "GUPSHUP_TEMPLATE_PROFILE_REVIEW_CLOSURE_V1",
};

function resolveGupshupTemplateId(templateId) {
  const metaName = resolveMetaTemplateName(templateId);
  if (!metaName) return "";
  const envKey = GUPSHUP_TEMPLATE_ID_ENV_KEYS[metaName];
  const fromEnv = envKey ? String(process.env[envKey] || "").trim() : "";
  if (fromEnv) return fromEnv;
  return metaName;
}

function buildGupshupTemplateParams(templateId, { contact, senderFirstName } = {}) {
  const metaName = resolveMetaTemplateName(templateId);
  const fieldKeys = getWhatsAppMetaTemplateBodyFields(metaName);
  if (!fieldKeys?.length) return [];

  const replacements = buildReplacementMap(contact, senderFirstName);
  return fieldKeys.map((key) => {
    const normalized = String(key || "").replace(/\s+/g, "");
    let value = "";
    if (Object.prototype.hasOwnProperty.call(replacements, normalized)) {
      value = replacements[normalized];
    } else {
      const lower = normalized.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(replacements, lower)) {
        value = replacements[lower];
      }
    }
    return String(value ?? "").trim() || "—";
  });
}

module.exports = {
  resolveGupshupTemplateId,
  buildGupshupTemplateParams,
};
