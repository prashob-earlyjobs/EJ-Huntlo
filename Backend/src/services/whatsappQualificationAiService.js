const { SchemaType } = require("@google-cloud/vertexai");
const Campaign = require("../models/Campaign");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const UserIntegration = require("../models/UserIntegration");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const { getAiConfig } = require("../config/ai");
const { generateJsonWithGemini } = require("./geminiService");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { maybeCompleteCampaign } = require("./campaignOutreachSendService");
const { applyMergeFields } = require("./outreachMergeService");

const MAX_HISTORY_MESSAGES = 40;
const PREDEFINED_LABEL_PREFIX = "Predefined Q";

const QUALIFICATION_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    decision: {
      type: SchemaType.STRING,
      description:
        "reply | mark_interested | mark_not_interested | send_interview_link",
    },
    message: {
      type: SchemaType.STRING,
      description: "WhatsApp message to send (plain text, concise).",
    },
    predefinedQuestionIndex: {
      type: SchemaType.NUMBER,
      description:
        "1-based index of the predefined screening question asked in this message, or 0 if none.",
    },
    summaryReason: {
      type: SchemaType.STRING,
      description: "Short internal reason for the decision.",
    },
  },
  required: ["decision", "message", "predefinedQuestionIndex", "summaryReason"],
};

const SYSTEM_INSTRUCTION = `You are a recruiter assistant on WhatsApp for Huntlo.
Output JSON only. Tone: brief, human, professional, friendly (under 120 words per message).

You must follow these cases in order of priority:

1) PREDEFINED SCREENING: Work through the recruiter's predefined questions in order (index 1, then 2, etc.).
   - When the candidate's latest message is a normal answer (not asking you something), acknowledge briefly and ask the next pending predefined question (stay faithful to its intent; you may rephrase naturally).
   - Set predefinedQuestionIndex to the index of the predefined question you are asking in this reply, or 0 if you are not asking one.

2) CANDIDATE ASKS ABOUT THE ROLE (JD-related): Answer only using the job description. The candidate's current job title/company (if listed) is where they work today — NOT the open role. Do not invent salary, benefits, visa, or dates not in the JD.
   - Then continue with the next pending predefined question in the same message when possible.
   - decision: reply

3) OFF-TOPIC OR UNKNOWN: If the question is unrelated to the role/JD or you cannot answer from context, say it is best discussed in a real interview with the hiring team, then redirect to the next pending predefined question.
   - decision: reply

4) INTEREST + FIT: If the candidate clearly wants to proceed AND their answers fit the role, decision: mark_interested.
   - Send a short closing message in "message". You may do this before all predefined questions are done if intent is clear.

5) NOT INTERESTED: Clear decline, stop, or obvious mismatch → decision: mark_not_interested with a polite closing message.

6) INTERVIEW LINK: If they explicitly ask for a scheduling/interview/Calendly link and an interview link is provided in context, decision: send_interview_link with a short message that includes the link.
   - If no interview link is in context, say the team will share scheduling details soon (decision: reply).

Rules:
- One WhatsApp message per turn in "message".
- Do not repeat predefined questions already marked as asked.
- Prefer decision reply until you have a clear interested / not_interested signal or all predefined questions are covered.
- Write as the hiring team ("we"), not "I".`;

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

function normalizeCalendlyAutomation(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const enabled = Boolean(o?.enabled);
  if (!enabled) {
    return {
      enabled: false,
      meetingUri: "",
      meetingName: "",
      schedulingUrl: "",
      durationMinutes: 0,
      kind: "",
    };
  }
  return {
    enabled: true,
    meetingUri: String(o?.meetingUri || "").trim(),
    meetingName: String(o?.meetingName || "").trim(),
    schedulingUrl: String(o?.schedulingUrl || "").trim(),
    durationMinutes: Math.max(0, Number(o?.durationMinutes) || 0),
    kind: String(o?.kind || "").trim(),
  };
}

