const mongoose = require("mongoose");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const UserIntegration = require("../models/UserIntegration");
const { sendCampaignEmail, resolveEmailProviderForSend } = require("./emailSendService");
const {
  getSenderFirstNameForEmail,
  resolveEmailIntegration,
} = require("./emailIntegrationService");
const { applyMergeFields, applyWhatsAppMergeFields } = require("./outreachMergeService");
const {
  assertWhatsAppReadyForSend,
  sendWhatsAppMessage,
  sendWhatsAppSessionMessage,
} = require("./whatsappSendService");
const { assertValidRecipientPhone, normalizeToE164 } = require("./whatsappPhoneUtils");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const { scheduledSendAt } = require("../utils/outreachScheduleUtils");
const { resolveContactsForOutreachModuleCampaign } = require("./outreachModuleContactResolver");
const {
  assertOutreachCreditsAvailable,
  outreachChannelToCreditChannel,
} = require("./outreachCreditsService");
const {
  assertGmailLaunchCapacity,
  reserveGmailDailySends,
  assertCanSendGmailToday,
  recordGmailSend,
} = require("./gmailDailySendLimitService");
const {
  ensureOutreachModuleVoiceAgent,
  launchOutreachModuleVoiceBulk,
  markOutreachModuleCandidatesVoiceQueued,
  parseVoiceStepMessage,
} = require("./outreachModuleVoiceService");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");

const SEND_BATCH_SIZE = Math.max(
  1,
  Math.min(50, Number(process.env.OUTREACH_SEND_BATCH_SIZE) || 20)
);

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function campaignOid(campaignId) {
  return new mongoose.Types.ObjectId(String(campaignId));
}

function parseStepMessage(message) {
  if (message == null) return { subject: "", body: "", templateId: "" };
  if (typeof message === "string") {
    const trimmed = message.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return {
            subject: String(parsed.subject || "").trim(),
            body: String(parsed.body || "").trim(),
            templateId: String(parsed.templateId || "").trim(),
          };
        }
      } catch {
        // fall through to plain body
      }
    }
    return { subject: "", body: trimmed, templateId: "" };
  }
  if (typeof message === "object") {
    return {
      subject: String(message.subject || "").trim(),
      body: String(message.body || "").trim(),
      templateId: String(message.templateId || "").trim(),
    };
  }
  return { subject: "", body: "", templateId: "" };
}

function stepDelayToTouchpoint(step) {
  const delayValue = Math.max(0, Number(step?.delayValue) || 0);
  const delayUnit = step?.delayUnit === "minutes" || step?.delayUnit === "hours" ? step.delayUnit : "days";
  if (delayValue <= 0) return { waitHours: 0, waitDays: 0, waitMinutes: 0 };
  if (delayUnit === "minutes") {
    return { waitHours: 0, waitDays: 0, waitMinutes: delayValue };
  }
  if (delayUnit === "hours") {
    return { waitHours: delayValue, waitDays: 0, waitMinutes: 0 };
  }
  return { waitHours: 0, waitDays: delayValue, waitMinutes: 0 };
}

/**
 * Flatten campaign config into an ordered execution plan (1-based order).
 */
function emailTouchpointDelayFields(tp, index, fallbackDays) {
  if (index === 0) {
    return { waitHours: 0, waitDays: 0, waitMinutes: 0 };
  }

  const waitMinutes = Math.max(0, Number(tp?.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(tp?.waitHours) || 0);
  const waitDays = Math.max(0, Number(tp?.waitDays) || 0);

  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return { waitHours: 0, waitDays: 0, waitMinutes };
  }
  if (waitHours > 0 && waitDays === 0) {
    return { waitHours: Math.max(1, waitHours), waitDays: 0, waitMinutes: 0 };
  }
  return {
    waitHours: 0,
    waitDays: Math.max(1, waitDays || fallbackDays || 1),
    waitMinutes: 0,
  };
}

