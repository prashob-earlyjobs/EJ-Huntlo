const {
  generateJsonWithGemini,
  OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
} = require("./geminiService");

const SYSTEM_INSTRUCTION = `You write recruiter cold-email outreach sequences for Huntlo.
Output must be valid JSON only when asked.
Merge tokens (CANDIDATE fields — not the open role):
- {{FirstName}}: candidate first name
- {{CurrentCompany}}: candidate's CURRENT employer (where they work today)
- {{JobTitle}}: candidate's CURRENT job title (not the role you are hiring for)
- {{SenderFirstName}}: recruiter sender first name
Describe the OPEN POSITION only from the job description. Never write "the {{JobTitle}} role at {{CurrentCompany}}" as if that were your opening — that pattern is the candidate's existing job.
Write on behalf of the hiring team/company: use "we", "our", and "us" — never first-person singular ("I", "me", "my", "mine") in subjects or bodies.
Every touchpoint is only a conversation starter: invite a reply or a short chat. Do not screen, qualify, or collect details (no salary, notice period, years of experience, availability forms, or interview scheduling) until the candidate has engaged.
Keep each email body under 150 words, professional and friendly.`;

const STEP_LABELS = ["Introduction", "Follow-up 1", "Follow-up 2", "Final follow-up"];
const STEP_WAITS = [0, 3, 4, 5];

function buildOutreachJdPrompt(jobDescription, planNameHint) {
  return `Create exactly 4 email touchpoints for candidate outreach based on this job description.

Job description:
"""
${jobDescription}
"""

Requirements:
0. Voice: company/team perspective only — use "we/our/us", not "I/me/my".
0b. The open role's title and hiring company must come from the job description only — not from merge tokens (merge tokens are the candidate's current employer/title).
1. Goal for ALL four touchpoints: begin the conversation only — one simple ask to reply or connect (e.g. open to a quick chat, interested to hear more). Do not advance the funnel or ask screening questions.
2. Touchpoint 1 (waitDays 0): Warm intro to the role from the JD; spark interest; invite them to reply.
3. Touchpoint 2 (waitDays 3): Short follow-up; new angle on why the role might fit; still only asking to start a conversation.
4. Touchpoint 3 (waitDays 4): Brief, low-pressure nudge; reference the opportunity again; ask if they are open to connecting — no new topics.
5. Touchpoint 4 (waitDays 5): Polite final bump; leave the door open to reply; do not introduce salary, experience, or logistics.

Each touchpoint needs: order (1-4), label, subject, body, waitDays (use values above).
${planNameHint ? `Suggested plan name: ${planNameHint}` : "Include a short planName based on the role."}

Return JSON only in this shape:
{
  "planName": "string",
  "touchpoints": [
    { "order": 1, "label": "Introduction", "subject": "...", "body": "...", "waitDays": 0 }
  ]
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

function normalizeTouchpoints(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  const normalized = [];

  for (let i = 0; i < 4; i += 1) {
    const tp = list[i] && typeof list[i] === "object" ? list[i] : {};
    const order = i + 1;
    const subject = String(tp.subject || "").trim();
    const body = String(tp.body || "").trim();
    if (!subject || !body) {
      const err = new Error(`AI sequence step ${order} is missing subject or body. Try again.`);
      err.statusCode = 502;
      throw err;
    }
    normalized.push({
      order,
      label: String(tp.label || STEP_LABELS[i] || `Step ${order}`).trim(),
      subject,
      body,
      waitDays: STEP_WAITS[i],
    });
  }

  return normalized;
}

/**
 * Generate a 4-step outreach sequence tailored to a job description.
 */
async function generateOutreachSequenceFromJd({ jobDescription, planName = "" }) {
  const jd = String(jobDescription || "").trim();
  if (jd.length < 20) {
    const err = new Error("Job description must be at least 20 characters.");
    err.statusCode = 400;
    throw err;
  }

  const hint = String(planName || "").trim();
  const prompt = buildOutreachJdPrompt(jd, hint);
  const raw = await generateJsonWithGemini({
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION,
    responseSchema: OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
  });

  const parsed = parseJsonFromModel(raw);
  const touchpoints = normalizeTouchpoints(parsed.touchpoints);
  const resolvedPlanName =
    String(parsed.planName || hint || "AI outreach sequence").trim() ||
    "AI outreach sequence";

  return {
    planName: resolvedPlanName,
    touchpoints,
    touchpointCount: touchpoints.length,
  };
}

module.exports = {
  generateOutreachSequenceFromJd,
  buildOutreachJdPrompt,
};
