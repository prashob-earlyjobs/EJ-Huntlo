const { SchemaType } = require("@google-cloud/vertexai");
const Campaign = require("../models/Campaign");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const { getAiConfig } = require("../config/ai");
const { generateJsonWithGemini } = require("./geminiService");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");

const MIN_AI_QUESTIONS = 3;
const MAX_AI_QUESTIONS = 5;
const MAX_HISTORY_MESSAGES = 40;
const CALENDLY_FINAL_QUESTION =
  "Final step: if you are interested, please book a time for your interview here:";

const QUALIFICATION_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    decision: {
      type: SchemaType.STRING,
      description: "ask_question | interested | not_interested",
    },
    question: {
      type: SchemaType.STRING,
      description: "Next short qualification question when decision is ask_question.",
    },
    summaryReason: {
      type: SchemaType.STRING,
      description: "Short reason for classification.",
    },
  },
  required: ["decision", "question", "summaryReason"],
};

const SYSTEM_INSTRUCTION = `You run WhatsApp candidate interest qualification for a recruiter.
Output JSON only.
Tone: brief, human, professional, friendly.
Question rules:
- Ask one question at a time.
- Questions must be based on provided role context.
- Keep each question concise (<= 25 words).
- Avoid repeating previous questions.
Classification rules:
- interested: clear positive intent + mostly suitable responses.
- not_interested: decline, no interest, or clearly unsuitable after enough responses.
- Before 3 asked questions, prefer ask_question unless candidate clearly says not interested.
- By the 5th asked question, decide interested or not_interested (no more questions).`;

function isWhatsAppAiEnabled() {
  const flag = String(process.env.OUTREACH_WHATSAPP_AI_ENABLED ?? "true")
    .trim()
    .toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}

function extractCalendlyLink(text) {
  const src = String(text || "");
  const match = src.match(/https?:\/\/(?:[\w-]+\.)?calendly\.com\/[^\s)]+/i);
  return match ? match[0].trim() : "";
}

function normalizeDecision(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "interested") return "interested";
  if (v === "not_interested") return "not_interested";
  return "ask_question";
}

function parseAiJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
}

function formatHistory(messages) {
  return messages
    .map((m) => `[${m.direction === "inbound" ? "Candidate" : "Recruiter"}] ${String(m.body || "").trim()}`)
    .join("\n");
}

async function incrementCampaignInterestCounter(campaignId, previousDisposition, nextDisposition) {
  const inc = {};
  if (previousDisposition === "interested" && nextDisposition !== "interested") {
    inc.whatsAppInterestedCount = -1;
  }
  if (previousDisposition !== "interested" && nextDisposition === "interested") {
    inc.whatsAppInterestedCount = (inc.whatsAppInterestedCount || 0) + 1;
  }
  if (previousDisposition === "not_interested" && nextDisposition !== "not_interested") {
    inc.whatsAppNotInterestedCount = -1;
  }
  if (previousDisposition !== "not_interested" && nextDisposition === "not_interested") {
    inc.whatsAppNotInterestedCount = (inc.whatsAppNotInterestedCount || 0) + 1;
  }
  if (Object.keys(inc).length === 0) return;
  await Campaign.updateOne({ _id: campaignId }, { $inc: inc });
}

async function loadRoleContext(campaign) {
  const planId = campaign?.outreachPlanId ? String(campaign.outreachPlanId) : "";
  if (!planId) return { roleContext: campaign?.name || "Hiring role", calendlyLink: "" };

  const plan = await WhatsAppOutreachPlan.findById(planId).select("name touchpoints").lean();
  if (!plan) return { roleContext: campaign?.name || "Hiring role", calendlyLink: "" };

  const snippets = (Array.isArray(plan.touchpoints) ? plan.touchpoints : [])
    .slice(0, 5)
    .map((tp) => String(tp?.body || "").trim())
    .filter(Boolean);

  const joined = snippets.join("\n\n");
  return {
    roleContext: [plan.name, joined].filter(Boolean).join("\n\n"),
    calendlyLink: extractCalendlyLink(joined),
  };
}

function buildPrompt({
  roleContext,
  contactName,
  askedCount,
  history,
  latestCandidateMessage,
}) {
  return `Role context:
${roleContext || "Not provided"}

Candidate name: ${contactName || "Candidate"}
Questions already asked: ${askedCount}
Minimum questions: ${MIN_AI_QUESTIONS}
Maximum questions: ${MAX_AI_QUESTIONS}

Conversation history (oldest to latest):
${history || "(none)"}

Latest candidate message:
"${latestCandidateMessage}"

Return JSON:
{
  "decision": "ask_question | interested | not_interested",
  "question": "text",
  "summaryReason": "text"
}`;
}

async function sendAndLogAiMessage({ enrollment, body, label }) {
  const sendResult = await sendWhatsAppSessionMessage(String(enrollment.userId), {
    to: enrollment.contactPhone,
    body,
  });

  await logCampaignWhatsAppMessage({
    userId: String(enrollment.userId),
    campaignId: String(enrollment.campaignId),
    enrollmentId: String(enrollment._id),
    candidateKey: enrollment.candidateKey,
    contactPhone: enrollment.contactPhone,
    direction: "outbound",
    body,
    sequenceStepOrder: null,
    sequenceStepLabel: label,
    provider: sendResult?.provider || "meta",
    externalMessageId: sendResult?.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt: new Date(),
  });
}

