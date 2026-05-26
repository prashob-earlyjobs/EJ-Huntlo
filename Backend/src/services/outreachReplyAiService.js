const {
  generateJsonWithGemini,
  OUTREACH_AUTO_REPLY_RESPONSE_SCHEMA,
} = require("./geminiService");

const SYSTEM_INSTRUCTION = `You draft recruiter email replies for Huntlo campaign threads.
Output valid JSON only.
Write as the hiring team: use "we", "our", "us" — never "I", "me", "my".
Keep replies under 120 words, professional and warm.

Goals:
1. Classify disposition: "interested" only if they clearly want to proceed (yes, open to chat, tell me more, sounds good, when can we talk).
2. "not_interested" if they decline, ask to stop, unsubscribe, or clearly are not looking.
3. "unknown" if still ambiguous — use reply to gently ask if they are open to learning more (yes/no is fine).

Reply rules:
- Questions you cannot answer from the provided context (salary, benefits, visa, interview dates, etc.): say the team will follow up with details soon — do not invent facts.
- Irrelevant, rude, or off-topic messages: reply briefly and redirect to the role, or politely close if abusive.
- While disposition is unknown: keep trying to get a clear interested / not interested signal without being pushy.
- When disposition becomes interested or not_interested: send a short closing reply (thank them and next step for interested; thank them and wish well for not interested).`;

function formatThreadForPrompt(messages) {
  return messages
    .map((m) => {
      const who = m.isFromCandidate ? "Candidate" : "Recruiter";
      const body = String(m.bodyText || m.snippet || "").trim().slice(0, 2000);
      return `[${who}] ${body}`;
    })
    .join("\n\n---\n\n");
}

function buildAutoReplyPrompt({
  campaignName,
  contactName,
  contactRole,
  contactCompany,
  planSummary,
  threadMessages,
  latestCandidateMessage,
  currentDisposition,
  autoReplyTurn,
}) {
  const firstName = String(contactName || "").trim().split(/\s+/)[0] || "there";

  return `Campaign: ${campaignName || "Outreach"}
Role context: ${contactRole || "n/a"} at ${contactCompany || "n/a"}
Candidate first name: ${firstName}
Current disposition: ${currentDisposition || "unknown"}
Auto-reply turn: ${autoReplyTurn}

Outreach sequence summary:
${planSummary || "(not available)"}

Full thread (oldest to newest):
${formatThreadForPrompt(threadMessages)}

Latest candidate message to respond to:
"""
${String(latestCandidateMessage || "").trim()}
"""

Return JSON:
{
  "disposition": "unknown" | "interested" | "not_interested",
  "shouldSendReply": true,
  "replyBody": "plain text email body"
}`;
}

function parseAutoReplyJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const err = new Error("AI auto-reply response was not valid JSON.");
    err.statusCode = 502;
    throw err;
  }
}

function normalizeDisposition(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "interested" || v === "not_interested") return v;
  return "unknown";
}

/**
 * Classify candidate reply and draft an auto-response email body.
 */
async function generateCampaignAutoReply(context) {
  const prompt = buildAutoReplyPrompt(context);
  const raw = await generateJsonWithGemini({
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION,
    responseSchema: OUTREACH_AUTO_REPLY_RESPONSE_SCHEMA,
  });

  const parsed = parseAutoReplyJson(raw);
  const disposition = normalizeDisposition(parsed.disposition);
  const replyBody = String(parsed.replyBody || "").trim();
  const shouldSendReply = Boolean(parsed.shouldSendReply) && replyBody.length > 0;

  return {
    disposition,
    shouldSendReply,
    replyBody,
  };
}

module.exports = {
  generateCampaignAutoReply,
  buildAutoReplyPrompt,
};
