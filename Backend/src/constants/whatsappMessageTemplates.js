/**
 * Approved WhatsApp message templates — same catalog as Frontend scratch flow
 * (Frontend/src/lib/whatsappOutreach.ts). AI generate picks ids from these lists;
 * bodies are never AI-authored for steps 1–3.
 */

const WHATSAPP_OPENING_TEMPLATES = [
  {
    id: "opening_message_01",
    name: "Professional introduction",
    body: `Hi {{1}},

Your profile has been shortlisted through our candidate matching process for the {{2}} position.

To review the opportunity details and next steps, please reply to this message.`,
  },
  {
    id: "role_opportunity",
    name: "Role opportunity",
    body: `Hello {{1}} 👋

We're actively looking for a {{2}}, and your background looks like a strong match.

Happy to share more details if you're interested — would that work for you?`,
  },
];

const WHATSAPP_NO_REPLY_TEMPLATES = {
  1: [
    {
      id: "no_reply_1_bump",
      name: "Friendly bump",
      body: `Hi {{1}}, just bumping this in case my earlier message got buried.

Are you still open to a quick chat about the {{2}} opportunity?`,
    },
    {
      id: "no_reply_1_value",
      name: "Value reminder",
      body: `Hi {{1}}, wanted to follow up — we're hiring for {{2}} and your background at {{3}} still looks like a strong match.

Would a 10-minute call work this week?`,
    },
  ],
  2: [
    {
      id: "no_reply_2_final",
      name: "Final note",
      body: `Hi {{1}} — last quick note from me.

Happy to share more details whenever works for you. Should I close the loop on this side?`,
    },
    {
      id: "no_reply_2_door_open",
      name: "Door open",
      body: `Hi {{1}}, I don't want to crowd your inbox — I'll pause here unless you'd like to hear more about the {{2}} opportunity. Just reply anytime.`,
    },
  ],
};

const DEFAULT_OPENING_TEMPLATE_ID = "opening_message_01";
const DEFAULT_NO_REPLY_1_TEMPLATE_ID = "no_reply_1_bump";
const DEFAULT_NO_REPLY_2_TEMPLATE_ID = "no_reply_2_final";

const OPENING_TEMPLATE_IDS = WHATSAPP_OPENING_TEMPLATES.map((t) => t.id);
const NO_REPLY_1_TEMPLATE_IDS = WHATSAPP_NO_REPLY_TEMPLATES[1].map((t) => t.id);
const NO_REPLY_2_TEMPLATE_IDS = WHATSAPP_NO_REPLY_TEMPLATES[2].map((t) => t.id);

function findOpeningTemplate(id) {
  const key = String(id || "").trim();
  return WHATSAPP_OPENING_TEMPLATES.find((t) => t.id === key) || null;
}

function findNoReplyTemplate(slot, id) {
  const s = slot === 2 ? 2 : 1;
  const key = String(id || "").trim();
  const list = WHATSAPP_NO_REPLY_TEMPLATES[s] || [];
  return list.find((t) => t.id === key) || null;
}

function resolveOpeningTemplateId(id) {
  const key = String(id || "").trim();
  if (OPENING_TEMPLATE_IDS.includes(key)) return key;
  return DEFAULT_OPENING_TEMPLATE_ID;
}

function resolveNoReply1TemplateId(id) {
  const key = String(id || "").trim();
  if (NO_REPLY_1_TEMPLATE_IDS.includes(key)) return key;
  return DEFAULT_NO_REPLY_1_TEMPLATE_ID;
}

function resolveNoReply2TemplateId(id) {
  const key = String(id || "").trim();
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