function buildExecutionPlan(campaignDoc) {
  const plain = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  const steps = [];

  if (plain.mode === "multi") {
    const sequenceSteps = Array.isArray(plain.sequenceSteps) ? plain.sequenceSteps : [];
    for (let i = 0; i < sequenceSteps.length; i += 1) {
      const step = sequenceSteps[i];
      const parsed = parseStepMessage(step.message);
      const entry = {
        order: i + 1,
        channel: step.channel,
        label: String(step.label || `Step ${i + 1}`),
        condition: i === 0 ? "all" : step.condition || "no_response",
        delay: stepDelayToTouchpoint(step),
        subject: parsed.subject,
        body: parsed.body,
        templateId: parsed.templateId,
      };
      if (step.channel === "voice") {
        const voiceFields = parseVoiceStepMessage(step.message);
        entry.body = voiceFields.callObjective || voiceFields.body;
        entry.voiceMeta = {
          voiceTone: voiceFields.voiceTone,
          callAttempts: voiceFields.callAttempts,
          attemptGapHours: voiceFields.attemptGapHours,
          callPrompt: voiceFields.body,
        };
      }
      steps.push(entry);
    }
    return steps;
  }

  const channel = plain.channel || plain.channelMessage?.channel || "whatsapp";
  const msg = plain.channelMessage || {};

  if (channel === "whatsapp") {
    steps.push({
      order: 1,
      channel: "whatsapp",
      label: "Initial message",
      condition: "all",
      delay: { waitHours: 0, waitDays: 0, waitMinutes: 0 },
      subject: "",
      body: String(msg.body || "").trim(),
      templateId: String(msg.templateId || "").trim(),
    });
    if (String(msg.followUpBody || "").trim() || String(msg.followUpTemplateId || "").trim()) {
      steps.push({
        order: 2,
        channel: "whatsapp",
        label: "Follow-up 1",
        condition: "no_response",
        delay: {
          waitHours: Math.max(1, Number(msg.followUpWaitHours) || 48),
          waitDays: 0,
          waitMinutes: 0,
        },
        subject: "",
        body: String(msg.followUpBody || "").trim(),
        templateId: String(msg.followUpTemplateId || "").trim(),
      });
    }
    if (String(msg.followUp2Body || "").trim() || String(msg.followUp2TemplateId || "").trim()) {
      steps.push({
        order: 3,
        channel: "whatsapp",
        label: "Follow-up 2",
        condition: "no_response",
        delay: {
          waitHours: Math.max(1, Number(msg.followUp2WaitHours) || 96),
          waitDays: 0,
          waitMinutes: 0,
        },
        subject: "",
        body: String(msg.followUp2Body || "").trim(),
        templateId: String(msg.followUp2TemplateId || "").trim(),
      });
    }
    return steps;
  }

  if (channel === "email") {
    const EMAIL_STEP_LABELS = ["Introduction", "Follow-up 1", "Follow-up 2", "Final follow-up"];
    const EMAIL_STEP_WAITS = [0, 3, 4, 5];
    const touchpoints =
      Array.isArray(msg.emailTouchpoints) && msg.emailTouchpoints.length > 0
        ? msg.emailTouchpoints
        : [
            {
              order: 1,
              label: EMAIL_STEP_LABELS[0],
              subject: String(msg.subject || "").trim(),
              body: String(msg.body || "").trim(),
              waitDays: 0,
            },
          ];

    touchpoints.forEach((tp, index) => {
      const subject = String(tp.subject || "").trim();
      const body = String(tp.body || "").trim();
      if (!subject && !body) return;

      steps.push({
        order: steps.length + 1,
        channel: "email",
        label: String(tp.label || EMAIL_STEP_LABELS[index] || `Email ${index + 1}`).trim(),
        condition: index === 0 ? "all" : "no_response",
        delay: emailTouchpointDelayFields(tp, index, EMAIL_STEP_WAITS[index]),
        subject,
        body,
        templateId: "",
      });
    });
    return steps;
  }

  if (channel === "voice") {
    steps.push({
      order: 1,
      channel: "voice",
      label: "AI voice call",
      condition: "all",
      delay: { waitHours: 0, waitDays: 0, waitMinutes: 0 },
      subject: "",
      body: String(msg.callObjective || "").trim(),
      templateId: "",
      voiceMeta: {
        voiceTone: msg.voiceTone || "professional",
        callAttempts: Math.max(1, Number(msg.callAttempts) || 1),
        attemptGapHours: Math.max(0, Number(msg.attemptGapHours) || 24),
        callPrompt: String(msg.body || "").trim(),
      },
    });
    return steps;
  }

  return steps;
}

function getExecutionStep(plan, order) {
  const step = Number(order) || 1;
  return plan.find((item) => item.order === step) || null;
}

function campaignPayloadForMerge(campaignDoc) {
  const plain = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  return {
    _id: plain._id,
    name: plain.name || "",
    jobTitle: plain.jobTitle || "",
    jobDescription: plain.jobDescription || "",
    goal: plain.goal || "interest",
  };
}

function hasAutomatableSteps(plan) {
  return plan.some(
    (step) => step.channel === "whatsapp" || step.channel === "email" || step.channel === "voice"
  );
}

function isVoiceOnlyPlan(plan) {
  return plan.length > 0 && plan.every((step) => step.channel === "voice");
}

function hasSendableSteps(plan) {
  return hasAutomatableSteps(plan);
}

function channelsInPlan(plan) {
  const channels = new Set();
  for (const step of plan) {
    if (step.channel === "whatsapp" || step.channel === "email" || step.channel === "voice") {
      channels.add(step.channel);
    }
  }
  return [...channels];
}

async function getWhatsAppSenderFirstName(userId) {
  const doc = await UserIntegration.findOne({
    userId: userOid(userId),
    provider: "whatsapp",
  })
    .select("senderName email")
    .lean();
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  return "";
}

