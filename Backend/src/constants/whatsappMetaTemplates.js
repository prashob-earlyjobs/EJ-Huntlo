/**
 * Body variable order for approved Meta templates ({{1}}, {{2}}, …).
 * Keys match outreachMergeService replacement map (FirstName, JobTitle, …).
 */
const WHATSAPP_META_TEMPLATE_BODY_FIELDS = {
  profile_review_reminder_v1: ["FirstName", "JobTitle"],
  role_alignment_review: ["FirstName", "JobTitle"],
  recruitment_update_reminder_v1: ["FirstName", "JobTitle"],
  final_profile_follow_up_v1: ["FirstName", "JobTitle"],
  profile_review_closure_v1: ["FirstName", "JobTitle"],
};

/** Legacy Huntlo ids → approved Meta template names */
const META_TEMPLATE_NAME_ALIASES = {
  professional_intro: "profile_review_reminder_v1",
  opening_message_01: "profile_review_reminder_v1",
  role_opportunity: "role_alignment_review",
  no_reply_1_bump: "profile_review_reminder_v1",
  no_reply_1_value: "recruitment_update_reminder_v1",
  no_reply_2_final: "final_profile_follow_up_v1",
  no_reply_2_door_open: "profile_review_closure_v1",
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
