const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const {
  ensureOutreachModuleVoiceAgent,
  launchOutreachModuleVoiceBulk,
  classifyVoiceInterest,
} = require("./outreachModuleVoiceService");

const POST_QUAL_CALL_LANGUAGES = ["english", "hindi", "malayalam", "kannada", "tamil", "telugu"];

function normalizePostQualificationVoice(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  return {
    callObjective: String(o.callObjective || "").trim(),
    body: String(o.body || "").trim(),
    language: POST_QUAL_CALL_LANGUAGES.includes(o.language) ? o.language : "english",
    voiceTone: ["professional", "friendly", "direct"].includes(o.voiceTone)
      ? o.voiceTone
      : "professional",
    callAttempts: Math.max(1, Number(o.callAttempts) || 1),
    attemptGapHours: Math.max(0, Number(o.attemptGapHours) || 24),
  };
}

function normalizePostQualification(raw, campaignDoc = null) {
  const o = raw && typeof raw === "object" ? raw : {};
  const sourceModule = String(campaignDoc?.sourceModule || "").trim();
  const calendly = campaignDoc?.calendlyAutomation || {};
  const screeningEnabled = Boolean(o.screeningEnabled);
  let schedulingEnabled = Boolean(o.schedulingEnabled);
  if (sourceModule === "huntlo360" && !screeningEnabled && !schedulingEnabled) {
    schedulingEnabled = Boolean(calendly.enabled);
  }
  return {
    screeningEnabled,
    schedulingEnabled,
    voice: normalizePostQualificationVoice(o.voice),
  };
}

function getCampaignReplyQuestions(campaignDoc) {
  const msg = campaignDoc?.channelMessage || {};
  return (Array.isArray(msg.replyQuestions) ? msg.replyQuestions : [])
    .map((q) => String(q || "").trim())
    .filter(Boolean);
}

function isQualificationComplete(enrollment, campaignDoc) {
  const questions = getCampaignReplyQuestions(campaignDoc);
  const replyCount = Math.max(0, Number(enrollment?.replyCount) || 0);
  if (questions.length === 0) {
    return replyCount >= 1;
  }
  const nextIdx = Number(enrollment?.nextReplyQuestionIndex);
  return nextIdx < 0 && replyCount > questions.length;
}

function candidateInteractionHasPurpose(candidate, purpose) {
  const interactions = Array.isArray(candidate?.interactions) ? candidate.interactions : [];
  return interactions.some(
    (row) => String(row?.content?.purpose || "").trim() === purpose
  );
}

function resolvePostQualVoiceConfig(campaignDoc) {
  const postQual = campaignDoc?.postQualification || {};
  const voice = postQual.voice || {};
  if (String(voice.body || "").trim()) {
    return {
      callObjective: String(voice.callObjective || "").trim(),
      body: String(voice.body || "").trim(),
      language: POST_QUAL_CALL_LANGUAGES.includes(voice.language) ? voice.language : "english",
      voiceTone: voice.voiceTone || "professional",
      callAttempts: Math.max(1, Number(voice.callAttempts) || 1),
      attemptGapHours: Math.max(0, Number(voice.attemptGapHours) || 24),
    };
  }
  const channelMsg = campaignDoc?.channelMessage || {};
  if (String(channelMsg.channel || "").trim() === "voice" && String(channelMsg.body || "").trim()) {
    return {
      callObjective: String(channelMsg.callObjective || "").trim(),
      body: String(channelMsg.body || "").trim(),
      voiceTone: channelMsg.voiceTone || "professional",
      callAttempts: Math.max(1, Number(channelMsg.callAttempts) || 1),
      attemptGapHours: Math.max(0, Number(channelMsg.attemptGapHours) || 24),
    };
  }
  const voiceAgentConfig = campaignDoc?.voiceAgentConfig || {};
  if (String(voiceAgentConfig.callPrompt || "").trim()) {
    return {
      callObjective: String(voiceAgentConfig.callObjective || "").trim(),
      body: String(voiceAgentConfig.callPrompt || "").trim(),
      voiceTone: "professional",
      callAttempts: 1,
      attemptGapHours: 24,
    };
  }
  return null;
}