async function claimModuleEnrollmentForSend(enrollment) {
  const now = new Date();
  const stepOrder = enrollment.currentStepOrder || 1;
  const sentCount = enrollment.sentCount || 0;
  const processingUntil = new Date(now.getTime() + 10 * 60 * 1000);

  const claimFilter = {
    _id: enrollment._id,
    status: "active",
    currentStepOrder: stepOrder,
    sentCount,
    nextSendAt: { $lte: now },
  };
  if (stepOrder > 1) {
    claimFilter.hasReply = { $ne: true };
  }

  return OutreachModuleEnrollment.findOneAndUpdate(
    claimFilter,
    { $set: { nextSendAt: processingUntil } },
    { returnDocument: "after" }
  ).lean();
}

async function updateEmbeddedCandidateAfterSend(campaignId, candidateRefId, update) {
  const campaign = await OutreachModuleCampaign.findById(campaignId);
  if (!campaign) return;

  const candidate = (campaign.candidates || []).find(
    (c) => String(c.candidateRefId) === String(candidateRefId)
  ) || (update.matchEmail
    ? (campaign.candidates || []).find(
        (c) =>
          String(c.email || "").trim().toLowerCase() ===
          String(update.matchEmail).trim().toLowerCase()
      )
    : null);
  if (!candidate) return;

  if (update.channel) candidate.channel = update.channel;
  if (update.lastStep) candidate.lastStep = update.lastStep;
  if (update.nextAction) candidate.nextAction = update.nextAction;
  if (update.responseStatus) candidate.responseStatus = update.responseStatus;
  if (update.lastResponse) candidate.lastResponse = update.lastResponse;

  if (update.interaction) {
    candidate.interactions.push({
      type: update.interaction.type,
      summary: update.interaction.summary,
      content: update.interaction.content ?? null,
      at: new Date(),
    });
  }

  campaign.markModified("candidates");
  await campaign.save();

  const { recomputeCampaignDocStatsById } = require("./outreachModuleCampaignService");
  await recomputeCampaignDocStatsById(campaignId);
}

function getCampaignReplyQuestions(campaignDoc) {
  const msg = campaignDoc?.channelMessage || {};
  return (Array.isArray(msg.replyQuestions) ? msg.replyQuestions : [])
    .map((question) => String(question || "").trim())
    .filter(Boolean);
}

function enrollmentAwaitingReplyQuestions(enrollment, campaignDoc) {
  const questions = getCampaignReplyQuestions(campaignDoc);
  const nextIndex = Number(enrollment?.nextReplyQuestionIndex);
  return questions.length > 0 && nextIndex >= 0 && nextIndex < questions.length;
}

async function markEnrollmentAwaitingReplyFlow(enrollmentId, { sentCount = 0, sendMeta = {} } = {}) {
  const now = new Date();
  await OutreachModuleEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        status: "paused",
        sentCount,
        lastSentAt: now,
        nextSendAt: null,
        lastMessageId: sendMeta.messageId || "",
        lastThreadId: sendMeta.threadId || "",
        lastError: "",
      },
    }
  );
}

async function resolveEnrollmentCampaignDoc(enrollmentId, campaignDoc = null) {
  if (campaignDoc) return campaignDoc;
  const enrollment = await OutreachModuleEnrollment.findById(enrollmentId).lean();
  if (!enrollment?.outreachModuleCampaignId) return null;
  return OutreachModuleCampaign.findById(enrollment.outreachModuleCampaignId).lean();
}

async function advanceEnrollmentAfterSend({
  enrollmentId,
  plan,
  currentStepOrder,
  sentCount,
  sendMeta = {},
  campaignDoc = null,
}) {
  const now = new Date();
  const nextOrder = currentStepOrder + 1;
  const nextStep = getExecutionStep(plan, nextOrder);

  if (!nextStep) {
    const enrollment = await OutreachModuleEnrollment.findById(enrollmentId).lean();
    const campaign = await resolveEnrollmentCampaignDoc(enrollmentId, campaignDoc);
    if (enrollment && campaign && enrollmentAwaitingReplyQuestions(enrollment, campaign)) {
      await markEnrollmentAwaitingReplyFlow(enrollmentId, { sentCount, sendMeta });
      return;
    }

    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "completed",
          sentCount,
          lastSentAt: now,
          lastMessageId: sendMeta.messageId || "",
          lastThreadId: sendMeta.threadId || "",
          lastError: "",
        },
      }
    );
    return;
  }

  const nextSendAt = scheduledSendAt(now, nextStep.delay);
  await OutreachModuleEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        status: "active",
        currentStepOrder: nextOrder,
        nextSendAt,
        sentCount,
        lastSentAt: now,
        lastMessageId: sendMeta.messageId || "",
        lastThreadId: sendMeta.threadId || "",
        lastError: "",
      },
    }
  );
}

