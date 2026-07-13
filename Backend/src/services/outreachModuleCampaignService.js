const mongoose = require("mongoose");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const SavedCandidate = require("../models/SavedCandidate");
const { userIdFilterForActor } = require("../utils/orgScope");
const {
  normalizePostQualification,
  normalizePostQualificationVoice,
} = require("./postQualificationService");
const { resolveContactsForOutreachModuleCampaign, readContactFromRawDoc, normalizeEmail, normalizePhone } = require("./outreachModuleContactResolver");
const {
  launchOutreachModuleSequence,
  pauseOutreachModuleEnrollments,
  resumeOutreachModuleEnrollments,
  deleteOutreachModuleEnrollments,
} = require("./outreachModuleSendService");
const { syncOutreachModuleCampaignEmailReplies, repairOutreachModuleFalsePositiveReplyFlags } = require("./campaignReplySyncService");
const { toReplyPreview } = require("./emailMimeBodyUtils");
const { syncReplyDispositionsForCampaign } = require("./replyDispositionUtils");

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  email: "Email",
  voice: "Voice",
  linkedin: "LinkedIn",
};

const SINGLE_BUILDER_STEPS = ["details", "channel", "message", "candidates"];
const MULTI_BUILDER_STEPS = ["details", "sequence", "personalize", "candidates"];

function stepKeysForMode(mode) {
  return mode === "multi" ? MULTI_BUILDER_STEPS : SINGLE_BUILDER_STEPS;
}

function defaultBuilderForMode() {
  return {
    currentStep: 0,
    completedSteps: [],
    details: { goal: "interest" },
    channel: {},
    message: { aiPersonalize: true, channelMessage: {} },
    sequence: { steps: [] },
    personalize: { aiPersonalize: true, stepMessages: [], whatsappReplyQuestions: [] },
    candidates: { candidateSource: "talent_pool", candidateIds: [] },
  };
}

function normalizeCalendlyAutomation(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: Boolean(o.enabled),
    meetingUri: String(o.meetingUri || "").trim(),
    meetingName: String(o.meetingName || "").trim(),
    schedulingUrl: String(o.schedulingUrl || "").trim(),
    durationMinutes: Math.max(0, Number(o.durationMinutes) || 0),
    kind: String(o.kind || "").trim(),
  };
}

function syncCalendlyWithPostQualification(calendlyAutomation, postQualification) {
  const calendly = normalizeCalendlyAutomation(calendlyAutomation);
  const postQual = normalizePostQualification(postQualification, {
    calendlyAutomation: calendly,
  });
  if (postQual.schedulingEnabled && calendly.schedulingUrl) {
    calendly.enabled = true;
  }
  return { calendlyAutomation: calendly, postQualification: postQual };
}

function applyPostQualificationPayload(doc, payload = {}) {
  if (payload.postQualification === undefined && payload.calendlyAutomation === undefined) {
    return;
  }
  const synced = syncCalendlyWithPostQualification(
    payload.calendlyAutomation !== undefined ? payload.calendlyAutomation : doc.calendlyAutomation,
    payload.postQualification !== undefined ? payload.postQualification : doc.postQualification
  );
  doc.calendlyAutomation = synced.calendlyAutomation;
  doc.postQualification = synced.postQualification;
}

function formatBuilderStepData(stepKey, data, mode) {
  if (!data) return null;
  if (stepKey === "sequence" && Array.isArray(data.steps)) {
    return {
      steps: data.steps.map((step) => formatSequenceStep(step)),
    };
  }
  if (stepKey === "candidates") {
    return {
      candidateSource: data.candidateSource || "talent_pool",
      candidateIds: Array.isArray(data.candidateIds) ? data.candidateIds : [],
    };
  }
  if (stepKey === "message" && data.channelMessage) {
    return {
      aiPersonalize: data.aiPersonalize !== false,
      channelMessage: normalizeChannelMessage(data.channelMessage),
      emailAutoReplyEnabled: data.emailAutoReplyEnabled !== false,
      calendlyAutomation: normalizeCalendlyAutomation(data.calendlyAutomation),
    };
  }
  if (stepKey === "personalize") {
    return {
      ...data,
      emailAutoReplyEnabled: data.emailAutoReplyEnabled !== false,
      calendlyAutomation: normalizeCalendlyAutomation(data.calendlyAutomation),
    };
  }
  return data;
}

function formatBuilder(builder, mode, doc) {
  if (!builder) return null;
  const keys = stepKeysForMode(mode);
  const steps = {};
  for (const key of keys) {
    if (
      key === "sequence" &&
      doc &&
      Array.isArray(doc.sequenceSteps) &&
      doc.sequenceSteps.length > 0
    ) {
      steps.sequence = { steps: doc.sequenceSteps.map((step) => formatSequenceStep(step)) };
    } else {
      steps[key] = formatBuilderStepData(key, builder[key], mode);
    }
  }
  return {
    currentStep: typeof builder.currentStep === "number" ? builder.currentStep : 0,
    completedSteps: Array.isArray(builder.completedSteps) ? builder.completedSteps : [],
    stepOrder: keys,
    steps,
  };
}

function validateAndNormalizeStep(mode, stepKey, data = {}, existingSteps = []) {
  if (!stepKeysForMode(mode).includes(stepKey)) {
    throw badRequest(`Invalid step "${stepKey}" for ${mode} mode`);
  }

  switch (stepKey) {
    case "details": {
      const name = String(data.name || "").trim();
      const jobTitle = String(data.jobTitle || "").trim();
      if (!name) throw badRequest("Campaign name is required");
      if (!jobTitle) throw badRequest("Job title is required");
      return {
        name,
        jobTitle,
        jobDescription: String(data.jobDescription || ""),
        goal: data.goal || "interest",
      };
    }
    case "channel": {
      if (mode !== "single") throw badRequest("Channel step applies to single-channel campaigns only");
      const channel = String(data.channel || "").trim();
      if (!channel) throw badRequest("Channel is required");
      return { channel };
    }
    case "message": {
      if (mode !== "single") throw badRequest("Message step applies to single-channel campaigns only");
      const synced = syncCalendlyWithPostQualification(
        data.calendlyAutomation,
        data.postQualification
      );
      return {
        aiPersonalize: data.aiPersonalize !== false,
        channelMessage: normalizeChannelMessage(data.channelMessage || data),
        emailAutoReplyEnabled: data.emailAutoReplyEnabled !== false,
        calendlyAutomation: synced.calendlyAutomation,
        postQualification: synced.postQualification,
      };
    }
    case "sequence": {
      if (mode !== "multi") throw badRequest("Sequence step applies to multi-channel campaigns only");
      const steps = normalizeSequenceSteps(
        data.steps || data.sequenceSteps || [],
        existingSteps
      );
      if (steps.length === 0) throw badRequest("At least one sequence step is required");
      return { steps };
    }
    case "personalize": {
      if (mode !== "multi") throw badRequest("Personalize step applies to multi-channel campaigns only");
      const stepMessages = Array.isArray(data.stepMessages) ? data.stepMessages : [];
      const whatsappReplyQuestions = Array.isArray(data.whatsappReplyQuestions)
        ? data.whatsappReplyQuestions.map((q) => String(q || ""))
        : [];
      const synced = syncCalendlyWithPostQualification(
        data.calendlyAutomation,
        data.postQualification
      );
      return {
        aiPersonalize: data.aiPersonalize !== false,
        stepMessages: stepMessages.map((item) => ({
          stepId: String(item.stepId || ""),
          message: item.message ?? null,
        })),
        whatsappReplyQuestions,
        emailAutoReplyEnabled: data.emailAutoReplyEnabled !== false,
        calendlyAutomation: synced.calendlyAutomation,
        postQualification: synced.postQualification,
      };
    }
    case "candidates": {
      const candidateIds = Array.isArray(data.candidateIds) ? data.candidateIds : [];
      if (candidateIds.length === 0) throw badRequest("At least one candidate must be selected");
      return {
        candidateSource: data.candidateSource || "talent_pool",
        candidateIds: candidateIds.map((id) => String(id).trim()).filter(Boolean),
      };
    }
    default:
      throw badRequest("Unknown builder step");
  }
}