async function maybeStartPostQualificationScreening(enrollment, campaignDoc) {
  const postQual = normalizePostQualification(campaignDoc.postQualification, campaignDoc);
  if (!postQual.screeningEnabled) return { started: false };

  const campaignId = String(enrollment.outreachModuleCampaignId);
  const liveDoc = await OutreachModuleCampaign.findById(campaignId);
  if (!liveDoc) return { started: false };

  const candidate = (liveDoc.candidates || []).find(
    (row) => String(row.candidateRefId) === String(enrollment.candidateRefId)
  );
  if (!candidate) return { started: false };
  if (candidateInteractionHasPurpose(candidate, "post_qualification_screening")) {
    return { started: false, reason: "already_started" };
  }

  const stepVoiceConfig = resolvePostQualVoiceConfig(liveDoc);
  if (!stepVoiceConfig?.body) {
    console.warn("[post-qual] screening enabled but no voice script configured", { campaignId });
    return { started: false, reason: "no_script" };
  }

  try {
    await ensureOutreachModuleVoiceAgent(liveDoc, { stepVoiceConfig });
  } catch (err) {
    console.warn("[post-qual] voice agent setup failed:", err?.message || err);
    return { started: false, reason: "agent_setup_failed" };
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

  try {
    const launchResult = await launchOutreachModuleVoiceBulk(
      String(enrollment.userId),
      liveDoc,
      [contact]
    );

    candidate.channel = "Voice";
    candidate.lastStep = "Post-qualification screening";
    candidate.nextAction = "Screening call queued";
    candidate.responseStatus = candidate.responseStatus || "follow_up_scheduled";
    candidate.interactions.push({
      type: "voice",
      summary: "Post-qualification screening call queued",
      content: {
        purpose: "post_qualification_screening",
        requestId: launchResult.requestId || "",
        status: "queued",
      },
      at: new Date(),
    });
    liveDoc.markModified("candidates");
    await liveDoc.save();

    return { started: true, requestId: launchResult.requestId || "" };
  } catch (err) {
    console.warn("[post-qual] screening call launch failed:", err?.message || err);
    return { started: false, reason: "launch_failed" };
  }
}

async function runPostQualificationAfterInboundReply(enrollment, campaignDoc) {
  const freshEnrollment = await OutreachModuleEnrollment.findById(enrollment._id).lean();
  if (!freshEnrollment) return { action: "skipped" };

  if (!isQualificationComplete(freshEnrollment, campaignDoc)) {
    return { action: "not_qualified_yet" };
  }

  const postQual = normalizePostQualification(campaignDoc.postQualification, campaignDoc);
  if (!postQual.screeningEnabled && !postQual.schedulingEnabled) {
    return { action: "manual_review" };
  }

  if (postQual.screeningEnabled) {
    const screening = await maybeStartPostQualificationScreening(freshEnrollment, campaignDoc);
    if (screening.started) {
      return { action: "screening_started" };
    }
    if (postQual.schedulingEnabled) {
      const { maybeSendOutreachModuleCalendlyLink } = require("./outreachModuleSendService");
      const scheduling = await maybeSendOutreachModuleCalendlyLink(freshEnrollment, campaignDoc);
      return { action: scheduling.sent ? "scheduling_sent" : "scheduling_skipped" };
    }
    return { action: "screening_skipped" };
  }

  if (postQual.schedulingEnabled) {
    const { maybeSendOutreachModuleCalendlyLink } = require("./outreachModuleSendService");
    const scheduling = await maybeSendOutreachModuleCalendlyLink(freshEnrollment, campaignDoc);
    return { action: scheduling.sent ? "scheduling_sent" : "scheduling_skipped" };
  }

  return { action: "none" };
}

async function runPostQualificationAfterScreeningCall(campaignId, candidateKey, callResult) {
  const campaign = await OutreachModuleCampaign.findById(campaignId).lean();
  if (!campaign) return { action: "skipped" };

  const postQual = normalizePostQualification(campaign.postQualification, campaign);
  if (!postQual.screeningEnabled || !postQual.schedulingEnabled) {
    return { action: "scheduling_not_enabled" };
  }

  const candidate = (campaign.candidates || []).find(
    (row) => String(row.candidateRefId) === String(candidateKey)
  );
  if (!candidate || !candidateInteractionHasPurpose(candidate, "post_qualification_screening")) {
    return { action: "not_post_qual_screening" };
  }

  const disposition = classifyVoiceInterest(callResult || {});
  if (disposition !== "interested") {
    return { action: "not_interested_on_screening" };
  }

  const enrollment = await OutreachModuleEnrollment.findOne({
    outreachModuleCampaignId: campaignId,
    candidateRefId: String(candidateKey),
  }).lean();
  if (!enrollment) return { action: "enrollment_not_found" };

  const { maybeSendOutreachModuleCalendlyLink } = require("./outreachModuleSendService");
  const scheduling = await maybeSendOutreachModuleCalendlyLink(enrollment, campaign);
  return { action: scheduling.sent ? "scheduling_sent" : "scheduling_skipped" };
}

module.exports = {
  normalizePostQualification,
  normalizePostQualificationVoice,
  isQualificationComplete,
  maybeStartPostQualificationScreening,
  runPostQualificationAfterInboundReply,
  runPostQualificationAfterScreeningCall,
};
