const { findCampaignDocumentInScope } = require("../utils/campaignScope");
const Campaign = require("../models/Campaign");
const { getCampaign } = require("./campaignService");
const {
  createHunarVoiceAgent,
  updateHunarVoiceAgent,
  buildResultSchema,
  getCampaignHunarAgentId,
} = require("./hunarVoiceCallService");
const { prepareResolvedVoiceAgentConfig } = require("./voiceLaunchPromptService");
const { buildResultPromptFromFields } = require("./voiceAgentPromptService");
const {
  normalizeVoiceCallRetryConfig,
  DEFAULT_VOICE_CALL_RETRY_CONFIG,
} = require("./voiceCallRetryConfig");

function normalizeVoiceAgentPayload(body) {
  const resultFields = Array.isArray(body?.resultFields)
    ? body.resultFields
        .map((row) => ({
          columnName: String(row?.columnName || "").trim(),
          expectedValue: String(row?.expectedValue || "").trim(),
        }))
        .filter((row) => row.columnName && row.expectedValue)
    : [];

  return {
    callObjective: String(body?.callObjective || "").trim(),
    introductoryStatement: String(body?.introductoryStatement || "").trim(),
    callPrompt: String(body?.callPrompt || "").trim(),
    resultPrompt: String(body?.resultPrompt || "").trim(),
    resultFields,
    retryConfig: normalizeVoiceCallRetryConfig(body?.retryConfig),
  };
}

function validateVoiceAgentPayload(payload) {
  if (!payload.callObjective) {
    const err = new Error("Call objective is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!payload.introductoryStatement) {
    const err = new Error("Introductory statement is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!payload.callPrompt) {
    const err = new Error("Call prompt is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!payload.resultPrompt) {
    const err = new Error("Result prompt is required.");
    err.statusCode = 400;
    throw err;
  }
  if (payload.resultFields.length === 0) {
    const err = new Error("At least one result column is required.");
    err.statusCode = 400;
    throw err;
  }
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

/**
 * Create or update a Hunar voice agent from editor settings and persist on the campaign.
 */
async function saveCampaignVoiceAgent(actorUserId, campaignId, body) {
  const campaign = await findCampaignDocumentInScope(actorUserId, campaignId);
  if (campaign.outreachChannel !== "voice_call") {
    const err = new Error("This campaign is not configured for AI voice calls.");
    err.statusCode = 400;
    throw err;
  }

  const jobDescription = String(campaign.jobDescription || "").trim();
  if (!jobDescription) {
    const err = new Error("Add a job description before saving the voice agent.");
    err.statusCode = 400;
    throw err;
  }

  const jobTitle = String(campaign.jobTitle || "").trim();

  const payload = normalizeVoiceAgentPayload(body);
  payload.resultPrompt = buildResultPromptFromFields(payload.resultFields);
  validateVoiceAgentPayload(payload);

  const { resolvedConfig } = await prepareResolvedVoiceAgentConfig(campaign, payload);

  const storedAgent =
    campaign.hunarVoiceAgent &&
    typeof campaign.hunarVoiceAgent === "object" &&
    !Array.isArray(campaign.hunarVoiceAgent)
      ? campaign.hunarVoiceAgent
      : null;

  const agentRequest = {
    name: `EJ-Huntlo-${String(campaign.name || "Campaign").trim()}`,
    agentPrompt: resolvedConfig.callPrompt,
    objective: resolvedConfig.callObjective,
    introduction: resolvedConfig.introductoryStatement,
    resultPrompt: resolvedConfig.resultPrompt,
    resultSchema: buildResultSchema(payload.resultFields),
    voicePersona: storedAgent?.voice_persona,
    language: storedAgent?.language,
    personaName: storedAgent?.persona_name ?? null,
  };

  const existingAgentId = getCampaignHunarAgentId(campaign);
  const agentResult = existingAgentId
    ? await updateHunarVoiceAgent({ agentId: existingAgentId, ...agentRequest })
    : await createHunarVoiceAgent(agentRequest);

  const voiceAgentConfig = {
    callObjective: payload.callObjective,
    introductoryStatement: payload.introductoryStatement,
    callPrompt: payload.callPrompt,
    resultPrompt: payload.resultPrompt,
    resultFields: payload.resultFields,
    retryConfig: payload.retryConfig || { ...DEFAULT_VOICE_CALL_RETRY_CONFIG },
  };

  const hunarVoiceAgent = mergeHunarVoiceAgent(storedAgent, agentResult.agent);
  const agentId = String(
    agentResult.agentId || hunarVoiceAgent?.id || existingAgentId || ""
  ).trim();

  const updated = await Campaign.findOneAndUpdate(
    { _id: campaign._id, outreachChannel: "voice_call" },
    {
      $set: {
        hunarVoiceAgentId: agentId,
        hunarVoiceAgent,
        voiceAgentConfig,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updated || String(updated.hunarVoiceAgentId || "").trim() !== agentId) {
    const err = new Error(
      "Voice agent was saved remotely but could not be stored on the campaign."
    );
    err.statusCode = 500;
    err.code = "VOICE_AGENT_SAVE_FAILED";
    throw err;
  }

  console.info("[hunar-voice] campaign agent saved", {
    campaignId: String(campaign._id),
    hunarVoiceAgentId: agentId,
    action: existingAgentId ? "updated" : "created",
  });

  return {
    agentId,
    hunarVoiceAgent,
    action: existingAgentId ? "updated" : "created",
    campaign: await getCampaign(actorUserId, campaignId),
  };
}

module.exports = {
  saveCampaignVoiceAgent,
};