function parseStepMessageForCompile(message) {
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
        // fall through
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

function stepDelayToHours(step) {
  const delayValue = Math.max(0, Number(step?.delayValue) || 0);
  const delayUnit =
    step?.delayUnit === "minutes" || step?.delayUnit === "hours" ? step.delayUnit : "days";
  if (delayValue <= 0) return 0;
  if (delayUnit === "minutes") return delayValue / 60;
  if (delayUnit === "hours") return delayValue;
  return delayValue * 24;
}

function compileMultiWhatsappChannelMessage(sequenceSteps, replyQuestions = []) {
  const waSteps = (sequenceSteps || []).filter((step) => step.channel === "whatsapp");
  if (waSteps.length === 0) return null;

  const opening = parseStepMessageForCompile(waSteps[0]?.message);
  const followUp1 = parseStepMessageForCompile(waSteps[1]?.message);
  const followUp2 = parseStepMessageForCompile(waSteps[2]?.message);

  return normalizeChannelMessage({
    channel: "whatsapp",
    templateId: opening.templateId,
    body: opening.body,
    followUpTemplateId: followUp1.templateId,
    followUpBody: followUp1.body,
    followUpWaitHours: Math.max(1, stepDelayToHours(waSteps[1]) || 48),
    followUp2TemplateId: followUp2.templateId,
    followUp2Body: followUp2.body,
    followUp2WaitHours: Math.max(1, stepDelayToHours(waSteps[2]) || 96),
    replyQuestions: Array.isArray(replyQuestions)
      ? replyQuestions.map((q) => String(q || "")).filter(Boolean)
      : [],
  });
}

function mergeStepMessagesIntoSequenceSteps(sequenceSteps, stepMessagesList) {
  const messages = Array.isArray(stepMessagesList) ? stepMessagesList : [];
  const messageByStepId = new Map(
    messages.map((item) => [String(item.stepId), item.message ?? null])
  );

  return (sequenceSteps || []).map((step, index) => {
    const plain = step.toObject ? step.toObject() : { ...step };
    const stepId = String(plain._id || "");
    const messageById = messageByStepId.has(stepId) ? messageByStepId.get(stepId) : undefined;
    const messageByIndex = messages[index]?.message ?? null;
    return {
      ...plain,
      message: messageById !== undefined ? messageById : messageByIndex ?? plain.message ?? null,
    };
  });
}

function compileBuilderToCampaign(doc) {
  const builder = doc.builder;
  if (!builder) return;

  const required = stepKeysForMode(doc.mode);
  const completed = new Set(builder.completedSteps || []);
  for (const key of required) {
    if (!completed.has(key)) {
      throw badRequest(`Complete the "${key}" step before launching`);
    }
  }

  const details = builder.details || {};
  doc.name = details.name || doc.name;
  doc.jobTitle = details.jobTitle || doc.jobTitle;
  doc.jobDescription = details.jobDescription || doc.jobDescription;
  doc.goal = details.goal || doc.goal;

  if (doc.mode === "single") {
    doc.channel = builder.channel?.channel || doc.channel;
    doc.aiPersonalize = builder.message?.aiPersonalize !== false;
    doc.channelMessage = normalizeChannelMessage(
      builder.message?.channelMessage || doc.channelMessage || {}
    );
    doc.channelLabels = doc.channel ? [channelLabel(doc.channel)] : [];
  }

  if (doc.mode === "multi") {
    const sequenceSteps = builder.sequence?.steps || [];
    doc.sequenceSteps = mergeStepMessagesIntoSequenceSteps(
      sequenceSteps,
      builder.personalize?.stepMessages
    );
    doc.aiPersonalize = builder.personalize?.aiPersonalize !== false;
    doc.channelLabels = [
      ...new Set(doc.sequenceSteps.map((s) => channelLabel(s.channel)).filter(Boolean)),
    ];
    const waChannelMessage = compileMultiWhatsappChannelMessage(
      doc.sequenceSteps,
      builder.personalize?.whatsappReplyQuestions || []
    );
    if (waChannelMessage) {
      doc.channelMessage = waChannelMessage;
    }
  }
}

function syncBuilderFromBulkPayload(normalized) {
  const builder = defaultBuilderForMode();
  builder.completedSteps = [...stepKeysForMode(normalized.mode)];
  builder.currentStep = 4;
  builder.details = {
    name: normalized.name,
    jobTitle: normalized.jobTitle,
    jobDescription: normalized.jobDescription,
    goal: normalized.goal,
  };
  builder.candidates = {
    candidateSource: normalized.candidateSource,
    candidateIds: normalized.candidateIds,
  };

  if (normalized.mode === "single") {
    builder.channel = { channel: normalized.channel };
    builder.message = {
      aiPersonalize: normalized.aiPersonalize,
      channelMessage: normalized.channelMessage || {},
    };
  } else {
    builder.sequence = { steps: normalized.sequenceSteps };
    builder.personalize = {
      aiPersonalize: normalized.aiPersonalize,
      stepMessages: normalized.sequenceSteps
        .filter((s) => s.message != null)
        .map((s, i) => ({ stepId: String(i), message: s.message })),
    };
  }

  return builder;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function badRequest(message, code) {
  const err = new Error(message);
  err.statusCode = 400;
  if (code) err.code = code;
  return err;
}

function notFound(message = "Outreach campaign not found") {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

async function accessFilterForActor(actorUserId) {
  const orgFilter = await userIdFilterForActor(actorUserId);
  if (orgFilter) return orgFilter;
  if (!mongoose.Types.ObjectId.isValid(String(actorUserId))) return null;
  return { userId: userOid(actorUserId) };
}

function parsePagination(options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : DEFAULT_PAGE_SIZE)
  );
  return { page, limit, skip: (page - 1) * limit };
}

function formatCreatedDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || channel || "";
}