async function skipToNextStep({
  enrollmentId,
  plan,
  currentStepOrder,
  sentCount,
  reason,
  campaignDoc = null,
}) {
  const now = new Date();
  let order = currentStepOrder + 1;
  let nextStep = getExecutionStep(plan, order);

  while (nextStep && nextStep.channel === "linkedin") {
    order += 1;
    nextStep = getExecutionStep(plan, order);
  }

  if (!nextStep) {
    const enrollment = await OutreachModuleEnrollment.findById(enrollmentId).lean();
    const campaign = await resolveEnrollmentCampaignDoc(enrollmentId, campaignDoc);
    if (enrollment && campaign && enrollmentAwaitingReplyQuestions(enrollment, campaign)) {
      await markEnrollmentAwaitingReplyFlow(enrollmentId, { sentCount });
      return;
    }

    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: sentCount > 0 ? "completed" : "skipped",
          sentCount,
          lastError: reason || "",
        },
      }
    );
    return;
  }

  const nextSendAt = scheduledSendAt(now, nextStep.delay);
  await OutreachModuleEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        status: "active",
        currentStepOrder: nextStep.order,
        nextSendAt,
        sentCount,
        lastError: reason || "",
      },
    }
  );
}

async function processEmailStep({
  enrollment,
  campaignDoc,
  step,
  integrationId,
}) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.outreachModuleCampaignId);
  const email = String(enrollment.contactEmail || "").trim();

  if (!email.includes("@")) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "skipped", lastError: "No valid email on file" } }
    );
    return;
  }

  const senderFirstName = await getSenderFirstNameForEmail(userId, integrationId);
  const contact = {
    name: enrollment.contactName,
    email: enrollment.contactEmail,
    phone: enrollment.contactPhone,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };
  const campaign = campaignPayloadForMerge(campaignDoc);
  const defaultSubject = campaign.jobTitle
    ? `Opportunity: ${campaign.jobTitle}`
    : `Opportunity from ${campaign.name || "our team"}`;
  const subject = applyMergeFields(step.subject || defaultSubject, {
    contact,
    senderFirstName,
    campaign,
  }).trim();
  const body = applyMergeFields(String(step.body || ""), {
    contact,
    senderFirstName,
    campaign,
  }).trim();

  if (!body) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: `Email step ${step.order} has an empty message body`,
        },
      }
    );
    return;
  }

  let sendResult;
  try {
    const emailProvider = await resolveEmailProviderForSend(userId, integrationId);
    if (emailProvider === "gmail") {
      await assertCanSendGmailToday(userId, integrationId);
    }
    sendResult = await sendCampaignEmail(
      userId,
      { to: email, subject, body },
      { integrationId }
    );
    if (emailProvider === "gmail") {
      await recordGmailSend(userId, integrationId);
    }
  } catch (err) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "Email send failed",
        },
      }
    );
    return;
  }

  const sentCount = (enrollment.sentCount || 0) + 1;
  const plan = buildExecutionPlan(campaignDoc);

  await updateEmbeddedCandidateAfterSend(campaignId, enrollment.candidateRefId, {
    channel: "Email",
    lastStep: step.label,
    nextAction: "Awaiting reply",
    matchEmail: enrollment.contactEmail,
    incrementSent: true,
    interaction: {
      type: "email",
      summary: `Sent: ${subject}`,
      content: { subject, bodyPreview: body.slice(0, 280), stepOrder: step.order },
    },
  });

  await advanceEnrollmentAfterSend({
    enrollmentId,
    plan,
    currentStepOrder: step.order,
    sentCount,
    sendMeta: sendResult,
    campaignDoc,
  });

  const { recordOutboundSentMessage } = require("./campaignReplySyncService");
  await recordOutboundSentMessage({
    enrollment: {
      ...enrollment,
      campaignId: enrollment.outreachModuleCampaignId,
      candidateKey: enrollment.candidateRefId,
    },
    sendResult,
    subject,
    body,
    toEmail: email,
  });
}

async function processWhatsAppStep({ enrollment, campaignDoc, step }) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.outreachModuleCampaignId);
  const candidateKey = String(enrollment.candidateRefId || "");

  let normalizedPhone;
  try {
    normalizedPhone = assertValidRecipientPhone(enrollment.contactPhone);
  } catch {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "skipped", lastError: "No valid phone on file" } }
    );
    return;
  }

  const senderFirstName = await getWhatsAppSenderFirstName(userId);
  const contact = {
    name: enrollment.contactName,
    email: enrollment.contactEmail,
    phone: enrollment.contactPhone,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };
  const campaign = campaignPayloadForMerge(campaignDoc);
  const templateId = String(step.templateId || "").trim();
  const body = applyWhatsAppMergeFields(String(step.body || ""), {
    contact,
    senderFirstName,
    campaign,
    templateId,
  }).trim();

  if (!templateId && !body) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: `WhatsApp step ${step.order} needs a template or message body`,
        },
      }
    );
    return;
  }

  let sendResult;
  try {
    sendResult = await sendWhatsAppMessage(userId, {
      to: normalizedPhone,
      body,
      templateId,
      contact,
      senderFirstName,
      campaign,
    });
  } catch (err) {
    await logCampaignWhatsAppMessage({
      userId,
      campaignId,
      enrollmentId,
      candidateKey,
      contactPhone: enrollment.contactPhone,
      direction: "outbound",
      body,
      sequenceStepOrder: step.order,
      sequenceStepLabel: step.label,
      provider: "",
      externalMessageId: "",
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "WhatsApp send failed",
      sentAt: new Date(),
    });
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "WhatsApp send failed",
        },
      }
    );
    await updateEmbeddedCandidateAfterSend(campaignId, enrollment.candidateRefId, {
      responseStatus: "failed_delivery",
      nextAction: "Retry or update contact",
    });
    return;
  }

  await logCampaignWhatsAppMessage({
    userId,
    campaignId,
    enrollmentId,
    candidateKey,
    contactPhone: enrollment.contactPhone,
    direction: "outbound",
    body,
    sequenceStepOrder: step.order,
    sequenceStepLabel: step.label,
    provider: sendResult?.provider || "meta",
    externalMessageId: sendResult?.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt: new Date(),
  });

  const sentCount = (enrollment.sentCount || 0) + 1;
  const plan = buildExecutionPlan(campaignDoc);

  await updateEmbeddedCandidateAfterSend(campaignId, enrollment.candidateRefId, {
    channel: "WhatsApp",
    lastStep: step.label,
    nextAction: "Awaiting reply",
    incrementSent: true,
    interaction: {
      type: "whatsapp",
      summary: `Sent: ${step.label}`,
      content: { bodyPreview: body.slice(0, 280), stepOrder: step.order },
    },
  });

  await advanceEnrollmentAfterSend({
    enrollmentId,
    plan,
    currentStepOrder: step.order,
    sentCount,
    sendMeta: { messageId: sendResult?.messageId || "" },
    campaignDoc,
  });
}

