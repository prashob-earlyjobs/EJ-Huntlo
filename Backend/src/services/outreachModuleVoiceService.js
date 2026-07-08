const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const {
  createHunarBulkCalls,
  createHunarVoiceAgent,
  updateHunarVoiceAgent,
  buildResultSchema,
  getCampaignHunarAgentId,
} = require("./hunarVoiceCallService");
const { buildResultPromptFromFields } = require("./voiceAgentPromptService");
const { prepareResolvedVoiceAgentConfig, resolveAndSyncVoiceAgentForLaunch } = require("./voiceLaunchPromptService");
const {
  assertVoiceCallCreditsAvailable,
  seedPendingVoiceCalls,
  logVoiceCallCreditUsage,
} = require("./voiceCallCreditsService");
const { normalizeVoiceCallRetryConfig } = require("./voiceCallRetryConfig");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");
const {
  VOICE_CALL_INTRO_DEFAULT,
  VOICE_CALL_OBJECTIVE_DEFAULT,
  DEFAULT_OUTREACH_VOICE_RESULT_FIELDS,
  VOICE_TONE_INTROS,
} = require("../constants/outreachVoiceDefaults");

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  throw err;
}

function mergeHunarVoiceAgent(storedAgent, nextAgent) {
  const base =
    storedAgent && typeof storedAgent === "object" && !Array.isArray(storedAgent)
      ? storedAgent
      : {};
  const patch =
    nextAgent && typeof nextAgent === "object" && !Array.isArray(nextAgent) ? nextAgent : {};
  return { ...base, ...patch };
}

function toHunarCampaignAdapter(campaignDoc) {
  const plain = campaignDoc?.toObject ? campaignDoc.toObject() : campaignDoc || {};
  return {
    _id: plain._id,
    userId: plain.userId,
    name: plain.name || "",
    jobTitle: plain.jobTitle || "",
    jobDescription: plain.jobDescription || "",
    hunarVoiceAgentId: plain.hunarVoiceAgentId || "",
    hunarVoiceAgent: plain.hunarVoiceAgent || null,
    voiceAgentConfig: plain.voiceAgentConfig || null,
  };
}

function buildIntroductoryStatement(voiceTone) {
  const tone = String(voiceTone || "professional").trim();
  return VOICE_TONE_INTROS[tone] || VOICE_CALL_INTRO_DEFAULT;
}

function buildDefaultCallObjective(jobTitle) {
  const title = String(jobTitle || "").trim();
  if (!title) return VOICE_CALL_OBJECTIVE_DEFAULT;
  return `Screen the candidate for the ${title} role — confirm interest, ask screening questions, and capture next steps.`;
}

function parseVoiceStepMessage(message) {
  if (message != null && typeof message === "object" && !Array.isArray(message)) {
    return {
      callObjective: String(message.callObjective || "").trim(),
      body: String(message.body || message.script || "").trim(),
      voiceTone: message.voiceTone || "professional",
      callAttempts: Math.max(1, Number(message.callAttempts) || 1),
      attemptGapHours: Math.max(0, Number(message.attemptGapHours) || 24),
    };
  }

  const body = String(message || "").trim();
  return {
    callObjective: "",
    body,
    voiceTone: "professional",
    callAttempts: 1,
    attemptGapHours: 24,
  };
}

function resolveVoiceFieldsFromCampaign(campaignDoc, stepVoiceConfig = null) {
  const channelMsg = campaignDoc?.channelMessage || {};
  const source = stepVoiceConfig || channelMsg;
  const callObjective =
    String(source.callObjective || channelMsg.callObjective || "").trim() ||
    buildDefaultCallObjective(campaignDoc?.jobTitle);
  const callPrompt =
    String(source.body || source.script || channelMsg.body || "").trim();
  const voiceTone = source.voiceTone || channelMsg.voiceTone || "professional";
  const callAttempts = Math.max(
    1,
    Number(source.callAttempts ?? channelMsg.callAttempts) || 1
  );
  const attemptGapHours = Math.max(
    0,
    Number(source.attemptGapHours ?? channelMsg.attemptGapHours) || 24
  );

  return {
    callObjective,
    callPrompt,
    introductoryStatement: buildIntroductoryStatement(voiceTone),
    voiceTone,
    callAttempts,
    attemptGapHours,
  };
}