function sortTouchpoints(touchpoints) {
  return [...(touchpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function normalizeDecision(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "mark_interested" || v === "interested") return "mark_interested";
  if (v === "mark_not_interested" || v === "not_interested") return "mark_not_interested";
  if (v === "send_interview_link" || v === "interview_link") return "send_interview_link";
  return "reply";
}

function parseAiJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
}

function formatHistory(messages) {
  return messages
    .map(
      (m) =>
        `[${m.direction === "inbound" ? "Candidate" : "Recruiter"}] ${String(m.body || "").trim()}`
    )
    .join("\n");
}

function countAskedPredefined(messages) {
  return messages.filter(
    (m) =>
      m.direction === "outbound" &&
      String(m.sequenceStepLabel || "")
        .toLowerCase()
        .startsWith(PREDEFINED_LABEL_PREFIX.toLowerCase())
  ).length;
}

function candidateRequestsInterviewLink(text) {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return false;
  const wantsLink =
    /\b(link|url|calendly|schedule|booking|book)\b/.test(t) ||
    /\b(send|share|give)\b.*\b(link|url)\b/.test(t);
  const interviewish =
    /\b(interview|meeting|call|calendar|slot|time)\b/.test(t) ||
    /\b(when can we|book a time|set up a call)\b/.test(t);
  return wantsLink && interviewish;
}

async function getWhatsAppSenderFirstName(userId) {
  const doc = await UserIntegration.findOne({
    userId,
    provider: "whatsapp",
  })
    .select("senderName")
    .lean();
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  return "";
}

function buildFallbackJobDescription(plan, campaign, contact) {
  const snippets = sortTouchpoints(plan?.touchpoints || [])
    .filter((tp) => !tp.isNoReplyFallback)
    .slice(0, 6)
    .map((tp) => String(tp?.body || "").trim())
    .filter(Boolean);
  const roleLine = [contact?.role, contact?.company].filter(Boolean).join(" at ");
  return [
    plan?.name || campaign?.name || "Open role",
    roleLine
      ? `Candidate background (current employer — NOT the open role): ${roleLine}`
      : "",
    snippets.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function loadWhatsAppPlanContext(campaign, enrollment) {
  const planId = campaign?.outreachPlanId ? String(campaign.outreachPlanId) : "";
  const contact = {
    name: enrollment.contactName,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };
  const campaignJdEarly = String(campaign?.jobDescription || "").trim();
  const campaignCalendly = normalizeCalendlyAutomation(campaign?.calendlyAutomation);
  let interviewLink =
    campaignCalendly.enabled && campaignCalendly.schedulingUrl
      ? campaignCalendly.schedulingUrl
      : "";

  const empty = {
    jobDescription:
      campaignJdEarly.length >= 20
        ? campaignJdEarly
        : buildFallbackJobDescription(null, campaign, contact),
    predefinedQuestions: [],
    interviewLink,
    planName: campaign?.name || "",
  };
  if (!planId) return empty;

  const plan = await WhatsAppOutreachPlan.findById(planId)
    .select("name jobDescription touchpoints calendlyAutomation")
    .lean();
  if (!plan) return empty;

  const senderFirstName = await getWhatsAppSenderFirstName(enrollment.userId);
  const predefinedQuestions = sortTouchpoints(plan.touchpoints)
    .filter((tp) => tp.isReplyFollowUp)
    .map((tp, idx) => ({
      index: idx + 1,
      order: tp.order,
      label: tp.label || `Reply question ${idx + 1}`,
      body: applyMergeFields(String(tp.body || ""), { contact, senderFirstName }).trim(),
    }));

  const storedJd = String(plan.jobDescription || "").trim();
  const campaignJd = String(campaign?.jobDescription || "").trim();
  const jobDescription =
    storedJd.length >= 20
      ? storedJd
      : campaignJd.length >= 20
        ? campaignJd
        : buildFallbackJobDescription(plan, campaign, contact);

  if (!interviewLink) {
    const calendly = normalizeCalendlyAutomation(plan.calendlyAutomation);
    if (calendly.enabled && calendly.schedulingUrl) {
      interviewLink = calendly.schedulingUrl;
    }
  }

  if (!interviewLink) {
    for (const tp of sortTouchpoints(plan.touchpoints)) {
      const link = extractCalendlyLink(tp.body);
      if (link) {
        interviewLink = link;
        break;
      }
    }
  }

  return {
    jobDescription,
    predefinedQuestions,
    interviewLink,
    planName: plan.name || campaign?.name || "",
  };
}

function buildPrompt({
  planName,
  jobDescription,
  predefinedQuestions,
  askedPredefinedCount,
  interviewLink,
  contactName,
  history,
  latestCandidateMessage,
}) {
  const predefinedBlock = predefinedQuestions.length
    ? predefinedQuestions
        .map((q) => {
          const status = q.index <= askedPredefinedCount ? "ASKED" : "PENDING";
          return `${q.index}. [${status}] ${q.body}`;
        })
        .join("\n")
    : "(none — use role context only)";

  return `Campaign / role: ${planName || "Outreach"}
Candidate name: ${contactName || "Candidate"}
Predefined questions asked so far: ${askedPredefinedCount} of ${predefinedQuestions.length}
Interview scheduling link available: ${interviewLink ? "yes" : "no"}
${interviewLink ? `Interview link (use only when appropriate): ${interviewLink}` : ""}

Job description (answer role questions from this only):
"""
${jobDescription}
"""

Predefined screening questions (in order):
${predefinedBlock}

Conversation history (oldest to latest):
${history || "(none)"}

Latest candidate message:
"""
${latestCandidateMessage}
"""

Return JSON:
{
  "decision": "reply | mark_interested | mark_not_interested | send_interview_link",
  "message": "text to send on WhatsApp",
  "predefinedQuestionIndex": 0,
  "summaryReason": "brief reason"
}`;
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

async function sendAndLogAiMessage({ enrollment, body, label, sequenceStepOrder = null }) {
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
    sequenceStepOrder,
    sequenceStepLabel: label,
    provider: sendResult?.provider || "meta",
    externalMessageId: sendResult?.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt: new Date(),
  });
}

function buildInterviewLinkMessage(interviewLink, contactName) {
  const first =
    String(contactName || "")
      .trim()
      .split(/\s+/)[0] || "there";
  return `Hi ${first}, here is the link to schedule your interview: ${interviewLink}`;
}

function buildInterestedClosingMessage(interviewLink) {
  if (interviewLink) {
    return `Great to hear you are interested and look like a strong fit. Please pick a time for your interview here: ${interviewLink}`;
  }
  return "Great to hear you are interested. Our hiring team will follow up with next steps shortly.";
}

function buildNotInterestedClosingMessage() {
  return "Thank you for your time. We appreciate your response and wish you all the best.";
}

async function finalizeInterviewLink({
  enrollment,
  inboundMessageId,
  currentDisposition,
  body,
  label,
}) {
  const now = new Date();
  await sendAndLogAiMessage({ enrollment, body, label });

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        replyDisposition: "interested",
        replyDispositionAt: now,
        lastWhatsAppAiHandledMessageId: String(inboundMessageId || ""),
        lastError: "Interview link sent — candidate interested",
        status: "paused",
        nextReplyFollowUpOrder: 0,
      },
    }
  );

  await incrementCampaignInterestCounter(
    enrollment.campaignId,
    currentDisposition,
    "interested"
  );

  notifyCampaignThreadUpdated(String(enrollment.userId), {
    campaignId: String(enrollment.campaignId),
    candidateKey: String(enrollment.candidateKey || ""),
    newMessages: 1,
    hasNewCandidateReply: false,
    source: "whatsapp_ai",
  });

  void maybeCompleteCampaign(String(enrollment.campaignId)).catch((err) => {
    console.error("[whatsapp-ai] maybeCompleteCampaign failed:", err?.message || err);
  });

  return { handled: true, decision: "send_interview_link" };
}