function deriveChannelLabels(doc) {
  if (Array.isArray(doc.channelLabels) && doc.channelLabels.length > 0) {
    return doc.channelLabels;
  }
  if (doc.mode === "single" && doc.channel) {
    return [channelLabel(doc.channel)];
  }
  if (doc.mode === "multi" && Array.isArray(doc.sequenceSteps)) {
    const seen = new Set();
    const labels = [];
    for (const step of doc.sequenceSteps) {
      const label = channelLabel(step.channel);
      if (label && !seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    return labels;
  }
  return [];
}

function computeResponseRate(stats, candidateCount) {
  const total = Number(stats?.total) || candidateCount || 0;
  const replied = Number(stats?.replied) || 0;
  if (total <= 0) return "-";
  if (replied <= 0) return "0%";
  return `${Math.round((replied / total) * 100)}%`;
}

function buildStatsFromCandidates(candidates = []) {
  const total = candidates.length;
  const stats = {
    total,
    sent: 0,
    delivered: 0,
    opened: 0,
    replied: 0,
    interested: 0,
    notInterested: 0,
    noResponse: total,
  };

  for (const c of candidates) {
    let status = c.responseStatus || "no_response";
    if (status === "no_response") {
      const interactions = Array.isArray(c.interactions) ? c.interactions : [];
      const hasReplyInteraction = interactions.some((row) => {
        const summary = String(row?.summary || "").toLowerCase();
        return summary.includes("candidate replied");
      });
      if (hasReplyInteraction) status = "replied";
    }
    if (status !== "no_response") {
      stats.noResponse = Math.max(0, stats.noResponse - 1);
    }
    if (status === "interested" || status === "follow_up_scheduled") {
      stats.interested += 1;
      stats.replied += 1;
    } else if (status === "not_interested") {
      stats.notInterested += 1;
      stats.replied += 1;
    } else if (status === "replied") {
      stats.replied += 1;
    } else if (
      status === "call_completed" ||
      status === "failed_delivery"
    ) {
      stats.replied += 1;
    }
  }

  const sentFromActivity = candidates.filter((c) => {
    const status = c.responseStatus || "no_response";
    if (status !== "no_response") return true;
    const interactions = Array.isArray(c.interactions) ? c.interactions : [];
    return interactions.some((row) => {
      const summary = String(row?.summary || "").toLowerCase();
      return summary.startsWith("sent:");
    });
  }).length;

  if (sentFromActivity > 0) {
    stats.sent = Math.min(total, sentFromActivity);
    stats.delivered = Math.min(total, sentFromActivity);
  } else if (total > 0 && stats.sent === 0 && stats.delivered === 0) {
    stats.sent = total;
    stats.delivered = total;
  }

  return stats;
}

function buildDefaultFunnel(candidates = [], stats = {}) {
  const total = Number(stats.total) || candidates.length || 0;
  const replied = Number(stats.replied) || 0;
  const interested = Number(stats.interested) || 0;
  return [
    { label: "Selected", count: total },
    { label: "Contacted", count: Number(stats.sent) || total },
    { label: "Replied", count: replied },
    { label: "Interested", count: interested },
    { label: "Screened", count: 0 },
  ];
}

function applyStatsToCampaignDoc(campaignDoc, stats) {
  const candidates = Array.isArray(campaignDoc.candidates) ? campaignDoc.candidates : [];
  campaignDoc.stats = stats;
  campaignDoc.funnel = buildDefaultFunnel(candidates, stats);
  campaignDoc.responseRate = computeResponseRate(stats, candidates.length);
  campaignDoc.markModified("stats");
  campaignDoc.markModified("funnel");
}

function recomputeCampaignDocStats(campaignDoc, { preserveSentDelivered = true } = {}) {
  const candidates = Array.isArray(campaignDoc.candidates) ? campaignDoc.candidates : [];
  const prev = campaignDoc.stats || {};
  const next = buildStatsFromCandidates(candidates);
  if (preserveSentDelivered) {
    const prevSent = Number(prev.sent) || 0;
    const prevDelivered = Number(prev.delivered) || 0;
    if (prevSent > 0) next.sent = Math.max(next.sent, prevSent);
    if (prevDelivered > 0) next.delivered = Math.max(next.delivered, prevDelivered);
  }
  applyStatsToCampaignDoc(campaignDoc, next);
  return next;
}

async function syncCandidateReplyStatusFromEnrollments(campaignDoc) {
  const campaignId = campaignDoc._id;
  if (!campaignId) return;

  const enrollments = await OutreachModuleEnrollment.find({
    outreachModuleCampaignId: campaignId,
  })
    .select("candidateRefId hasReply replyCount replyDisposition contactEmail lastReplyAt")
    .lean();

  if (enrollments.length === 0) return;

  const candidates = Array.isArray(campaignDoc.candidates) ? campaignDoc.candidates : [];
  let changed = false;

  for (const enrollment of enrollments) {
    const refId = String(enrollment.candidateRefId || "");
    const email = String(enrollment.contactEmail || "").trim().toLowerCase();
    let candidate = refId
      ? candidates.find((c) => String(c.candidateRefId || "") === refId)
      : null;
    if (!candidate && email) {
      candidate = candidates.find(
        (c) => String(c.email || "").trim().toLowerCase() === email
      );
      if (candidate && refId && !candidate.candidateRefId) {
        candidate.candidateRefId = refId;
        changed = true;
      }
    }
    if (!candidate) continue;

    const hasInboundReply = enrollmentHasCandidateReply(enrollment);
    const current = String(candidate.responseStatus || "no_response");
    if (enrollment.replyDisposition === "interested" && current !== "interested") {
      candidate.responseStatus = "interested";
      changed = true;
      continue;
    }
    if (enrollment.replyDisposition === "not_interested" && current !== "not_interested") {
      candidate.responseStatus = "not_interested";
      candidate.nextAction = candidate.nextAction || "Archive";
      changed = true;
      continue;
    }
    if (hasInboundReply && current === "no_response") {
      candidate.responseStatus = "replied";
      changed = true;
      continue;
    }
    if (
      !hasInboundReply &&
      !enrollment.replyDisposition &&
      current === "replied"
    ) {
      candidate.responseStatus = "no_response";
      if (/reply received/i.test(String(candidate.lastResponse || ""))) {
        candidate.lastResponse = "";
      }
      if (String(candidate.nextAction || "").toLowerCase().includes("auto-reply")) {
        candidate.nextAction = "Awaiting reply";
      }
      const interactions = Array.isArray(candidate.interactions) ? candidate.interactions : [];
      const filtered = interactions.filter((row) => {
        const summary = String(row?.summary || "").toLowerCase();
        return (
          !summary.includes("candidate replied") &&
          !summary.startsWith("ai reply:") &&
          !(summary.startsWith("sent:") && summary.includes("qualification question"))
        );
      });
      if (filtered.length !== interactions.length) {
        candidate.interactions = filtered;
      }
      changed = true;
    }
  }

  if (changed) {
    campaignDoc.markModified("candidates");
  }
}

/** Atomic write — avoids Mongoose VersionError when scheduler/reply-sync also saves. */
async function persistOutreachModuleCampaignSnapshot(campaignDoc) {
  const plain = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  await OutreachModuleCampaign.updateOne(
    { _id: campaignDoc._id },
    {
      $set: {
        candidates: Array.isArray(plain.candidates) ? plain.candidates : [],
        stats: plain.stats || {},
        funnel: Array.isArray(plain.funnel) ? plain.funnel : [],
        responseRate: plain.responseRate ?? 0,
      },
    }
  );
}

async function recomputeCampaignDocStatsById(campaignId) {
  const campaign = await OutreachModuleCampaign.findById(campaignId);
  if (!campaign) return null;
  await syncCandidateReplyStatusFromEnrollments(campaign);
  const stats = recomputeCampaignDocStats(campaign);
  await persistOutreachModuleCampaignSnapshot(campaign);
  return stats;
}

function formatCampaignRow(doc) {
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];
  const stats = doc.stats || buildStatsFromCandidates(candidates);
  const displayName =
    doc.name && doc.name !== "Untitled campaign"
      ? doc.name
      : doc.builder?.details?.name || doc.name || "Untitled campaign";
  return {
    id: String(doc._id),
    name: displayName,
    mode: doc.mode,
    channels: deriveChannelLabels(doc),
    candidates: candidates.length,
    status: doc.status,
    responseRate: doc.responseRate || computeResponseRate(stats, candidates.length),
    createdDate: formatCreatedDate(doc.createdAt),
    builderProgress: doc.builder
      ? {
          currentStep: doc.builder.currentStep ?? 0,
          completedSteps: doc.builder.completedSteps || [],
        }
      : null,
  };
}

function enrollmentHasCandidateReply(enrollment) {
  return Number(enrollment?.replyCount || 0) > 0;
}

function resolveCandidateDisplayStatus(candidate, enrollment) {
  const current = String(candidate?.responseStatus || "no_response");
  if (current === "interested" || current === "not_interested") return current;
  if (
    ["follow_up_scheduled", "interview_scheduled", "call_completed"].includes(current)
  ) {
    return current;
  }
  if (!enrollment) return current === "replied" ? "no_response" : current;
  if (enrollment.replyDisposition === "interested") return "interested";
  if (enrollment.replyDisposition === "not_interested") return "not_interested";
  if (enrollmentHasCandidateReply(enrollment)) return "replied";
  // Embedded "replied" from a prior false-positive sync — enrollment has no inbound reply.
  if (current === "replied") return "no_response";
  return current;
}

function formatTrackingCandidate(c, contact = {}, enrollment = null) {
  const email = String(contact.email || c.email || "").trim();
  const phone = String(contact.phone || c.phone || "").trim();
  const status = resolveCandidateDisplayStatus(c, enrollment);
  const sentCount = Number(enrollment?.sentCount) || 0;
  const replyCount = Number(enrollment?.replyCount) || 0;
  const hasReply =
    status === "interested" ||
    status === "not_interested" ||
    status === "follow_up_scheduled" ||
    status === "interview_scheduled" ||
    status === "call_completed" ||
    (status === "replied" && replyCount > 0);

  return {
    id: String(c._id),
    name: c.name || "",
    role: c.role || "",
    email: email || "-",
    phone: phone || "-",
    channel: c.channel || "",
    lastStep: c.lastStep || "",
    status,
    interest: c.interest || "-",
    lastResponse: toReplyPreview(c.lastResponse) || "-",
    nextAction: c.nextAction || "",
    sentCount,
    hasReply,
    replyCount: Number(enrollment?.replyCount) || 0,
    currentStepOrder:
      enrollment?.currentStepOrder === undefined || enrollment?.currentStepOrder === null
        ? null
        : Number(enrollment.currentStepOrder),
  };
}

async function syncEmbeddedCandidateContacts(campaignDoc, actorUserId) {
  const candidates = Array.isArray(campaignDoc.candidates) ? campaignDoc.candidates : [];
  if (candidates.length === 0) return;

  const plain = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  const resolved = await resolveContactsForOutreachModuleCampaign(plain, actorUserId);
  const byRef = new Map(resolved.map((row) => [String(row.candidateRefId), row]));

  for (const candidate of candidates) {
    const refId = String(candidate.candidateRefId || "");
    const contact = byRef.get(refId);
    if (!contact) continue;
    if (contact.email) candidate.email = contact.email;
    if (contact.phone) candidate.phone = contact.phone;
  }

  if (typeof campaignDoc.markModified === "function") {
    campaignDoc.markModified("candidates");
  }
}

async function loadCandidateContactMaps(campaignDoc, actorUserId) {
  const campaignId = campaignDoc._id;
  const enrollments = campaignId
    ? await OutreachModuleEnrollment.find({
        outreachModuleCampaignId: campaignId,
      })
      .select(
        "candidateRefId contactEmail contactPhone currentStepOrder sentCount hasReply replyCount status"
      )
      .lean()
    : [];

  const enrollmentByRef = new Map(
    enrollments.map((row) => [String(row.candidateRefId), row])
  );
  const enrollmentByEmail = new Map(
    enrollments
      .filter((row) => String(row.contactEmail || "").includes("@"))
      .map((row) => [String(row.contactEmail || "").trim().toLowerCase(), row])
  );

  const plain = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  const resolved = await resolveContactsForOutreachModuleCampaign(plain, actorUserId);
  const resolvedByRef = new Map(
    resolved.map((row) => [String(row.candidateRefId), row])
  );

  return { enrollmentByRef, enrollmentByEmail, resolvedByRef };
}

function enrollmentForCandidate(candidate, maps) {
  const refId = String(candidate.candidateRefId || "");
  if (refId && maps.enrollmentByRef.has(refId)) {
    return maps.enrollmentByRef.get(refId);
  }
  const email = String(candidate.email || "").trim().toLowerCase();
  if (email && maps.enrollmentByEmail?.has(email)) {
    return maps.enrollmentByEmail.get(email);
  }
  return null;
}

function contactForCandidate(candidate, maps) {
  const refId = String(candidate.candidateRefId || "");
  const enrollment = maps.enrollmentByRef.get(refId);
  const resolved = maps.resolvedByRef.get(refId);
  return {
    email: String(
      enrollment?.contactEmail || resolved?.email || candidate.email || ""
    ).trim(),
    phone: String(
      enrollment?.contactPhone || resolved?.phone || candidate.phone || ""
    ).trim(),
  };
}

async function formatTrackingCandidates(doc, actorUserId) {
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];
  if (candidates.length === 0) return [];

  const maps = await loadCandidateContactMaps(doc, actorUserId);
  return candidates.map((candidate) =>
    formatTrackingCandidate(
      candidate,
      contactForCandidate(candidate, maps),
      enrollmentForCandidate(candidate, maps)
    )
  );
}

