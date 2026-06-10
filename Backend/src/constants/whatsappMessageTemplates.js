/**
 * Approved WhatsApp message templates — same catalog as Frontend scratch flow
 * (Frontend/src/lib/whatsappOutreach.ts). AI generate picks ids from these lists;
 * bodies are never AI-authored for steps 1–3.
 */

const WHATSAPP_OPENING_TEMPLATES = [
  {
    id: "profile_review_reminder_v1",
    name: "Profile review reminder",
    body: `Hi {{1}},

This is a follow-up regarding the profile review communication shared earlier for the {{2}} requirement.

If you would like to receive additional information regarding the recruitment process and next steps, please reply to this message.

Thank you.`,
  },
  {
    id: "role_alignment_review",
    name: "Role alignment review",
    body: `Hi {{1}},

During our recruitment review process, your professional experience was identified as relevant to a current requirement for a {{2}} role.

If you would like to receive more information regarding the opportunity and process, please reply to this message.

Thank you.`,
  },
];

const WHATSAPP_NO_REPLY_TEMPLATES = {
  1: [
    {
      id: "profile_review_reminder_v1",
      name: "Profile review reminder",
      body: `Hi {{1}},

This is a follow-up regarding the profile review communication shared earlier for the {{2}} requirement.

If you would like to receive additional information regarding the recruitment process and next steps, please reply to this message.

Thank you.`,
    },
    {
      id: "recruitment_update_reminder_v1",
      name: "Recruitment update reminder",
      body: `Hi {{1}},

We are following up regarding the previous communication about the review of your profile for the {{2}} requirement.

If you would like further information or wish to continue the recruitment process, please reply to this message.

Thank you for your time.`,
    },
  ],
  2: [
    {
      id: "final_profile_follow_up_v1",
      name: "Final profile follow-up",
      body: `Hi {{1}},

This is the final follow-up regarding the profile review for the {{2}} requirement.

If you would like to receive additional information or continue with the recruitment process, please reply to this message.

Thank you for your time and consideration.`,
    },
    {
      id: "profile_review_closure_v1",
      name: "Profile review closure",
      body: `Hi {{1}},

This is a final update regarding the profile review communication shared earlier for the {{2}} requirement.

We understand that you may not be available to continue the process at this time.

Should your availability or circumstances change, you may reply to this message to reconnect regarding your profile review.

Thank you for your time.`,
    },
  ],
};

const DEFAULT_OPENING_TEMPLATE_ID = "profile_review_reminder_v1";
const DEFAULT_NO_REPLY_1_TEMPLATE_ID = "profile_review_reminder_v1";
const DEFAULT_NO_REPLY_2_TEMPLATE_ID = "final_profile_follow_up_v1";

const OPENING_TEMPLATE_IDS = WHATSAPP_OPENING_TEMPLATES.map((t) => t.id);
const NO_REPLY_1_TEMPLATE_IDS = WHATSAPP_NO_REPLY_TEMPLATES[1].map((t) => t.id);
const NO_REPLY_2_TEMPLATE_IDS = WHATSAPP_NO_REPLY_TEMPLATES[2].map((t) => t.id);

/** Saved plans may still reference pre-v1 Huntlo template ids. */
const LEGACY_TEMPLATE_ID_ALIASES = {
  professional_intro: "profile_review_reminder_v1",
  opening_message_01: "profile_review_reminder_v1",
  role_opportunity: "role_alignment_review",
  no_reply_1_bump: "profile_review_reminder_v1",
  no_reply_1_value: "recruitment_update_reminder_v1",
  no_reply_2_final: "final_profile_follow_up_v1",
  no_reply_2_door_open: "profile_review_closure_v1",
};

function normalizeTemplateId(id) {
  const key = String(id || "").trim();
  if (!key) return "";
  return LEGACY_TEMPLATE_ID_ALIASES[key] || key;
}

function findOpeningTemplate(id) {
  const key = normalizeTemplateId(id);
  return WHATSAPP_OPENING_TEMPLATES.find((t) => t.id === key) || null;
}

function findNoReplyTemplate(slot, id) {
  const s = slot === 2 ? 2 : 1;
  const key = normalizeTemplateId(id);
  const list = WHATSAPP_NO_REPLY_TEMPLATES[s] || [];
  return list.find((t) => t.id === key) || null;
}

function resolveOpeningTemplateId(id) {
  const key = normalizeTemplateId(id);
  if (OPENING_TEMPLATE_IDS.includes(key)) return key;
  return DEFAULT_OPENING_TEMPLATE_ID;
}

function resolveNoReply1TemplateId(id) {
  const key = normalizeTemplateId(id);
  if (NO_REPLY_1_TEMPLATE_IDS.includes(key)) return key;
  return DEFAULT_NO_REPLY_1_TEMPLATE_ID;
}

function resolveNoReply2TemplateId(id) {
  const key = normalizeTemplateId(id);
  if (NO_REPLY_2_TEMPLATE_IDS.includes(key)) return key;
  return DEFAULT_NO_REPLY_2_TEMPLATE_ID;
}

module.exports = {
  WHATSAPP_OPENING_TEMPLATES,
  WHATSAPP_NO_REPLY_TEMPLATES,
  DEFAULT_OPENING_TEMPLATE_ID,
  DEFAULT_NO_REPLY_1_TEMPLATE_ID,
  DEFAULT_NO_REPLY_2_TEMPLATE_ID,
  OPENING_TEMPLATE_IDS,
  NO_REPLY_1_TEMPLATE_IDS,
  NO_REPLY_2_TEMPLATE_IDS,
  findOpeningTemplate,
  findNoReplyTemplate,
  resolveOpeningTemplateId,
  resolveNoReply1TemplateId,
  resolveNoReply2TemplateId,
};
