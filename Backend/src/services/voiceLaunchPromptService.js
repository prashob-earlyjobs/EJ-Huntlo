const {
  resolveVoiceAgentPromptTemplate,
  buildVoiceAgentLaunchContext,
  upgradeLegacyVoiceCallPrompt,
  parseAdditionalQuestionsFromCallPrompt,
  hasScreeningQuestionsSectionInCallPrompt,
  stripScreeningQuestionsMetadataSection,
  syncScreeningQuestionsIntoCallPrompt,
  applyScreeningQuestionCountToCallObjective,
  buildResultPromptFromFields,
  resolveHunarResultConfig,
} = require("./voiceAgentPromptService");
const { getOrExtractVoiceJdDetails } = require("./voiceJdExtractService");
const {
  updateHunarVoiceAgent,
  getCampaignHunarAgentId,
} = require("./hunarVoiceCallService");

function resolveVoiceAgentConfigForLaunch(config, launchContext) {
  const rows = config && typeof config === "object" ? config : {};
  const callPromptTemplate = upgradeLegacyVoiceCallPrompt(rows.callPrompt);
  const resolvedCallPrompt = stripScreeningQuestionsMetadataSection(
    resolveVoiceAgentPromptTemplate(callPromptTemplate, launchContext)
  );
  return {
    callPrompt: resolvedCallPrompt,
    callObjective: resolveVoiceAgentPromptTemplate(rows.callObjective, launchContext),
    introductoryStatement: resolveVoiceAgentPromptTemplate(
      rows.introductoryStatement,
      launchContext
    ),
    resultPrompt: resolveVoiceAgentPromptTemplate(rows.resultPrompt, launchContext),
  };
}

async function prepareVoiceLaunchPromptContext(campaign) {
  const jobDescription = String(campaign?.jobDescription || "").trim();
  const jobTitle = String(campaign?.jobTitle || "").trim();
  const jdExtract = await getOrExtractVoiceJdDetails(campaign, jobDescription, jobTitle);

  return buildVoiceAgentLaunchContext({
    jobDescription,
    jobTitle,
    jdExtract,
  });
}

async function syncHunarAgentForVoiceLaunch(campaign, resolvedConfig) {
  const agentId = getCampaignHunarAgentId(campaign);
  if (!agentId) {
    const err = new Error(
      "Save the voice agent in the Editor tab before launching AI voice calls."
    );
    err.statusCode = 400;
    err.code = "HUNAR_AGENT_ID_REQUIRED";
    throw err;
  }

  const config = campaign?.voiceAgentConfig || {};
  const storedAgent =
    campaign?.hunarVoiceAgent &&
    typeof campaign.hunarVoiceAgent === "object" &&
    !Array.isArray(campaign.hunarVoiceAgent)
      ? campaign.hunarVoiceAgent
      : null;

  const resultFields = Array.isArray(config.resultFields) ? config.resultFields : [];
  const { resultPrompt, resultSchema } = resolveHunarResultConfig(campaign, resultFields);
  const introduction =
    String(resolvedConfig.introductoryStatement || "").trim() ||
    String(storedAgent?.introduction || config.introductoryStatement || "").trim();

  if (!resultPrompt) {
    const err = new Error(
      "Result prompt is missing. Open the voice agent editor, go to Results, and save again before launching."
    );
    err.statusCode = 400;
    err.code = "VOICE_RESULT_PROMPT_REQUIRED";
    throw err;
  }

  await updateHunarVoiceAgent({
    agentId,
    name: `EJ-Huntlo-${String(campaign?.name || "Campaign").trim()}`,
    agentPrompt: resolvedConfig.callPrompt,
    objective: resolvedConfig.callObjective,
    introduction,
    resultPrompt,
    resultSchema,
    voicePersona: storedAgent?.voice_persona,
    language: storedAgent?.language,
    personaName: storedAgent?.persona_name ?? null,
  });
}

/**
 * On launch or save: extract JD via Gemini, inject {jd_*} variables, and push the resolved prompt to Hunar.
 */
async function prepareResolvedVoiceAgentConfig(campaign, config) {
  const baseLaunchContext = await prepareVoiceLaunchPromptContext(campaign);
  const userQuestions = parseAdditionalQuestionsFromCallPrompt(config?.callPrompt);
  const useCustomScreeningQuestions = hasScreeningQuestionsSectionInCallPrompt(config?.callPrompt);
  const syncedCallPrompt = useCustomScreeningQuestions
    ? syncScreeningQuestionsIntoCallPrompt(config.callPrompt, userQuestions, { storageForm: true })
    : String(config?.callPrompt || "");
  const configForResolve = {
    ...(config && typeof config === "object" ? config : {}),
    callPrompt: syncedCallPrompt,
    callObjective: useCustomScreeningQuestions
      ? applyScreeningQuestionCountToCallObjective(config?.callObjective, userQuestions.length)
      : config?.callObjective,
    resultPrompt: buildResultPromptFromFields(
      Array.isArray(config?.resultFields) ? config.resultFields : []
    ),
  };
  const launchContext = buildVoiceAgentLaunchContext({
    jobDescription: baseLaunchContext.jobDescription,
    jobTitle: baseLaunchContext.jobTitle,
    jdExtract: baseLaunchContext.jdExtract,
    userScreeningQuestions: userQuestions,
    useCustomScreeningQuestions,
  });
  const resolvedConfig = resolveVoiceAgentConfigForLaunch(configForResolve, launchContext);

  const jdExtract = launchContext.jdExtract || {};
  const unresolvedJdTokens = [
    ...new Set(
      [
        resolvedConfig.callPrompt,
        resolvedConfig.callObjective,
        resolvedConfig.introductoryStatement,
      ]
        .join("\n")
        .match(/\{jd_[a-z0-9_]+\}/gi) || []
    ),
  ];

  console.info("[voice-jd-extract] prompt resolved for Hunar", {
    campaignId: String(campaign?._id || campaign?.id || ""),
    company: jdExtract.company,
    role: jdExtract.role,
    experience: jdExtract.experience,
    qualification: jdExtract.qualification,
    responsibilityCount: Array.isArray(jdExtract.responsibilities)
      ? jdExtract.responsibilities.length
      : 0,
    userScreeningQuestionCount: userQuestions.length,
    useCustomScreeningQuestions,
    screeningQuestionCount: Array.isArray(jdExtract.screeningQuestions)
      ? jdExtract.screeningQuestions.length
      : 0,
    unresolvedJdTokens,
  });

  if (unresolvedJdTokens.length > 0) {
    console.warn(
      "[voice-jd-extract] call prompt still contains unresolved JD placeholders — ensure the template uses {jd_company}, {jd_role}, etc.",
      { unresolvedJdTokens }
    );
  }

  return { launchContext, resolvedConfig };
}

async function resolveAndSyncVoiceAgentForLaunch(campaign) {
  const { launchContext, resolvedConfig } = await prepareResolvedVoiceAgentConfig(
    campaign,
    campaign?.voiceAgentConfig || {}
  );

  await syncHunarAgentForVoiceLaunch(campaign, resolvedConfig);

  return {
    launchContext,
    resolvedConfig,
  };
}

module.exports = {
  resolveVoiceAgentConfigForLaunch,
  prepareVoiceLaunchPromptContext,
  prepareResolvedVoiceAgentConfig,
  syncHunarAgentForVoiceLaunch,
  resolveAndSyncVoiceAgentForLaunch,
};