function buildVoiceAgentConfigFromFields(voiceFields) {
  const retryConfig = normalizeVoiceCallRetryConfig({
    maxRetryCount: Math.max(0, voiceFields.callAttempts - 1),
    retryIntervalHours: voiceFields.attemptGapHours > 0 ? voiceFields.attemptGapHours : 6,
  });
  const resultFields = DEFAULT_OUTREACH_VOICE_RESULT_FIELDS;

  return {
    callObjective: voiceFields.callObjective,
    introductoryStatement: voiceFields.introductoryStatement,
    callPrompt: voiceFields.callPrompt,
    resultPrompt: buildResultPromptFromFields(resultFields),
    resultFields,
    retryConfig,
  };
}

function campaignHasVoiceCapability(doc) {
  if (!doc) return false;
  if (doc.channel === "voice") return true;
  if (Array.isArray(doc.sequenceSteps) && doc.sequenceSteps.some((step) => step.channel === "voice")) {
    return true;
  }
  return Boolean(String(doc.hunarVoiceAgentId || doc.hunarVoiceAgent?.id || "").trim());
}

function outreachModuleContactsForVoice(moduleCampaign) {
  return (Array.isArray(moduleCampaign?.candidates) ? moduleCampaign.candidates : []).map(
    (candidate) => ({
      candidateKey: String(candidate.candidateRefId || "").trim(),
      name: String(candidate.name || "").trim(),
      phone: String(candidate.phone || "").trim(),
      email: String(candidate.email || "").trim(),
      role: String(candidate.role || "").trim(),
      company: "",
    })
  );
}