async function processVoiceStep({ enrollment, campaignDoc, step }) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.outreachModuleCampaignId);

  if (!normalizeToWhatsAppDigits(enrollment.contactPhone)) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "skipped", lastError: "No valid phone on file" } }
    );
    return;
  }

  const stepVoiceConfig = {
    callObjective: String(step.body || "").trim(),
    body: String(step.voiceMeta?.callPrompt || campaignDoc?.channelMessage?.body || "").trim(),
    voiceTone: step.voiceMeta?.voiceTone || campaignDoc?.channelMessage?.voiceTone || "professional",
    callAttempts:
      step.voiceMeta?.callAttempts ?? campaignDoc?.channelMessage?.callAttempts ?? 1,
    attemptGapHours:
      step.voiceMeta?.attemptGapHours ?? campaignDoc?.channelMessage?.attemptGapHours ?? 24,
  };

  try {
    await ensureOutreachModuleVoiceAgent(campaignDoc, { stepVoiceConfig });
  } catch (err) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "Voice agent setup failed",
        },
      }
    );
    return;
  }

  const contact = {
    candidateRefId: enrollment.candidateRefId,
    candidateKey: enrollment.candidateRefId,
    name: enrollment.contactName,
    email: enrollment.contactEmail,
    phone: enrollment.contactPhone,
    role: enrollment.contactRole,
    company: enrollment.contactCompany,
  };

  let launchResult;
  try {
    launchResult = await launchOutreachModuleVoiceBulk(userId, campaignDoc, [contact]);
  } catch (err) {
    await OutreachModuleEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "AI voice call failed",
        },
      }
    );
    return;
  }

  const sentCount = (enrollment.sentCount || 0) + 1;
  const plan = buildExecutionPlan(campaignDoc);

  await updateEmbeddedCandidateAfterSend(campaignId, enrollment.candidateRefId, {
    channel: "Voice",
    lastStep: step.label,
    nextAction: "Call placed",
    incrementSent: true,
    interaction: {
      type: "voice",
      summary: `Placed: ${step.label}`,
      content: {
        stepOrder: step.order,
        requestId: launchResult.requestId || "",
        status: "queued",
      },
    },
  });

  await advanceEnrollmentAfterSend({
    enrollmentId,
    plan,
    currentStepOrder: step.order,
    sentCount,
    sendMeta: { messageId: launchResult.requestId || "" },
    campaignDoc,
  });
}

async function processOutreachModuleEnrollmentDoc(enrollment) {
  const campaignDoc = await OutreachModuleCampaign.findById(enrollment.outreachModuleCampaignId);
  if (!campaignDoc || !["active", "completed"].includes(campaignDoc.status)) {
    return;
  }

  const claimed = await claimModuleEnrollmentForSend(enrollment);
  if (!claimed) return;

  const plan = buildExecutionPlan(campaignDoc);
  const step = getExecutionStep(plan, claimed.currentStepOrder || 1);
  if (!step) {
    await OutreachModuleEnrollment.updateOne(
      { _id: claimed._id },
      { $set: { status: "completed", lastError: "" } }
    );
    return;
  }

  if (step.condition === "no_response" && claimed.hasReply) {
    await skipToNextStep({
      enrollmentId: claimed._id,
      plan,
      currentStepOrder: step.order,
      sentCount: claimed.sentCount || 0,
      reason: "Reply received — no-reply step skipped",
      campaignDoc,
    });
    return;
  }

  if (step.channel === "linkedin") {
    await skipToNextStep({
      enrollmentId: claimed._id,
      plan,
      currentStepOrder: step.order,
      sentCount: claimed.sentCount || 0,
      reason: `${step.channel} steps are not automated yet`,
    });
    await updateEmbeddedCandidateAfterSend(
      String(claimed.outreachModuleCampaignId),
      claimed.candidateRefId,
      {
        lastStep: step.label,
        nextAction: "Manual LinkedIn outreach",
        interaction: {
          type: "note",
          summary: `${step.label} skipped (automation not available)`,
          content: { channel: step.channel, stepOrder: step.order },
        },
      }
    );
    return;
  }

  if (step.channel === "voice") {
    await processVoiceStep({ enrollment: claimed, campaignDoc, step });
    return;
  }

  const integrationId = campaignDoc.emailIntegrationId
    ? String(campaignDoc.emailIntegrationId)
    : null;

  if (step.channel === "email") {
    await processEmailStep({
      enrollment: claimed,
      campaignDoc,
      step,
      integrationId,
    });
    return;
  }

  if (step.channel === "whatsapp") {
    await processWhatsAppStep({ enrollment: claimed, campaignDoc, step });
  }
}