async function formatSingleTrackingCandidate(doc, candidate, actorUserId) {
  const maps = await loadCandidateContactMaps(doc, actorUserId);
  const plain = candidate.toObject ? candidate.toObject() : candidate;
  return formatTrackingCandidate(
    plain,
    contactForCandidate(plain, maps),
    enrollmentForCandidate(plain, maps)
  );
}

function formatSequenceStep(step) {
  return {
    id: String(step._id),
    channel: step.channel,
    label: step.label || channelLabel(step.channel),
    delayValue: step.delayValue ?? 0,
    delayUnit: step.delayUnit || "days",
    condition: step.condition || "all",
    timingLabel: step.timingLabel || "",
    message: step.message ?? null,
  };
}

function formatCampaignDetail(doc) {
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];
  const stats = doc.stats || buildStatsFromCandidates(candidates);
  const funnel =
    Array.isArray(doc.funnel) && doc.funnel.length > 0
      ? doc.funnel
      : buildDefaultFunnel(candidates, stats);

  return {
    id: String(doc._id),
    name: doc.name || "",
    jobTitle: doc.jobTitle || "",
    jobDescription: doc.jobDescription || "",
    goal: doc.goal || "interest",
    mode: doc.mode,
    status: doc.status,
    candidateSource: doc.candidateSource || "talent_pool",
    aiPersonalize: Boolean(doc.aiPersonalize),
    channel: doc.channel || "",
    channelMessage: doc.channelMessage || null,
    sequenceSteps: (doc.sequenceSteps || []).map(formatSequenceStep),
    channels: deriveChannelLabels(doc),
    candidates: candidates.length,
    responseRate: doc.responseRate || computeResponseRate(stats, candidates.length),
    createdDate: formatCreatedDate(doc.createdAt),
    launchedAt: doc.launchedAt ? new Date(doc.launchedAt).toISOString() : null,
    completedAt: doc.completedAt ? new Date(doc.completedAt).toISOString() : null,
    emailAutoReplyEnabled: doc.emailAutoReplyEnabled !== false,
    calendlyAutomation: doc.calendlyAutomation || { enabled: false },
    postQualification: normalizePostQualification(doc.postQualification, doc),
    stats,
    funnel,
    trackingCandidates: candidates.map(formatTrackingCandidate),
    builder: formatBuilder(doc.builder, doc.mode, doc),
  };
}

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

