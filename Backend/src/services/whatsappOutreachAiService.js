const {
  generateJsonWithGemini,
  WHATSAPP_OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
} = require("./geminiService");

const SYSTEM_INSTRUCTION = `You write recruiter WhatsApp outreach sequences for Huntlo.
Output must be valid JSON only when asked.
Use these merge tokens where natural: {{FirstName}}, {{CurrentCompany}}, {{JobTitle}}, {{SenderFirstName}}.
Write on behalf of the hiring team/company: use "we", "our", and "us" — never first-person singular ("I", "me", "my", "mine").
WhatsApp messages should be concise (under 120 words each), conversational, and professional.
Use short paragraphs; line breaks are allowed.
Emojis: at most one per message, only when it fits naturally.`;

const OPENING_TEMPLATE_ID = "professional_intro";
const NO_REPLY_1_TEMPLATE_ID = "no_reply_1_bump";
const NO_REPLY_2_TEMPLATE_ID = "no_reply_2_final";

const REPLY_LABELS = [
  "Reply question 1",
  "Reply question 2",
  "Reply question 3",
  "Reply question 4",
];

function buildWhatsAppJdPrompt(jobDescription, planNameHint) {
  return `Create a WhatsApp outreach sequence based on this job description.

Job description:
"""
${jobDescription}
"""

Requirements:
1. openingMessage: warm intro to the role; invite a reply (no screening questions yet).
2. noReplyFollowUp1: friendly bump if they did not reply to the opening (48h later).
3. noReplyFollowUp2: polite final nudge if still no reply (96h after follow-up 1).
4. replyQuestions: exactly 4 short questions sent only after the candidate replies, in order:
   - years of relevant experience
   - notice period and work location preference
   - core skills/tools for the role
   - interest in a short interview call

Each message must stand alone and stay low-pressure.
${planNameHint ? `Suggested plan name: ${planNameHint}` : "Include a short planName based on the role."}

Return JSON only in this shape:
{
  "planName": "string",
  "openingMessage": "string",
  "noReplyFollowUp1": "string",
  "noReplyFollowUp2": "string",
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
  const opening = requireMessage(parsed.openingMessage, "opening message");
  const noReply1 = requireMessage(parsed.noReplyFollowUp1, "no-reply follow-up 1");
  const noReply2 = requireMessage(parsed.noReplyFollowUp2, "no-reply follow-up 2");
  const replyQuestions = normalizeReplyQuestions(parsed.replyQuestions);

  return [
    {
      order: 1,
      label: "Opening message",
      body: opening,
      waitHours: 0,
      templateId: OPENING_TEMPLATE_ID,
      isNoReplyFallback: false,
      isReplyFollowUp: false,
    },
    {
      order: 2,
      label: "No-reply follow-up 1",
      body: noReply1,
      waitHours: 48,
      templateId: NO_REPLY_1_TEMPLATE_ID,
      isNoReplyFallback: true,
      isReplyFollowUp: false,
    },
    {
      order: 3,
      label: "No-reply follow-up 2",
      body: noReply2,
      waitHours: 96,
      templateId: NO_REPLY_2_TEMPLATE_ID,
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
}

/**
 * Generate a WhatsApp outreach sequence (opening, no-reply fallbacks, reply questions).
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
  const touchpoints = buildTouchpoints(parsed);
  const resolvedPlanName =
    String(parsed.planName || hint || "AI WhatsApp sequence").trim() ||
    "AI WhatsApp sequence";

  return {
    planName: resolvedPlanName,
    touchpoints,
    touchpointCount: touchpoints.length,
  };
}

module.exports = {
  generateWhatsAppSequenceFromJd,
  buildWhatsAppJdPrompt,
};