async function upsertModuleEnrollment({
  campaignDoc,
  userId,
  contact,
  now,
}) {
  const campaignId = campaignDoc._id;
  const candidateRefId = String(contact.candidateRefId || "").trim();
  if (!candidateRefId) return "skipped";

  const plan = buildExecutionPlan(campaignDoc);
  const firstStep = plan[0];
  if (!firstStep) return "skipped";

  const isWhatsApp = firstStep.channel === "whatsapp";
  const hasContact = isWhatsApp
    ? Boolean(String(contact.phone || "").trim())
    : Boolean(String(contact.email || "").includes("@"));

  if (!hasContact) {
    await OutreachModuleEnrollment.findOneAndUpdate(
      { outreachModuleCampaignId: campaignId, candidateRefId },
      {
        $set: {
          userId: userOid(userId),
          contactEmail: contact.email || "",
          contactPhone: contact.phone || "",
          contactName: contact.name || "",
          contactRole: contact.role || "",
          contactCompany: contact.company || "",
          status: "skipped",
          lastError: isWhatsApp ? "No phone on file" : "No email on file",
          nextSendAt: now,
        },
      },
      { upsert: true }
    );
    return "skipped";
  }

  const firstSendAt = scheduledSendAt(now, firstStep.delay);
  const replyQuestions = getCampaignReplyQuestions(campaignDoc);
  const nextReplyQuestionIndex =
    isWhatsApp && replyQuestions.length > 0 ? 0 : -1;

  await OutreachModuleEnrollment.findOneAndUpdate(
    { outreachModuleCampaignId: campaignId, candidateRefId },
    {
      $set: {
        userId: userOid(userId),
        contactEmail: contact.email || "",
        contactPhone: contact.phone || "",
        contactName: contact.name || "",
        contactRole: contact.role || "",
        contactCompany: contact.company || "",
        currentStepOrder: 1,
        status: "active",
        nextSendAt: firstSendAt,
        lastError: "",
        sentCount: 0,
        hasReply: false,
        replyCount: 0,
        lastReplyAt: null,
        nextReplyQuestionIndex,
        replyDisposition: "unknown",
        replyDispositionAt: null,
        autoReplyCount: 0,
        lastAutoRepliedToMessageId: "",
        lastAutoReplyAt: null,
        lastReplySyncedAt: null,
      },
      $unset: {
        lastSentAt: 1,
        lastMessageId: 1,
        lastThreadId: 1,
      },
    },
    { upsert: true }
  );
  return "enrolled";
}

/**
 * Enroll all candidates and start the outreach sequence clock.
 */