function normalizeChannelMessage(payload = {}) {
  if (!payload || typeof payload !== "object") return null;
  const replyQuestions = Array.isArray(payload.replyQuestions)
    ? payload.replyQuestions.map((q) => String(q || ""))
    : payload.replyBody
      ? [String(payload.replyBody)]
      : [];
  const EMAIL_STEP_LABELS = ["Introduction", "Follow-up 1", "Follow-up 2", "Final follow-up"];
  const EMAIL_STEP_WAITS = [0, 3, 4, 5];

  let emailTouchpoints = Array.isArray(payload.emailTouchpoints)
    ? payload.emailTouchpoints.slice(0, 4).map((tp, index) => {
        const waitFields = emailTouchpointDelayFields(
          tp,
          index,
          EMAIL_STEP_WAITS[index]
        );
        return {
          order: index + 1,
          label: String(tp?.label || EMAIL_STEP_LABELS[index] || `Email ${index + 1}`).trim(),
          subject: String(tp?.subject || "").trim(),
          body: String(tp?.body || "").trim(),
          ...waitFields,
          waitUnit:
            tp?.waitUnit === "minutes" || tp?.waitUnit === "hours" || tp?.waitUnit === "days"
              ? tp.waitUnit
              : waitFields.waitMinutes > 0
                ? "minutes"
                : waitFields.waitHours > 0
                  ? "hours"
                  : "days",
        };
      })
    : [];

  const subject = String(payload.subject || emailTouchpoints[0]?.subject || "").trim();
  const body = String(payload.body || emailTouchpoints[0]?.body || "").trim();

  if (emailTouchpoints.length === 0 && (subject || body)) {
    emailTouchpoints = EMAIL_STEP_LABELS.map((label, index) => ({
      order: index + 1,
      label,
      subject: index === 0 ? subject : "",
      body: index === 0 ? body : "",
      waitDays: EMAIL_STEP_WAITS[index],
    }));
  } else if (emailTouchpoints.length > 0) {
    emailTouchpoints[0] = {
      ...emailTouchpoints[0],
      subject: subject || emailTouchpoints[0].subject,
      body: body || emailTouchpoints[0].body,
    };
  }

  return {
    channel: payload.channel || "whatsapp",
    templateId: String(payload.templateId || ""),
    followUpTemplateId: String(payload.followUpTemplateId || ""),
    followUpBody: String(payload.followUpBody || ""),
    followUpWaitHours: Math.max(1, Number(payload.followUpWaitHours) || 48),
    followUp2TemplateId: String(payload.followUp2TemplateId || ""),
    followUp2Body: String(payload.followUp2Body || ""),
    followUp2WaitHours: Math.max(1, Number(payload.followUp2WaitHours) || 96),
    replyQuestions,
    replyBody: String(replyQuestions[0] || payload.replyBody || ""),
    subject,
    body,
    emailTouchpoints,
    callObjective: String(payload.callObjective || ""),
    voiceTone: payload.voiceTone || "professional",
    callAttempts: Math.max(1, Number(payload.callAttempts) || 1),
    attemptGapHours: Math.max(0, Number(payload.attemptGapHours) || 24),
  };
}

function normalizeSequenceSteps(steps = [], existingSteps = []) {
  if (!Array.isArray(steps)) return [];
  return steps.map((step, index) => {
    const existing = Array.isArray(existingSteps) ? existingSteps[index] : null;
    const normalized = {
      channel: step.channel,
      label: String(step.label || channelLabel(step.channel)),
      delayValue: Math.max(0, Number(step.delayValue) || 0),
      delayUnit:
        step.delayUnit === "minutes" || step.delayUnit === "hours" ? step.delayUnit : "days",
      condition: step.condition || (index === 0 ? "all" : "no_response"),
      timingLabel: String(step.timingLabel || ""),
      message: step.message ?? null,
    };
    if (existing?._id) {
      return { ...normalized, _id: existing._id };
    }
    return normalized;
  });
}

function validateCreatePayload(payload = {}) {
  const name = String(payload.name || "").trim();
  const jobTitle = String(payload.jobTitle || "").trim();
  const mode = payload.mode;

  if (!name) throw badRequest("Campaign name is required");
  if (!jobTitle) throw badRequest("Job title is required");
  if (mode !== "single" && mode !== "multi") {
    throw badRequest("Campaign mode must be single or multi");
  }
  if (mode === "single" && !payload.channel) {
    throw badRequest("Channel is required for single-channel campaigns");
  }
  if (mode === "multi" && (!Array.isArray(payload.sequenceSteps) || payload.sequenceSteps.length === 0)) {
    throw badRequest("At least one sequence step is required for multi-channel campaigns");
  }

  const candidateIds = Array.isArray(payload.candidateIds) ? payload.candidateIds : [];
  if (candidateIds.length === 0) {
    throw badRequest("At least one candidate must be selected");
  }

  const syncedPostQual = syncCalendlyWithPostQualification(
    payload.calendlyAutomation,
    payload.postQualification
  );

  return {
    name,
    jobTitle,
    jobDescription: String(payload.jobDescription || ""),
    goal: payload.goal || "interest",
    mode,
    status: payload.launch === true ? "active" : payload.status === "active" ? "active" : "draft",
    candidateSource: payload.candidateSource || "talent_pool",
    aiPersonalize: payload.aiPersonalize !== false,
    channel: mode === "single" ? payload.channel : "",
    channelMessage:
      mode === "single" ? normalizeChannelMessage(payload.channelMessage || payload.message) : null,
    sequenceSteps: mode === "multi" ? normalizeSequenceSteps(payload.sequenceSteps) : [],
    candidateIds,
    emailAutoReplyEnabled: payload.emailAutoReplyEnabled !== false,
    calendlyAutomation: syncedPostQual.calendlyAutomation,
    postQualification: syncedPostQual.postQualification,
    sourceModule:
      payload.sourceModule === "screening"
        ? "screening"
        : payload.sourceModule === "huntlo360"
          ? "huntlo360"
          : "outreach",
    screeningType: String(payload.screeningType || "").trim(),
    screeningConfig: payload.screeningConfig ?? null,
  };
}

async function resolveCandidatesForActor(actorUserId, candidateIds, source) {
  const access = await accessFilterForActor(actorUserId);
  if (!access) throw badRequest("Invalid session");

  const ids = candidateIds
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (ids.length === 0) {
    throw badRequest("Invalid candidate ids");
  }

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const docs = await SavedCandidate.find({
    ...access,
    _id: { $in: objectIds },
  }).lean();

  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const resolved = [];

  for (const id of ids) {
    const doc = byId.get(id);
    if (!doc) continue;
    const fromRaw = readContactFromRawDoc(doc.rawDoc);
    const email = normalizeEmail(fromRaw.email);
    const phone = normalizePhone(fromRaw.phone);
    resolved.push({
      candidateRefId: id,
      name: doc.name || "",
      role: doc.role || "",
      location: doc.location || "",
      experience: doc.experience || "",
      email,
      phone,
      matchScore:
        doc.finalScore != null && Number.isFinite(Number(doc.finalScore))
          ? Math.round(Number(doc.finalScore))
          : 0,
      poolStatus: doc.status || "Saved",
      channel: "",
      lastStep: source === "talent_pool" ? "Queued" : "Imported",
      responseStatus: "no_response",
      interest: "-",
      lastResponse: "-",
      nextAction: "Awaiting outreach",
      interactions: [],
    });
  }

  if (resolved.length === 0) {
    throw badRequest("No valid candidates found for the selected ids");
  }

  return resolved;
}