async function maybeHandleWhatsAppAiQualification({ enrollmentId, inboundMessageId, inboundBody }) {
  if (!isWhatsAppAiEnabled()) return { handled: false, reason: "disabled" };
  const cfg = getAiConfig();
  if (!cfg.useVertex && !cfg.useAiStudio) return { handled: false, reason: "ai_not_configured" };

  const enrollment = await CampaignSequenceEnrollment.findById(enrollmentId).lean();
  if (!enrollment) return { handled: false, reason: "missing_enrollment" };
  if (!String(enrollment.contactPhone || "").trim()) return { handled: false, reason: "no_phone" };
  if (String(enrollment.lastWhatsAppAiHandledMessageId || "") === String(inboundMessageId || "")) {
    return { handled: false, reason: "already_handled" };
  }

  const currentDisposition = String(enrollment.replyDisposition || "unknown");
  if (currentDisposition === "interested" || currentDisposition === "not_interested") {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollment._id },
      { $set: { lastWhatsAppAiHandledMessageId: String(inboundMessageId || "") } }
    );
    return { handled: false, reason: "final_disposition" };
  }

  const campaign = await Campaign.findById(enrollment.campaignId).select("name outreachPlanId").lean();
  if (!campaign) return { handled: false, reason: "missing_campaign" };
  const { roleContext, calendlyLink } = await loadRoleContext(campaign);

  const messages = await CampaignWhatsAppMessage.find({
    enrollmentId: enrollment._id,
  })
    .sort({ sentAt: 1 })
    .limit(MAX_HISTORY_MESSAGES)
    .select("direction body sequenceStepLabel")
    .lean();

  const askedCount = messages.filter(
    (m) =>
      m.direction === "outbound" &&
      String(m.sequenceStepLabel || "").toLowerCase().startsWith("ai screening q")
  ).length;

  const prompt = buildPrompt({
    roleContext,
    contactName: enrollment.contactName,
    askedCount,
    history: formatHistory(messages),
    latestCandidateMessage: String(inboundBody || "").trim(),
  });

  let ai;
  try {
    const raw = await generateJsonWithGemini({
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      responseSchema: QUALIFICATION_RESPONSE_SCHEMA,
    });
    ai = parseAiJson(raw);
  } catch (err) {
    console.error("[whatsapp-ai] generation failed:", err?.message || err);
    return { handled: false, reason: "ai_error" };
  }

  let decision = normalizeDecision(ai?.decision);
  if (decision !== "not_interested" && askedCount < MIN_AI_QUESTIONS) {
    decision = "ask_question";
  }
  if (decision === "ask_question" && askedCount >= MAX_AI_QUESTIONS) {
    decision = "not_interested";
  }

  const now = new Date();
  if (decision === "ask_question") {
    let question = String(ai?.question || "").trim();
    if (!question) return { handled: false, reason: "empty_question" };
    const questionNumber = askedCount + 1;
    if (calendlyLink && questionNumber >= MAX_AI_QUESTIONS) {
      question = `${CALENDLY_FINAL_QUESTION} ${calendlyLink}`;
    }
    await sendAndLogAiMessage({
      enrollment,
      body: question,
      label: `AI Screening Q${questionNumber}`,
    });
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollment._id },
      {
        $set: {
          lastWhatsAppAiHandledMessageId: String(inboundMessageId || ""),
          lastError: `AI screening question ${questionNumber} sent`,
          status: "paused",
        },
      }
    );
    notifyCampaignThreadUpdated(String(enrollment.userId), {
      campaignId: String(enrollment.campaignId),
      candidateKey: String(enrollment.candidateKey || ""),
      newMessages: 1,
      hasNewCandidateReply: false,
      source: "whatsapp_ai",
    });
    return { handled: true, decision, questionNumber };
  }

  const finalDisposition = decision === "interested" ? "interested" : "not_interested";
  let finalMessage =
    finalDisposition === "interested"
      ? "Great to hear you are interested. Our hiring team will connect with you shortly."
      : "Thank you for your time. We appreciate your response and wish you all the best.";
  if (finalDisposition === "interested" && calendlyLink) {
    finalMessage = `Great to hear you are interested. Please pick a time here: ${calendlyLink}`;
  }

  await sendAndLogAiMessage({
    enrollment,
    body: finalMessage,
    label: `AI Qualification ${finalDisposition}`,
  });

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        replyDisposition: finalDisposition,
        replyDispositionAt: now,
        lastWhatsAppAiHandledMessageId: String(inboundMessageId || ""),
        lastError:
          finalDisposition === "interested"
            ? "Candidate interested"
            : "Candidate not interested",
        status: "paused",
      },
    }
  );

  await incrementCampaignInterestCounter(
    enrollment.campaignId,
    currentDisposition,
    finalDisposition
  );

  notifyCampaignThreadUpdated(String(enrollment.userId), {
    campaignId: String(enrollment.campaignId),
    candidateKey: String(enrollment.candidateKey || ""),
    newMessages: 1,
    hasNewCandidateReply: false,
    source: "whatsapp_ai",
  });

  return { handled: true, decision: finalDisposition };
}

module.exports = {
  maybeHandleWhatsAppAiQualification,
};