async function launchOutreachModuleSequence(actorUserId, campaignDoc, options = {}) {
  const plan = buildExecutionPlan(campaignDoc);
  if (plan.length === 0) {
    const err = new Error("Add at least one outreach step before launching.");
    err.statusCode = 400;
    throw err;
  }
  if (!hasAutomatableSteps(plan)) {
    const err = new Error(
      "Automated sending supports WhatsApp, email, and AI voice calls. Add at least one supported step."
    );
    err.statusCode = 400;
    throw err;
  }

  const contacts = await resolveContactsForOutreachModuleCampaign(campaignDoc, actorUserId);
  if (contacts.length === 0) {
    const err = new Error("No candidates found for this campaign.");
    err.statusCode = 400;
    throw err;
  }

  if (isVoiceOnlyPlan(plan)) {
    await ensureOutreachModuleVoiceAgent(campaignDoc);
    const dialableContacts = contacts.filter((contact) =>
      Boolean(normalizeToWhatsAppDigits(contact.phone))
    );
    const launchResult = await launchOutreachModuleVoiceBulk(
      actorUserId,
      campaignDoc,
      dialableContacts
    );
    await markOutreachModuleCandidatesVoiceQueued(String(campaignDoc._id), dialableContacts, {
      requestId: launchResult.requestId,
    });
    return {
      enrolled: 0,
      skipped: Math.max(0, contacts.length - launchResult.dialedCount),
      touchpointCount: plan.length,
      voiceDialed: launchResult.dialedCount,
      voiceRequestId: launchResult.requestId,
    };
  }

  const channels = channelsInPlan(plan);
  if (channels.includes("whatsapp")) {
    await assertWhatsAppReadyForSend(actorUserId);
    await assertOutreachCreditsAvailable(
      actorUserId,
      outreachChannelToCreditChannel("whatsapp"),
      contacts.length
    );
  }
  if (channels.includes("email")) {
    await assertOutreachCreditsAvailable(
      actorUserId,
      outreachChannelToCreditChannel("gmail"),
      contacts.length
    );
  }

  let emailIntegration = null;
  if (channels.includes("email")) {
    emailIntegration = await resolveEmailIntegration(actorUserId, options.emailIntegrationId);
    campaignDoc.emailIntegrationId = emailIntegration._id;
    if (emailIntegration.provider === "gmail") {
      const emailContacts = contacts.filter((c) => String(c.email || "").includes("@"));
      await assertGmailLaunchCapacity(actorUserId, emailContacts, String(emailIntegration._id));
    }
  }

  const now = new Date();
  let enrolled = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const result = await upsertModuleEnrollment({
      campaignDoc,
      userId: actorUserId,
      contact,
      now,
    });
    if (result === "enrolled") enrolled += 1;
    else skipped += 1;
  }

  if (channels.includes("email") && enrolled > 0 && emailIntegration?.provider === "gmail") {
    await reserveGmailDailySends(actorUserId, enrolled, String(emailIntegration._id));
  }

  if (enrolled > 0) {
    setImmediate(() => {
      processDueOutreachModuleEnrollments().catch((err) => {
        console.error(
          "[outreach-module-send] post-launch send tick:",
          err?.message || err
        );
      });
    });
  }

  return { enrolled, skipped, touchpointCount: plan.length };
}

async function pauseOutreachModuleEnrollments(campaignId) {
  await OutreachModuleEnrollment.updateMany(
    {
      outreachModuleCampaignId: campaignOid(campaignId),
      status: "active",
    },
    { $set: { status: "paused" } }
  );
}

async function resumeOutreachModuleEnrollments(campaignId) {
  const now = new Date();
  const paused = await OutreachModuleEnrollment.find({
    outreachModuleCampaignId: campaignOid(campaignId),
    status: "paused",
  }).lean();

  let resumed = 0;
  for (const row of paused) {
    if (row.hasReply) continue;
    await OutreachModuleEnrollment.updateOne(
      { _id: row._id },
      {
        $set: {
          status: "active",
          nextSendAt: now,
          lastError: "",
        },
      }
    );
    resumed += 1;
  }

  if (resumed > 0) {
    setImmediate(() => {
      processDueOutreachModuleEnrollments().catch((err) => {
        console.error("[outreach-module-send] post-resume send tick:", err?.message || err);
      });
    });
  }

  return { resumed };
}

async function deleteOutreachModuleEnrollments(campaignId) {
  await OutreachModuleEnrollment.deleteMany({
    outreachModuleCampaignId: campaignOid(campaignId),
  });
}