async function findCampaignInScope(actorUserId, campaignId, { lean = true } = {}) {
  if (!mongoose.Types.ObjectId.isValid(String(campaignId))) {
    throw badRequest("Invalid campaign id");
  }

  const access = await accessFilterForActor(actorUserId);
  if (!access) throw notFound();

  const query = OutreachModuleCampaign.findOne({
    _id: new mongoose.Types.ObjectId(String(campaignId)),
    ...access,
  });
  if (lean) query.lean();
  const doc = await query;
  if (!doc) throw notFound();
  return doc;
}

async function findCampaignDocumentInScope(actorUserId, campaignId) {
  if (!mongoose.Types.ObjectId.isValid(String(campaignId))) {
    throw badRequest("Invalid campaign id");
  }

  const access = await accessFilterForActor(actorUserId);
  if (!access) throw notFound();

  const doc = await OutreachModuleCampaign.findOne({
    _id: new mongoose.Types.ObjectId(String(campaignId)),
    ...access,
  });
  if (!doc) throw notFound();
  return doc;
}

async function getOutreachModuleDashboardStats(actorUserId) {
  const access = await accessFilterForActor(actorUserId);
  if (!access) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const campaigns = await OutreachModuleCampaign.find({
    ...access,
    sourceModule: { $ne: "screening" },
  })
    .select("status candidates stats")
    .lean();

  let candidatesContacted = 0;
  let interestedCandidates = 0;
  let repliedTotal = 0;
  let campaignTotal = campaigns.length;

  for (const c of campaigns) {
    const candidates = Array.isArray(c.candidates) ? c.candidates : [];
    const stats = c.stats || buildStatsFromCandidates(candidates);
    if (c.status !== "draft") {
      candidatesContacted += candidates.length;
    }
    interestedCandidates += Number(stats.interested) || 0;
    repliedTotal += Number(stats.replied) || 0;
  }

  const avgResponseRate =
    candidatesContacted > 0
      ? `${((repliedTotal / candidatesContacted) * 100).toFixed(1)}%`
      : "0%";

  return {
    stats: {
      totalCampaigns: campaignTotal,
      candidatesContacted,
      interestedCandidates,
      avgResponseRate,
    },
  };
}

async function listOutreachModuleCampaigns(actorUserId, options = {}) {
  const access = await accessFilterForActor(actorUserId);
  if (!access) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const { page, limit } = parsePagination(options);
  const statusFilter = String(options.status || "").trim();

  const sourceModuleFilter = String(options.sourceModule || "").trim();
  const filter = { ...access };
  if (sourceModuleFilter === "huntlo360") {
    filter.sourceModule = "huntlo360";
  } else if (sourceModuleFilter === "outreach") {
    filter.sourceModule = "outreach";
  } else {
    filter.sourceModule = { $nin: ["screening", "huntlo360"] };
  }
  if (statusFilter) filter.status = statusFilter;

  const total = await OutreachModuleCampaign.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const effectivePage = Math.min(page, totalPages);
  const skip = (effectivePage - 1) * limit;

  const docs = await OutreachModuleCampaign.find(filter)
    .sort({ updatedAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    campaigns: docs.map(formatCampaignRow),
    pagination: {
      page: effectivePage,
      limit,
      total,
      totalPages,
    },
  };
}

async function getOutreachModuleCampaign(actorUserId, campaignId) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  return { campaign: formatCampaignDetail(doc) };
}

async function createOutreachModuleDraft(actorUserId, payload = {}) {
  const mode = payload.mode;
  if (mode !== "single" && mode !== "multi") {
    throw badRequest("Campaign mode must be single or multi");
  }

  const sourceModule =
    payload.sourceModule === "screening"
      ? "screening"
      : payload.sourceModule === "huntlo360"
        ? "huntlo360"
        : "outreach";

  const doc = await OutreachModuleCampaign.create({
    userId: userOid(actorUserId),
    name: sourceModule === "huntlo360" ? "Untitled Huntlo 360 flow" : "Untitled campaign",
    mode,
    status: "draft",
    sourceModule,
    goal: sourceModule === "huntlo360" ? "job_opportunity" : "interest",
    builder: defaultBuilderForMode(),
  });

  const plain = doc.toObject();
  return {
    campaign: formatCampaignDetail(plain),
    row: formatCampaignRow(plain),
    builder: formatBuilder(plain.builder, mode, plain),
  };
}

async function saveOutreachModuleCampaignStep(actorUserId, campaignId, stepKey, payload = {}) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);

  if (doc.status !== "draft") {
    throw badRequest("Only draft campaigns can be saved step by step");
  }

  const normalized = validateAndNormalizeStep(
    doc.mode,
    stepKey,
    payload.data != null ? payload.data : payload,
    doc.sequenceSteps
  );

  if (!doc.builder) {
    doc.builder = defaultBuilderForMode();
  }

  doc.builder[stepKey] = normalized;

  const completed = new Set(doc.builder.completedSteps || []);
  completed.add(stepKey);
  doc.builder.completedSteps = [...completed];

  const keys = stepKeysForMode(doc.mode);
  const stepIndex = keys.indexOf(stepKey);
  const requestedStep =
    payload.currentStep != null ? Number(payload.currentStep) : stepIndex + 1;
  doc.builder.currentStep = Number.isFinite(requestedStep)
    ? Math.min(4, Math.max(0, Math.floor(requestedStep)))
    : Math.min(4, stepIndex + 1);

  if (stepKey === "details") {
    doc.name = normalized.name;
    doc.jobTitle = normalized.jobTitle;
    doc.jobDescription = normalized.jobDescription;
    doc.goal = normalized.goal;
    doc.builder.details = normalized;
  }

  if (stepKey === "channel") {
    doc.channel = normalized.channel;
    doc.channelLabels = [channelLabel(normalized.channel)];
    doc.builder.channel = normalized;
  }

  if (stepKey === "message") {
    doc.aiPersonalize = normalized.aiPersonalize;
    doc.channelMessage = normalized.channelMessage;
    doc.emailAutoReplyEnabled = normalized.emailAutoReplyEnabled !== false;
    doc.calendlyAutomation = normalized.calendlyAutomation;
    doc.postQualification = normalized.postQualification;
    doc.builder.message = normalized;
  }

  if (stepKey === "sequence") {
    doc.sequenceSteps = normalized.steps;
    doc.channelLabels = [
      ...new Set(normalized.steps.map((s) => channelLabel(s.channel)).filter(Boolean)),
    ];
    doc.builder.sequence = normalized;
  }

  if (stepKey === "personalize") {
    doc.aiPersonalize = normalized.aiPersonalize;
    if (normalized.emailAutoReplyEnabled !== undefined) {
      doc.emailAutoReplyEnabled = normalized.emailAutoReplyEnabled !== false;
    }
    if (normalized.calendlyAutomation) {
      doc.calendlyAutomation = normalized.calendlyAutomation;
    }
    if (normalized.postQualification) {
      doc.postQualification = normalized.postQualification;
    }
    doc.builder.personalize = normalized;
    if (doc.mode === "multi" && Array.isArray(doc.sequenceSteps) && doc.sequenceSteps.length > 0) {
      doc.sequenceSteps = mergeStepMessagesIntoSequenceSteps(
        doc.sequenceSteps,
        normalized.stepMessages
      );
      doc.markModified("sequenceSteps");
    }
  }

  if (stepKey === "candidates") {
    doc.candidateSource = normalized.candidateSource;
    doc.builder.candidates = normalized;
    doc.candidates = await resolveCandidatesForActor(
      actorUserId,
      normalized.candidateIds,
      normalized.candidateSource
    );
    doc.stats = buildStatsFromCandidates(doc.candidates);
    doc.funnel = buildDefaultFunnel(doc.candidates, doc.stats);
    doc.responseRate = computeResponseRate(doc.stats, doc.candidates.length);
  }

  doc.markModified("builder");
  await doc.save();

  const plain = doc.toObject();
  return {
    campaign: formatCampaignDetail(plain),
    row: formatCampaignRow(plain),
    builder: formatBuilder(plain.builder, doc.mode, plain),
    savedStep: stepKey,
  };
}