async function finalizeDisposition({
  enrollment,
  inboundMessageId,
  currentDisposition,
  finalDisposition,
  body,
  label,
}) {
  const now = new Date();
  await sendAndLogAiMessage({ enrollment, body, label });

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
        nextReplyFollowUpOrder: 0,
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

  void maybeCompleteCampaign(String(enrollment.campaignId)).catch((err) => {
    console.error("[whatsapp-ai] maybeCompleteCampaign failed:", err?.message || err);
  });

  return { handled: true, decision: finalDisposition };
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

  const campaign = await Campaign.findById(enrollment.campaignId)
    .select("name outreachPlanId jobDescription calendlyAutomation")
    .lean();
  if (!campaign) return { handled: false, reason: "missing_campaign" };

  const planContext = await loadWhatsAppPlanContext(campaign, enrollment);
  const { jobDescription, predefinedQuestions, interviewLink } = planContext;

  const messages = await CampaignWhatsAppMessage.find({
    enrollmentId: enrollment._id,
  })
    .sort({ sentAt: 1 })
    .limit(MAX_HISTORY_MESSAGES)
    .select("direction body sequenceStepLabel")
    .lean();

  const askedPredefinedCount = countAskedPredefined(messages);
  const latestCandidateMessage = String(inboundBody || "").trim();

  if (interviewLink && candidateRequestsInterviewLink(latestCandidateMessage)) {
    const body = buildInterviewLinkMessage(interviewLink, enrollment.contactName);
    return finalizeInterviewLink({
      enrollment,
      inboundMessageId,
      currentDisposition,
      body,
      label: "AI Interview link",
    });
  }

  const prompt = buildPrompt({
    planName: planContext.planName,
    jobDescription,
    predefinedQuestions,
    askedPredefinedCount,
    interviewLink,
    contactName: enrollment.contactName,
    history: formatHistory(messages),
    latestCandidateMessage,
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
  let message = String(ai?.message || "").trim();
  let predefinedIndex = Math.max(0, Math.floor(Number(ai?.predefinedQuestionIndex) || 0));

  if (decision === "send_interview_link") {
    if (interviewLink) {
      message = message.includes(interviewLink)
        ? message
        : buildInterviewLinkMessage(interviewLink, enrollment.contactName);
      return finalizeInterviewLink({
        enrollment,
        inboundMessageId,
        currentDisposition,
        body: message,
        label: "AI Interview link",
      });
    }
    decision = "reply";
    if (!message) {
      message =
        "Thanks for asking. Our team will share interview scheduling details with you shortly.";
    }
  }

  if (decision === "mark_interested") {
    if (!message) message = buildInterestedClosingMessage(interviewLink);
    else if (interviewLink && !message.includes(interviewLink)) {
      message = `${message}\n\n${interviewLink}`;
    }
    return finalizeDisposition({
      enrollment,
      inboundMessageId,
      currentDisposition,
      finalDisposition: "interested",
      body: message,
      label: "AI Qualification interested",
    });
  }

  if (decision === "mark_not_interested") {
    if (!message) message = buildNotInterestedClosingMessage();
    return finalizeDisposition({
      enrollment,
      inboundMessageId,
      currentDisposition,
      finalDisposition: "not_interested",
      body: message,
      label: "AI Qualification not_interested",
    });
  }

  if (!message) return { handled: false, reason: "empty_message" };

  const totalPredefined = predefinedQuestions.length;
  if (
    predefinedIndex > 0 &&
    predefinedIndex <= totalPredefined &&
    predefinedIndex <= askedPredefinedCount
  ) {
    const nextPending = askedPredefinedCount + 1;
    if (nextPending <= totalPredefined) predefinedIndex = nextPending;
    else predefinedIndex = 0;
  }

  const predefinedMeta =
    predefinedIndex > 0 && predefinedIndex <= totalPredefined
      ? predefinedQuestions[predefinedIndex - 1]
      : null;

  await sendAndLogAiMessage({
    enrollment,
    body: message,
    label: predefinedMeta
      ? `${PREDEFINED_LABEL_PREFIX}${predefinedIndex}`
      : "AI Qualification reply",
    sequenceStepOrder: predefinedMeta?.order ?? null,
  });

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        lastWhatsAppAiHandledMessageId: String(inboundMessageId || ""),
        lastError: predefinedMeta
          ? `Predefined question ${predefinedIndex} sent`
          : "AI qualification reply sent",
        status: "paused",
        nextReplyFollowUpOrder: 0,
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

  return {
    handled: true,
    decision: "reply",
    predefinedQuestionIndex: predefinedIndex || undefined,
  };
}

module.exports = {
  maybeHandleWhatsAppAiQualification,
  isWhatsAppAiEnabled,
};
