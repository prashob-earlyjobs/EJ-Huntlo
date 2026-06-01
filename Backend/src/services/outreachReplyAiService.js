const {
  generateJsonWithGemini,
  OUTREACH_AUTO_REPLY_RESPONSE_SCHEMA,
} = require("./geminiService");

const MAX_CONVERSATION_EXCHANGES = 3;

const SYSTEM_INSTRUCTION = `You draft recruiter email replies for Huntlo campaign threads.
Output valid JSON only.
Write as the hiring team: use "we", "our", "us" — never "I", "me", "my".
Keep replies under 120 words, professional and warm.

Job description (JD):
- The user prompt includes the campaign job description. Answer factual questions about the role (compensation, location, requirements, responsibilities, benefits, visa, team, etc.) ONLY when the answer is clearly stated in the JD.
- Do not invent or guess JD facts. If the answer is not in the JD, say the team will follow up with those details soon.

Conversation limit (max ${MAX_CONVERSATION_EXCHANGES} auto-reply exchanges per candidate):
- Exchanges 1–2: answer JD questions when possible; stay helpful; disposition may stay "unknown" if interest is unclear.
- On exchange ${MAX_CONVERSATION_EXCHANGES} (or when auto-reply turn >= ${MAX_CONVERSATION_EXCHANGES}): if they have not declined, set disposition to "interested", shouldSendReply true, thank them, and invite them to book an interview using the interview scheduling link from the prompt (include the full URL in replyBody).
- If they clearly decline, ask to stop, or unsubscribe at any point: disposition "not_interested", short polite close, no scheduling link.

Disposition rules:
- "interested": clearly wants to proceed, or exchange ${MAX_CONVERSATION_EXCHANGES} reached without decline.
- "not_interested": declines, not looking, or asks to stop.
- "unknown": only on exchanges 1–2 when interest is still ambiguous — gently ask if they are open to learning more.

Other rules:
- Irrelevant, rude, or off-topic messages: reply briefly and redirect to the role, or politely close if abusive.
- When disposition is "not_interested": short thank-you and wish them well (no scheduling link).
- When disposition is "interested" and a scheduling link is provided: include it in replyBody.`;

function formatThreadForPrompt(messages) {
  return messages
    .map((m) => {
      const who = m.isFromCandidate ? "Candidate" : "Recruiter";
      const body = String(m.bodyText || m.snippet || "").trim().slice(0, 2000);
      return `[${who}] ${body}`;
    })
    .join("\n\n---\n\n");
}

function truncateForPrompt(text, maxLen = 12_000) {
  const s = String(text || "").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n...(truncated)`;
}

function buildAutoReplyPrompt({
  campaignName,
  contactName,
  contactRole,
  contactCompany,
  jobDescription,
  planSummary,
  threadMessages,
  latestCandidateMessage,
  currentDisposition,
  autoReplyTurn,
  maxExchanges = MAX_CONVERSATION_EXCHANGES,
  interviewSchedulingUrl = "",
}) {
  const firstName = String(contactName || "").trim().split(/\s+/)[0] || "there";
  const jd = truncateForPrompt(jobDescription);
  const schedulingUrl = String(interviewSchedulingUrl || "").trim();
  const onFinalExchange = autoReplyTurn >= maxExchanges;

  return `Campaign: ${campaignName || "Outreach"}
Role context: ${contactRole || "n/a"} at ${contactCompany || "n/a"}
Candidate first name: ${firstName}
Current disposition: ${currentDisposition || "unknown"}
Auto-reply turn: ${autoReplyTurn} of ${maxExchanges} maximum
${onFinalExchange ? "This is the FINAL exchange — include the interview scheduling link and set disposition to interested unless they declined." : ""}
Interview scheduling link: ${schedulingUrl || "(not configured — do not invent a URL)"}

Job description (answer role questions from this only):
"""
${jd || "(not available — say the team will follow up with role details)"}
"""

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
  console.log("prompt<--", prompt);
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
  MAX_CONVERSATION_EXCHANGES,
};