async function getOutreachModuleCampaignBuilder(actorUserId, campaignId) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  return {
    campaignId: String(doc._id),
    mode: doc.mode,
    status: doc.status,
    builder: formatBuilder(doc.builder, doc.mode, doc),
  };
}

async function createOutreachModuleCampaign(actorUserId, payload = {}) {
  const normalized = validateCreatePayload(payload);
  const candidates = await resolveCandidatesForActor(
    actorUserId,
    normalized.candidateIds,
    normalized.candidateSource
  );

  const channelLabels =
    normalized.mode === "single"
      ? [channelLabel(normalized.channel)]
      : normalized.sequenceSteps.map((s) => channelLabel(s.channel)).filter(Boolean);

  const stats = buildStatsFromCandidates(candidates);
  const funnel = buildDefaultFunnel(candidates, stats);
  const launchedAt = normalized.status === "active" ? new Date() : null;

  const doc = await OutreachModuleCampaign.create({
    userId: userOid(actorUserId),
    name: normalized.name,
    jobTitle: normalized.jobTitle,
    jobDescription: normalized.jobDescription,
    goal: normalized.goal,
    mode: normalized.mode,
    status: normalized.status,
    candidateSource: normalized.candidateSource,
    aiPersonalize: normalized.aiPersonalize,
    channel: normalized.channel,
    channelMessage: normalized.channelMessage || {},
    sequenceSteps: normalized.sequenceSteps,
    channelLabels: [...new Set(channelLabels)],
    candidates,
    stats,
    funnel,
    responseRate: computeResponseRate(stats, candidates.length),
    launchedAt,
    emailAutoReplyEnabled: normalized.emailAutoReplyEnabled,
    calendlyAutomation: normalized.calendlyAutomation,
    postQualification: normalized.postQualification,
    sourceModule: normalized.sourceModule,
    screeningType: normalized.screeningType || "",
    screeningConfig: normalized.screeningConfig,
    builder: syncBuilderFromBulkPayload(normalized),
  });

  return {
    campaign: formatCampaignDetail(doc.toObject()),
    row: formatCampaignRow(doc.toObject()),
  };
}

async function updateOutreachModuleCampaign(actorUserId, campaignId, payload = {}) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);

  if (doc.status === "completed") {
    throw badRequest("Completed campaigns cannot be edited");
  }
  if (doc.status === "active" || doc.status === "paused") {
    throw badRequest("Active campaigns cannot be edited. Pause or duplicate instead.");
  }

  const name = payload.name != null ? String(payload.name).trim() : doc.name;
  const jobTitle = payload.jobTitle != null ? String(payload.jobTitle).trim() : doc.jobTitle;

  if (!name) throw badRequest("Campaign name is required");
  if (!jobTitle) throw badRequest("Job title is required");

  doc.name = name;
  doc.jobTitle = jobTitle;
  if (payload.jobDescription != null) doc.jobDescription = String(payload.jobDescription);
  if (payload.goal != null) doc.goal = payload.goal;
  if (payload.aiPersonalize != null) doc.aiPersonalize = Boolean(payload.aiPersonalize);
  if (payload.candidateSource != null) doc.candidateSource = payload.candidateSource;

  if (doc.mode === "single") {
    if (payload.channel != null) doc.channel = payload.channel;
    if (payload.channelMessage != null || payload.message != null) {
      doc.channelMessage = normalizeChannelMessage(payload.channelMessage || payload.message);
    }
  }

  if (doc.mode === "multi" && Array.isArray(payload.sequenceSteps)) {
    doc.sequenceSteps = normalizeSequenceSteps(payload.sequenceSteps, doc.sequenceSteps);
    doc.channelLabels = [
      ...new Set(doc.sequenceSteps.map((s) => channelLabel(s.channel)).filter(Boolean)),
    ];
  }

  if (Array.isArray(payload.candidateIds) && payload.candidateIds.length > 0) {
    doc.candidates = await resolveCandidatesForActor(
      actorUserId,
      payload.candidateIds,
      doc.candidateSource
    );
    doc.stats = buildStatsFromCandidates(doc.candidates);
    doc.funnel = buildDefaultFunnel(doc.candidates, doc.stats);
    doc.responseRate = computeResponseRate(doc.stats, doc.candidates.length);
  }

  await doc.save();
  const plain = doc.toObject();
  return { campaign: formatCampaignDetail(plain), row: formatCampaignRow(plain) };
}

async function deleteOutreachModuleCampaign(actorUserId, campaignId) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  await deleteOutreachModuleEnrollments(campaignId);
  await doc.deleteOne();
  return { deleted: true, id: String(campaignId) };
}

async function launchOutreachModuleCampaign(actorUserId, campaignId, options = {}) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  if (doc.status === "active") {
    return { campaign: formatCampaignDetail(doc.toObject()) };
  }
  if (doc.status === "completed") {
    throw badRequest("Completed campaigns cannot be launched again");
  }

  compileBuilderToCampaign(doc);

  if (!doc.candidates || doc.candidates.length === 0) {
    throw badRequest("Add candidates before launching");
  }

  doc.status = "active";
  doc.launchedAt = doc.launchedAt || new Date();
  doc.stats = buildStatsFromCandidates(doc.candidates);
  doc.funnel = buildDefaultFunnel(doc.candidates, doc.stats);
  doc.responseRate = computeResponseRate(doc.stats, doc.candidates.length);

  await syncEmbeddedCandidateContacts(doc, actorUserId);
  const launchResult = await launchOutreachModuleSequence(actorUserId, doc, options);
  await doc.save();

  return {
    campaign: formatCampaignDetail(doc.toObject()),
    launch: launchResult,
  };
}

async function pauseOutreachModuleCampaign(actorUserId, campaignId) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  if (doc.status !== "active") {
    throw badRequest("Only active campaigns can be paused");
  }
  doc.status = "paused";
  await doc.save();
  await pauseOutreachModuleEnrollments(campaignId);
  return { campaign: formatCampaignDetail(doc.toObject()) };
}

async function resumeOutreachModuleCampaign(actorUserId, campaignId) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  if (doc.status !== "paused") {
    throw badRequest("Only paused campaigns can be resumed");
  }
  doc.status = "active";
  await doc.save();
  await resumeOutreachModuleEnrollments(campaignId);
  return { campaign: formatCampaignDetail(doc.toObject()) };
}