async function processDueOutreachModuleEnrollments() {
  const now = new Date();
  const activeCampaignIds = await OutreachModuleCampaign.find({
    status: { $in: ["active", "completed"] },
  })
    .distinct("_id")
    .lean();

  if (activeCampaignIds.length === 0) return 0;

  const due = await OutreachModuleEnrollment.find({
    status: "active",
    nextSendAt: { $lte: now },
    outreachModuleCampaignId: { $in: activeCampaignIds },
  })
    .sort({ nextSendAt: 1 })
    .limit(SEND_BATCH_SIZE)
    .lean();

  let processed = 0;
  for (const enrollment of due) {
    try {
      await processOutreachModuleEnrollmentDoc(enrollment);
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[outreach-module-send] enrollment ${enrollment._id}:`, message);
      await OutreachModuleEnrollment.updateOne(
        { _id: enrollment._id },
        {
          $set: {
            status: "failed",
            lastError: message.slice(0, 500),
          },
        }
      );
    }
  }

  if (processed > 0) {
    console.log(`[outreach-module-send] processed ${processed} due enrollment(s)`);
  }

  return processed;
}

async function maybeSendOutreachModuleReplyQuestion(enrollment, campaignDoc) {
  const nextIndex = Number(enrollment?.nextReplyQuestionIndex);
  if (nextIndex < 0) return { sent: false };

  const replyQuestions = getCampaignReplyQuestions(campaignDoc);
  if (nextIndex >= replyQuestions.length) return { sent: false };

  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.outreachModuleCampaignId);
  const candidateKey = String(enrollment.candidateRefId || "");

  let normalizedPhone;
  try {
    normalizedPhone = assertValidRecipientPhone(enrollment.contactPhone);
  } catch {
    return { sent: false };
  }

  const contact = {
    name: enrollment.contactName,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };
  const senderFirstName = await getWhatsAppSenderFirstName(userId);
  const campaign = campaignPayloadForMerge(campaignDoc);
  const body = applyWhatsAppMergeFields(replyQuestions[nextIndex], {
    contact,
    senderFirstName,
    campaign,
  }).trim();
  if (!body) return { sent: false };

  const sendResult = await sendWhatsAppSessionMessage(userId, {
    to: normalizedPhone,
    body,
  });

  const label = `Qualification question ${nextIndex + 1}`;
  await logCampaignWhatsAppMessage({
    userId,
    campaignId,
    enrollmentId: String(enrollment._id),
    candidateKey,
    contactPhone: enrollment.contactPhone,
    direction: "outbound",
    body,
    sequenceStepOrder: 4 + nextIndex,
    sequenceStepLabel: label,
    provider: sendResult?.provider || "",
    externalMessageId: sendResult?.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt: new Date(),
  });

  const nextReplyQuestionIndex =
    nextIndex + 1 < replyQuestions.length ? nextIndex + 1 : -1;
  const sentCount = (Number(enrollment.sentCount) || 0) + 1;
  const allDone = nextReplyQuestionIndex < 0;

  await updateEmbeddedCandidateAfterSend(campaignId, enrollment.candidateRefId, {
    channel: "WhatsApp",
    lastStep: label,
    nextAction: allDone ? "Qualification complete" : "Awaiting reply",
    responseStatus: "replied",
    incrementSent: true,
    interaction: {
      type: "whatsapp",
      summary: `Sent: ${label}`,
      content: { bodyPreview: body.slice(0, 280), questionIndex: nextIndex + 1 },
    },
  });

  await OutreachModuleEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        nextReplyQuestionIndex: allDone ? -1 : nextReplyQuestionIndex,
        sentCount,
        lastSentAt: new Date(),
        lastMessageId: sendResult?.messageId || "",
        lastError: "",
        status: allDone ? "completed" : "paused",
        nextSendAt: null,
      },
    }
  );

  return { sent: true, index: nextIndex };
}

async function handleOutreachModuleInboundWhatsApp({
  enrollment,
  provider,
  externalMessageId,
  body,
  fromNumber,
  sentAt,
}) {
  const normalizedFromPhone = normalizeToE164(fromNumber) || fromNumber;
  const campaignDoc = await OutreachModuleCampaign.findById(enrollment.outreachModuleCampaignId).lean();
  if (!campaignDoc) {
    return { action: "skipped", reason: "campaign_not_found" };
  }

  const exists = await CampaignWhatsAppMessage.findOne({
    provider,
    externalMessageId,
    direction: "inbound",
  })
    .select("_id")
    .lean();
  if (exists) {
    return { action: "skipped", reason: "duplicate", externalMessageId };
  }

  const campaignId = String(enrollment.outreachModuleCampaignId);
  const candidateKey = String(enrollment.candidateRefId || "");
  const userId = String(enrollment.userId);

  await logCampaignWhatsAppMessage({
    userId,
    campaignId,
    enrollmentId: String(enrollment._id),
    candidateKey,
    contactPhone: normalizedFromPhone || enrollment.contactPhone || fromNumber,
    direction: "inbound",
    body,
    sequenceStepOrder: null,
    sequenceStepLabel: "",
    provider,
    externalMessageId,
    status: "sent",
    errorMessage: "",
    sentAt,
  });

  const replyCount = Math.max(0, Number(enrollment.replyCount) || 0) + 1;

  await updateEmbeddedCandidateAfterSend(campaignId, enrollment.candidateRefId, {
    responseStatus: "replied",
    nextAction: "Processing reply",
    interaction: {
      type: "whatsapp",
      summary: "Candidate replied",
      content: { bodyPreview: String(body || "").slice(0, 280) },
    },
  });

  await OutreachModuleEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        hasReply: true,
        replyCount,
        lastReplyAt: sentAt,
        contactPhone: normalizedFromPhone || enrollment.contactPhone || fromNumber,
        status: "paused",
        nextSendAt: null,
        lastError: replyCount === 1 ? "Candidate replied" : enrollment.lastError || "",
      },
    }
  );

  const freshEnrollment = await OutreachModuleEnrollment.findById(enrollment._id).lean();
  if (freshEnrollment) {
    const questions = getCampaignReplyQuestions(campaignDoc);
    if (questions.length > 0 && Number(freshEnrollment.nextReplyQuestionIndex) < 0) {
      const inferredIndex = Math.min(
        Math.max(0, replyCount - 1),
        questions.length - 1
      );
      await OutreachModuleEnrollment.updateOne(
        { _id: enrollment._id },
        { $set: { nextReplyQuestionIndex: inferredIndex } }
      );
      freshEnrollment.nextReplyQuestionIndex = inferredIndex;
    }
    await maybeSendOutreachModuleReplyQuestion(freshEnrollment, campaignDoc);
  }

  return {
    action: "stored",
    externalMessageId,
    enrollmentId: String(enrollment._id),
    campaignId,
  };
}

module.exports = {
  buildExecutionPlan,
  launchOutreachModuleSequence,
  pauseOutreachModuleEnrollments,
  resumeOutreachModuleEnrollments,
  deleteOutreachModuleEnrollments,
  processDueOutreachModuleEnrollments,
  handleOutreachModuleInboundWhatsApp,
  updateEmbeddedCandidateAfterSend,
};
