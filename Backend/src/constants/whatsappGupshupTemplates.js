const { buildReplacementMap } = require("../services/outreachMergeService");
const {
  getWhatsAppMetaTemplateBodyFields,
  resolveMetaTemplateName,
} = require("./whatsappMetaTemplates");

/** Huntlo template id → Gupshup-approved template id (override via env). */
const GUPSHUP_TEMPLATE_ID_ENV_KEYS = {
  opening_message_01: "GUPSHUP_TEMPLATE_OPENING_MESSAGE_01",
  role_opportunity: "GUPSHUP_TEMPLATE_ROLE_OPPORTUNITY",
  no_reply_1_bump: "GUPSHUP_TEMPLATE_NO_REPLY_1_BUMP",
  no_reply_1_value: "GUPSHUP_TEMPLATE_NO_REPLY_1_VALUE",
  no_reply_2_final: "GUPSHUP_TEMPLATE_NO_REPLY_2_FINAL",
  no_reply_2_door_open: "GUPSHUP_TEMPLATE_NO_REPLY_2_DOOR_OPEN",
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