function scheduleBackgroundTrackingReplySync(campaignId) {
  setImmediate(() => {
    void (async () => {
      try {
        const stub = await OutreachModuleCampaign.findById(campaignId);
        if (!stub) return;
        await syncOutreachModuleCampaignEmailReplies(stub);
        await syncReplyDispositionsForCampaign(stub._id);
        await recomputeCampaignDocStatsById(campaignId);
      } catch (err) {
        console.warn(
          `[outreach-tracking] background reply sync ${campaignId}:`,
          err?.message || err
        );
      }
    })();
  });
}

async function getOutreachModuleCampaignTracking(actorUserId, campaignId, options = {}) {
  await findCampaignDocumentInScope(actorUserId, campaignId);

  const { reconcileOutreachModuleEnrollmentsWithPlan, processDueOutreachModuleEnrollments } =
    require("./outreachModuleSendService");
  const reconcileResult = await reconcileOutreachModuleEnrollmentsWithPlan(campaignId, {
    reopenTerminal: false,
  });
  if (reconcileResult.reopened > 0) {
    setImmediate(() => {
      processDueOutreachModuleEnrollments().catch((err) => {
        console.warn(
          `[outreach-tracking] post-reconcile send tick ${campaignId}:`,
          err?.message || err
        );
      });
    });
  }

  await repairOutreachModuleFalsePositiveReplyFlags(campaignId);

  const syncReplies = options.syncReplies === true;
  if (syncReplies) {
    const stub = await OutreachModuleCampaign.findById(campaignId);
    if (!stub) throw notFound("Campaign not found");
    await syncOutreachModuleCampaignEmailReplies(stub);
    await syncReplyDispositionsForCampaign(stub._id);
  } else {
    // Inbox polling can take 10–20s; scheduler already syncs ~every 60s.
    scheduleBackgroundTrackingReplySync(campaignId);
  }

  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  await syncEmbeddedCandidateContacts(doc, actorUserId);
  await syncCandidateReplyStatusFromEnrollments(doc);
  recomputeCampaignDocStats(doc);
  await persistOutreachModuleCampaignSnapshot(doc);

  const fresh = await findCampaignDocumentInScope(actorUserId, campaignId);
  const candidates = Array.isArray(fresh.candidates) ? fresh.candidates : [];
  const stats = fresh.stats || buildStatsFromCandidates(candidates);
  const funnel =
    Array.isArray(fresh.funnel) && fresh.funnel.length > 0
      ? fresh.funnel
      : buildDefaultFunnel(candidates, stats);

  return {
    campaign: formatCampaignRow(fresh),
    stats,
    funnel,
    candidates: await formatTrackingCandidates(fresh, actorUserId),
    sequenceSteps:
      fresh.mode === "multi"
        ? (fresh.sequenceSteps || []).map(formatSequenceStep)
        : [],
    whatsappReplyQuestions: (
      fresh.builder?.personalize?.whatsappReplyQuestions ||
      fresh.channelMessage?.replyQuestions ||
      []
    )
      .map((q) => String(q || ""))
      .filter(Boolean),
  };
}

const ACTION_STATUS_MAP = {
  screening: { responseStatus: "follow_up_scheduled", nextAction: "Move to screening" },
  interview: { responseStatus: "follow_up_scheduled", nextAction: "Awaiting Calendly booking" },
  not_interested: { responseStatus: "not_interested", nextAction: "Archive" },
  note: {},
  send_scheduling_link: { responseStatus: "follow_up_scheduled", nextAction: "Awaiting Calendly booking" },
};

async function recordOutreachModuleCandidateAction(actorUserId, campaignId, candidateId, payload = {}) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  const action = String(payload.action || "").trim();

  if (!["screening", "interview", "not_interested", "note", "send_scheduling_link"].includes(action)) {
    throw badRequest("Invalid action");
  }

  const candidate = doc.candidates.id(candidateId);
  if (!candidate) throw notFound("Candidate not found in campaign");

  if (action === "interview" || action === "send_scheduling_link") {
    const calendly = doc.calendlyAutomation || {};
    if (calendly.enabled && calendly.schedulingUrl) {
      const { sendCandidateSchedulingLink } = require("./campaignCalendlyBookingService");
      const linkResult = await sendCandidateSchedulingLink(actorUserId, campaignId, candidateId);
      const refreshed = await findCampaignDocumentInScope(actorUserId, campaignId);
      const refreshedCandidate = refreshed.candidates.id(candidateId);
      recomputeCampaignDocStats(refreshed);
      await refreshed.save();
      return {
        candidate: await formatSingleTrackingCandidate(refreshed, refreshedCandidate, actorUserId),
        stats: refreshed.stats,
        funnel: refreshed.funnel,
        schedulingUrl: linkResult.schedulingUrl,
        emailSent: linkResult.emailSent,
        whatsappSent: linkResult.whatsappSent,
      };
    }
  }

  const note = String(payload.note || "").trim();
  const mapping = ACTION_STATUS_MAP[action] || {};

  if (mapping.responseStatus) candidate.responseStatus = mapping.responseStatus;
  if (mapping.nextAction) candidate.nextAction = mapping.nextAction;
  if (action === "not_interested") {
    candidate.interest = "None";
    candidate.lastResponse = note || "Marked not interested";
  }
  if (note) {
    candidate.interactions.push({
      type: "note",
      summary: note,
      content: { action, note },
      at: new Date(),
    });
  } else {
    candidate.interactions.push({
      type: "action",
      summary: `Recruiter action: ${action}`,
      content: { action },
      at: new Date(),
    });
  }

  doc.markModified("candidates");
  recomputeCampaignDocStats(doc);

  await doc.save();

  return {
    candidate: await formatSingleTrackingCandidate(doc, candidate, actorUserId),
    stats: doc.stats,
    funnel: doc.funnel,
  };
}

function dedupeInterviewBookedInteractions(interactions) {
  const seen = new Set();
  return interactions.filter((item) => {
    const content = item.content && typeof item.content === "object" ? item.content : null;
    if (!content || content.action !== "interview_booked") return true;
    const key = String(content.bookingId || content.calendlyInviteeUri || "").trim();
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getOutreachModuleCandidateInteractions(actorUserId, campaignId, candidateId) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  const candidate = (doc.candidates || []).find((c) => String(c._id) === String(candidateId));
  if (!candidate) throw notFound("Candidate not found in campaign");

  const interactions = dedupeInterviewBookedInteractions(
    (candidate.interactions || []).map((item) => ({
      id: String(item._id),
      type: item.type,
      summary: item.summary || "",
      content: item.content ?? null,
      at: item.at ? new Date(item.at).toISOString() : null,
    }))
  );

  const { getCandidateScheduledInterview } = require("./campaignCalendlyBookingService");
  const scheduledInterview = await getCandidateScheduledInterview(
    actorUserId,
    campaignId,
    candidateId
  );

  return {
    candidate: await formatSingleTrackingCandidate(doc, candidate, actorUserId),
    interactions,
    scheduledInterview,
  };
}

module.exports = {
  getOutreachModuleDashboardStats,
  listOutreachModuleCampaigns,
  getOutreachModuleCampaign,
  createOutreachModuleDraft,
  saveOutreachModuleCampaignStep,
  getOutreachModuleCampaignBuilder,
  createOutreachModuleCampaign,
  updateOutreachModuleCampaign,
  deleteOutreachModuleCampaign,
  launchOutreachModuleCampaign,
  pauseOutreachModuleCampaign,
  resumeOutreachModuleCampaign,
  getOutreachModuleCampaignTracking,
  recordOutreachModuleCandidateAction,
  getOutreachModuleCandidateInteractions,
  recomputeCampaignDocStatsById,
  syncCandidateReplyStatusFromEnrollments,
};
