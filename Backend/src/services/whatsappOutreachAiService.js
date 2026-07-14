const {
  generateJsonWithGemini,
  WHATSAPP_OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
} = require("./geminiService");
const {
  DEFAULT_NO_REPLY_1_TEMPLATE_ID,
  DEFAULT_NO_REPLY_2_TEMPLATE_ID,
  DEFAULT_OPENING_TEMPLATE_ID,
  findNoReplyTemplate,
  findOpeningTemplate,
  NO_REPLY_1_TEMPLATE_IDS,
  NO_REPLY_2_TEMPLATE_IDS,
  OPENING_TEMPLATE_IDS,
  resolveNoReply1TemplateId,
  resolveNoReply2TemplateId,
  resolveOpeningTemplateId,
} = require("../constants/whatsappMessageTemplates");

const SYSTEM_INSTRUCTION = `You configure recruiter WhatsApp outreach sequences for Huntlo.
Output must be valid JSON only when asked.
Steps 1–3 use pre-approved Meta WhatsApp templates only — you must NOT write custom opening or no-reply message text.
Pick the best template id for each step from the allowed lists.
Write only the 4 reply-based screening questions (sent after the candidate replies).
Merge tokens may appear in reply questions: {{FirstName}}, {{CurrentCompany}}, {{JobTitle}}, {{SenderFirstName}}.
Describe the OPEN POSITION from the job description — never confuse candidate's current title/company with the role you are hiring for.
Write on behalf of the hiring team: use "we", "our", "us" — not "I/me/my".
Reply questions: concise, conversational, under 120 words each.`;

const REPLY_LABELS = [
  "Reply question 1",
  "Reply question 2",
  "Reply question 3",
  "Reply question 4",
];

function buildWhatsAppJdPrompt(jobDescription, planNameHint) {
  return `Create a WhatsApp outreach sequence configuration based on this job description.

Job description:
"""
${jobDescription}
"""

Pre-approved templates (pick exactly one id per step — do NOT write message bodies for these):

Opening (step 1) — choose one:
- profile_review_reminder_v1 — profile review follow-up for {{2}} requirement
- role_alignment_review — experience identified as relevant for {{2}} role

No-reply follow-up 1 (step 2, 48h later) — choose one:
- profile_review_reminder_v1 — reminder on profile review communication
- recruitment_update_reminder_v1 — follow-up on previous profile review communication

No-reply follow-up 2 (step 3, 96h after step 2) — choose one:
- final_profile_follow_up_v1 — final follow-up on profile review
- profile_review_closure_v1 — closure with option to reconnect later

You must also write replyQuestions: exactly 4 short questions sent only after the candidate replies:
1. years of relevant experience
2. notice period and work location preference
3. core skills/tools for the role
4. interest in a short interview call

${planNameHint ? `Suggested plan name: ${planNameHint}` : "Include a short planName based on the role."}

Return JSON only:
{
  "planName": "string",
  "openingTemplateId": "profile_review_reminder_v1" | "role_alignment_review",
  "noReply1TemplateId": "profile_review_reminder_v1" | "recruitment_update_reminder_v1",
  "noReply2TemplateId": "final_profile_follow_up_v1" | "profile_review_closure_v1",
  "replyQuestions": ["q1", "q2", "q3", "q4"]
}`;
}

function parseJsonFromModel(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const err = new Error("AI response was not valid JSON. Try again.");
    err.statusCode = 502;
    throw err;
  }
}

function requireMessage(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    const err = new Error(`AI sequence is missing ${label}. Try again.`);
    err.statusCode = 502;
    throw err;
  }
  return text;
}

function normalizeReplyQuestions(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  const normalized = [];
  for (let i = 0; i < 4; i += 1) {
    normalized.push(requireMessage(list[i], `reply question ${i + 1}`));
  }
  return normalized;
}

function buildTouchpoints(parsed) {
  const openingId = resolveOpeningTemplateId(parsed.openingTemplateId);
  const noReply1Id = resolveNoReply1TemplateId(parsed.noReply1TemplateId);
  const noReply2Id = resolveNoReply2TemplateId(parsed.noReply2TemplateId);

  const openingTpl = findOpeningTemplate(openingId) || findOpeningTemplate(DEFAULT_OPENING_TEMPLATE_ID);
  const noReply1Tpl =
    findNoReplyTemplate(1, noReply1Id) || findNoReplyTemplate(1, DEFAULT_NO_REPLY_1_TEMPLATE_ID);
  const noReply2Tpl =
    findNoReplyTemplate(2, noReply2Id) || findNoReplyTemplate(2, DEFAULT_NO_REPLY_2_TEMPLATE_ID);

  if (!openingTpl || !noReply1Tpl || !noReply2Tpl) {
    const err = new Error("Approved WhatsApp template catalog is misconfigured.");
    err.statusCode = 500;
    throw err;
  }

  const replyQuestions = normalizeReplyQuestions(parsed.replyQuestions);

  const touchpoints = [
    {
      order: 1,
      label: "Opening message",
      body: openingTpl.body,
      waitHours: 0,
      templateId: openingTpl.id,
      isNoReplyFallback: false,
      isReplyFollowUp: false,
    },
    {
      order: 2,
      label: "No-reply follow-up 1",
      body: noReply1Tpl.body,
      waitHours: 48,
      templateId: noReply1Tpl.id,
      isNoReplyFallback: true,
      isReplyFollowUp: false,
    },
    {
      order: 3,
      label: "No-reply follow-up 2",
      body: noReply2Tpl.body,
      waitHours: 96,
      templateId: noReply2Tpl.id,
      isNoReplyFallback: true,
      isReplyFollowUp: false,
    },
    ...replyQuestions.map((body, index) => ({
      order: 4 + index,
      label: REPLY_LABELS[index] || `Reply question ${index + 1}`,
      body,
      waitHours: 0,
      templateId: "",
      isNoReplyFallback: false,
      isReplyFollowUp: true,
    })),
  ];

  return { touchpoints, replyQuestions };
}

/**
 * Generate a WhatsApp outreach sequence: approved templates for steps 1–3, AI reply questions only.
 */
async function generateWhatsAppSequenceFromJd({ jobDescription, planName = "" }) {
  const jd = String(jobDescription || "").trim();
  if (jd.length < 20) {
    const err = new Error("Job description must be at least 20 characters.");
    err.statusCode = 400;
    throw err;
  }

  const hint = String(planName || "").trim();
  const prompt = buildWhatsAppJdPrompt(jd, hint);
  const raw = await generateJsonWithGemini({
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION,
    responseSchema: WHATSAPP_OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
  });

  const parsed = parseJsonFromModel(raw);
  const { touchpoints, replyQuestions } = buildTouchpoints(parsed);
  const resolvedPlanName =
    String(parsed.planName || hint || "AI WhatsApp sequence").trim() ||
    "AI WhatsApp sequence";

  return {
    planName: resolvedPlanName,
    touchpoints,
    replyQuestions,
    touchpointCount: touchpoints.length,
  };
}

module.exports = {
  generateWhatsAppSequenceFromJd,
  buildWhatsAppJdPrompt,
  OPENING_TEMPLATE_IDS,
  NO_REPLY_1_TEMPLATE_IDS,
  NO_REPLY_2_TEMPLATE_IDS,
};