function classifyVoiceInterest(callResult) {
  if (!callResult) return "unknown";
  const text = [
    callResult.finalOutcome,
    callResult.interestLevel,
    callResult.candidateStatus,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (!text) return "unknown";
  if (
    text.includes("not interested") ||
    text.includes("declined") ||
    text.includes("rejected")
  ) {
    return "not_interested";
  }
  if (
    text.includes("callback") ||
    text.includes("interest") ||
    text.includes("confirmed") ||
    text.includes("qualified") ||
    text.includes("positive")
  ) {
    return "interested";
  }
  return "unknown";
}

/**
 * Create or update the Hunar voice agent from outreach builder fields.
 */
async function ensureOutreachModuleVoiceAgent(campaignDoc, options = {}) {
  const jobDescription = String(campaignDoc?.jobDescription || "").trim();
  if (!jobDescription) {
    badRequest("Add a job description before launching AI voice calls.");
  }

  const voiceFields = resolveVoiceFieldsFromCampaign(
    campaignDoc,
    options.stepVoiceConfig || null
  );
  if (!voiceFields.callPrompt) {
    badRequest("Add a voice call script before launching.");
  }

  const voiceAgentConfig = buildVoiceAgentConfigFromFields(voiceFields);
  const { resolvedConfig } = await prepareResolvedVoiceAgentConfig(campaignDoc, voiceAgentConfig);

  const storedAgent =
    campaignDoc.hunarVoiceAgent &&
    typeof campaignDoc.hunarVoiceAgent === "object" &&
    !Array.isArray(campaignDoc.hunarVoiceAgent)
      ? campaignDoc.hunarVoiceAgent
      : null;

  const agentRequest = {
    name: `EJ-Huntlo-${String(campaignDoc.name || "Campaign").trim()}`,
    agentPrompt: resolvedConfig.callPrompt,
    objective: resolvedConfig.callObjective,
    introduction: resolvedConfig.introductoryStatement,
    resultPrompt: resolvedConfig.resultPrompt,
    resultSchema: buildResultSchema(voiceAgentConfig.resultFields),
    voicePersona: storedAgent?.voice_persona,
    language: storedAgent?.language,
    personaName: storedAgent?.persona_name ?? null,
  };

  const existingAgentId = getCampaignHunarAgentId(campaignDoc);
  const agentResult = existingAgentId
    ? await updateHunarVoiceAgent({ agentId: existingAgentId, ...agentRequest })
    : await createHunarVoiceAgent(agentRequest);

  const hunarVoiceAgent = mergeHunarVoiceAgent(storedAgent, agentResult.agent);
  const agentId = String(
    agentResult.agentId || hunarVoiceAgent?.id || existingAgentId || ""
  ).trim();

  campaignDoc.hunarVoiceAgentId = agentId;
  campaignDoc.hunarVoiceAgent = hunarVoiceAgent;
  campaignDoc.voiceAgentConfig = voiceAgentConfig;
  await campaignDoc.save();

  return { agentId, voiceAgentConfig, hunarVoiceAgent };
}

async function launchOutreachModuleVoiceBulk(actorUserId, campaignDoc, contacts) {
  const adapter = toHunarCampaignAdapter(campaignDoc);
  const dialableContacts = (Array.isArray(contacts) ? contacts : []).filter((contact) =>
    Boolean(normalizeToWhatsAppDigits(contact.phone))
  );

  if (dialableContacts.length === 0) {
    const err = new Error("No selected contacts have a valid phone number for AI voice calls.");
    err.statusCode = 400;
    err.code = "VOICE_NO_VALID_PHONES";
    throw err;
  }

  await assertVoiceCallCreditsAvailable(actorUserId, dialableContacts.length);
  await resolveAndSyncVoiceAgentForLaunch(adapter);

  const result = await createHunarBulkCalls({
    campaign: adapter,
    contacts: dialableContacts,
  });

  await seedPendingVoiceCalls({
    campaign: adapter,
    contacts: dialableContacts,
    requestId: result.requestId,
  });
  await logVoiceCallCreditUsage(actorUserId, result.dialedCount);

  return {
    dialedCount: result.dialedCount,
    skipped: Math.max(0, contacts.length - result.dialedCount),
    requestId: result.requestId,
  };
}

async function markOutreachModuleCandidatesVoiceQueued(campaignId, contacts, { requestId } = {}) {
  const campaign = await OutreachModuleCampaign.findById(campaignId);
  if (!campaign) return;

  const contactKeys = new Set(
    (Array.isArray(contacts) ? contacts : [])
      .map((contact) => String(contact.candidateKey || contact.candidateRefId || "").trim())
      .filter(Boolean)
  );

  for (const candidate of campaign.candidates || []) {
    const key = String(candidate.candidateRefId || "").trim();
    if (!contactKeys.has(key)) continue;

    candidate.channel = "Voice";
    candidate.lastStep = "AI voice call";
    candidate.nextAction = "Call queued";
    candidate.responseStatus = candidate.responseStatus || "no_response";
    candidate.interactions.push({
      type: "voice",
      summary: "AI voice call queued",
      content: { requestId: requestId || "", status: "queued" },
      at: new Date(),
    });
  }

  const stats = campaign.stats || {};
  stats.total = campaign.candidates.length;
  stats.sent = Math.min(stats.total, (Number(stats.sent) || 0) + contactKeys.size);
  campaign.stats = stats;
  campaign.markModified("candidates");
  campaign.markModified("stats");
  await campaign.save();
}

async function syncOutreachModuleCandidateFromVoiceCall(campaignId, callRow) {
  const campaign = await OutreachModuleCampaign.findById(campaignId);
  if (!campaign) return false;

  const candidateKey = String(callRow?.candidateKey || "").trim();
  if (!candidateKey) return false;

  const candidate = (campaign.candidates || []).find(
    (row) => String(row.candidateRefId) === candidateKey
  );
  if (!candidate) return false;

  const callResult = callRow.callResult || {};
  const disposition = classifyVoiceInterest(callResult);
  const lifecycle = String(callRow.lifecycleStatus || callRow.status || "").trim().toLowerCase();
  const isTerminal =
    lifecycle === "completed" ||
    lifecycle === "failed" ||
    String(callRow.eventType || "").trim() === "call_result_done";

  let responseStatus = candidate.responseStatus || "no_response";
  if (disposition === "interested") responseStatus = "interested";
  else if (disposition === "not_interested") responseStatus = "not_interested";
  else if (isTerminal) responseStatus = "call_completed";

  const summary =
    String(callResult.summary || callRow.summaryText || "").trim() ||
    String(callResult.finalOutcome || callResult.interestLevel || "").trim() ||
    (isTerminal ? "Call completed" : "Call update");

  candidate.channel = "Voice";
  candidate.lastStep = "AI voice call";
  candidate.responseStatus = responseStatus;
  candidate.interest =
    String(callResult.interestLevel || candidate.interest || "-").trim() || "-";
  candidate.lastResponse =
    String(callResult.finalOutcome || callResult.summary || candidate.lastResponse || "-").trim() ||
    "-";
  candidate.nextAction = disposition === "interested" ? "Follow up" : "Review call result";

  candidate.interactions.push({
    type: "voice",
    summary,
    content: {
      callId: callRow.callId || "",
      status: callRow.status || "",
      lifecycleStatus: callRow.lifecycleStatus || "",
      callResult,
    },
    at: new Date(),
  });

  const stats = campaign.stats || {};
  stats.total = campaign.candidates.length;
  if (disposition === "interested") {
    stats.interested = Math.min(stats.total, (Number(stats.interested) || 0) + 1);
  } else if (disposition === "not_interested") {
    stats.notInterested = Math.min(stats.total, (Number(stats.notInterested) || 0) + 1);
  }
  if (isTerminal && disposition === "unknown") {
    stats.replied = Math.min(stats.total, (Number(stats.replied) || 0) + 1);
  }
  campaign.stats = stats;
  campaign.markModified("candidates");
  campaign.markModified("stats");
  await campaign.save();
  return true;
}

async function maybeCompleteOutreachModuleVoiceCampaign(campaignId) {
  const { isVoiceCallTerminal } = require("./campaignVoiceCommsService");
  const campaign = await OutreachModuleCampaign.findById(campaignId).lean();
  if (!campaign || campaign.status !== "active") return false;
  if (!campaignHasVoiceCapability(campaign)) return false;

  const isVoiceOnly =
    campaign.mode === "single"
      ? campaign.channel === "voice"
      : Array.isArray(campaign.sequenceSteps) &&
        campaign.sequenceSteps.length > 0 &&
        campaign.sequenceSteps.every((step) => step.channel === "voice");

  if (!isVoiceOnly) return false;

  const contacts = outreachModuleContactsForVoice(campaign).filter((contact) =>
    Boolean(normalizeToWhatsAppDigits(contact.phone))
  );
  if (contacts.length === 0) return false;

  const CampaignVoiceCall = require("../models/CampaignVoiceCall");
  const callDocs = await CampaignVoiceCall.find({ campaignId }).lean();
  if (callDocs.length === 0) return false;

  const callsByKey = new Map();
  const callsByPhone = new Map();
  for (const doc of callDocs) {
    const key = String(doc.candidateKey || "").trim();
    const digits = normalizeToWhatsAppDigits(doc.toNumber);
    const ts = new Date(doc.lastEventAt || doc.updatedAt || 0).getTime();
    if (key) {
      const prev = callsByKey.get(key);
      if (!prev || ts >= new Date(prev.lastEventAt || prev.updatedAt || 0).getTime()) {
        callsByKey.set(key, doc);
      }
    }
    if (digits) {
      const prev = callsByPhone.get(digits);
      if (!prev || ts >= new Date(prev.lastEventAt || prev.updatedAt || 0).getTime()) {
        callsByPhone.set(digits, doc);
      }
    }
  }

  for (const contact of contacts) {
    const byKey = callsByKey.get(contact.candidateKey);
    const digits = normalizeToWhatsAppDigits(contact.phone);
    const call = byKey || (digits ? callsByPhone.get(digits) : null);
    if (!isVoiceCallTerminal(call)) return false;
  }

  const result = await OutreachModuleCampaign.updateOne(
    { _id: campaignId, status: "active" },
    { $set: { status: "completed", completedAt: new Date() } }
  );
  return Boolean(result.modifiedCount);
}

module.exports = {
  parseVoiceStepMessage,
  toHunarCampaignAdapter,
  campaignHasVoiceCapability,
  outreachModuleContactsForVoice,
  ensureOutreachModuleVoiceAgent,
  launchOutreachModuleVoiceBulk,
  markOutreachModuleCandidatesVoiceQueued,
  syncOutreachModuleCandidateFromVoiceCall,
  maybeCompleteOutreachModuleVoiceCampaign,
};
