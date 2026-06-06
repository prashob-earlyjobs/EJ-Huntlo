/**
 * Body variable order for approved Meta templates ({{1}}, {{2}}, …).
 * Keys match outreachMergeService replacement map (FirstName, JobTitle, …).
 */
const WHATSAPP_META_TEMPLATE_BODY_FIELDS = {
  opening_message_01: ["FirstName", "JobTitle"],
  /** @deprecated Saved plans may still reference the old Huntlo id */
  professional_intro: ["FirstName", "JobTitle"],
  role_opportunity: ["FirstName", "JobTitle"],
  no_reply_1_bump: ["FirstName", "JobTitle"],
  no_reply_1_value: ["FirstName", "JobTitle", "CurrentCompany"],
  no_reply_2_final: ["FirstName"],
  no_reply_2_door_open: ["FirstName", "JobTitle"],
};

/** Legacy Huntlo ids → approved Meta template names */
const META_TEMPLATE_NAME_ALIASES = {
  professional_intro: "opening_message_01",
};

function resolveMetaTemplateName(templateId) {
  const key = String(templateId || "").trim();
  if (!key) return "";
  return META_TEMPLATE_NAME_ALIASES[key] || key;
}

function getWhatsAppMetaTemplateBodyFields(templateName) {
  const key = resolveMetaTemplateName(templateName);
  return WHATSAPP_META_TEMPLATE_BODY_FIELDS[key] || null;
}

module.exports = {
  WHATSAPP_META_TEMPLATE_BODY_FIELDS,
  META_TEMPLATE_NAME_ALIASES,
  resolveMetaTemplateName,
  getWhatsAppMetaTemplateBodyFields,
};
