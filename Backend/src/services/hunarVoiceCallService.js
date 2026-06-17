const { randomUUID } = require("crypto");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");
const { resolveVoiceAgentPromptTemplate } = require("./voiceAgentPromptService");

const HUNAR_BULK_CALLS_URL =
  "https://api.voice.hunar.ai/external/v1/calls/bulk/";
const HUNAR_AGENTS_URL = "https://api.voice.hunar.ai/external/v1/agents/";

function getHunarApiKey() {
  return String(process.env.HUNAR_VOICE_API_KEY || "").trim();
}

function getHunarAgentId() {
  return String(
    process.env.HUNAR_VOICE_AGENT_ID || "53ae6790-0b0d-42b1-a7bf-92e267c6af7a"
  ).trim();
}

function getHunarVoicePersona() {
  return String(process.env.HUNAR_VOICE_PERSONA || "NEHA").trim();
}

function getHunarVoiceLanguage() {
  return String(process.env.HUNAR_VOICE_LANGUAGE || "ENGLISH").trim();
}

function resolveHunarAgentId(campaign) {
  const fromCampaign = String(campaign?.hunarVoiceAgentId || "").trim();
  if (fromCampaign) return fromCampaign;
  const fromStoredAgent = String(campaign?.hunarVoiceAgent?.id || "").trim();
  if (fromStoredAgent) return fromStoredAgent;
  return getHunarAgentId();
}

function substituteJobDescription(text, jobDescription, jobTitle = "") {
  return resolveVoiceAgentPromptTemplate(text, { jobDescription, jobTitle });
}

function buildResultSchema(resultFields) {
  const schema = {};
  const rows = Array.isArray(resultFields) ? resultFields : [];
  rows.forEach((row, index) => {
    const columnName = String(row?.columnName || "").trim();
    const expectedValue = String(row?.expectedValue || "").trim();
    const key = columnName || `key_${index}`;
    schema[key] = expectedValue || "string";
  });
  return schema;
}

function extractHunarAgentId(body) {
  if (!body || typeof body !== "object") return "";
  const candidates = [
    body.id,
    body.agent_id,
    body.agentId,
    body.uuid,
    body.data?.id,
    body.data?.agent_id,
    body.data?.uuid,
    body.agent?.id,
    body.result?.id,
    body.result?.agent_id,
  ];
  for (const value of candidates) {
    const id = String(value || "").trim();
    if (id) return id;
  }
  return "";
}

function normalizeHunarVoiceAgentResponse(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  return body;
}

function getCampaignHunarAgentId(campaign) {
  return String(campaign?.hunarVoiceAgentId || campaign?.hunarVoiceAgent?.id || "").trim();
}

function buildHunarAgentWritePayload({
  name,
  agentPrompt,
  objective,
  introduction,
  resultPrompt,
  resultSchema,
  voicePersona,
  language,
  personaName = null,
  forUpdate = false,
}) {
  const agentPromptValue = String(agentPrompt || "").trim();
  const introductionValue = String(introduction || "").trim();

  const payload = {
    name: String(name || "").trim() || "Campaign Voice Agent",
    voice_persona: String(voicePersona || getHunarVoicePersona()).trim(),
    objective: String(objective || "").trim(),
    result_prompt: String(resultPrompt || "").trim(),
    result_schema: resultSchema && typeof resultSchema === "object" ? resultSchema : {},
    language: String(language || getHunarVoiceLanguage()).trim(),
    persona_name: personaName == null ? null : String(personaName).trim() || null,
    agent_prompt: agentPromptValue || (forUpdate ? null : ""),
    introduction: introductionValue || (forUpdate ? null : ""),
  };

  return payload;
}

async function requestHunarVoiceAgent(method, url, payload) {
  const apiKey = getHunarApiKey();
  if (!apiKey) {
    const err = new Error("Hunar voice API key is not configured on the server.");
    err.statusCode = 500;
    err.code = "HUNAR_API_KEY_MISSING";
    throw err;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      `Hunar voice agent API failed (${res.status})`;
    const err = new Error(message);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.code = "HUNAR_AGENT_API_ERROR";
    err.details = body;
    throw err;
  }

  return body;
}

function parseHunarVoiceAgentResult(body, fallbackAgentId = "") {
  const agentId = extractHunarAgentId(body) || String(fallbackAgentId || "").trim();
  if (!agentId) {
    const err = new Error("Hunar voice agent API did not return an agent id.");
    err.statusCode = 502;
    err.code = "HUNAR_AGENT_ID_MISSING";
    err.details = body;
    throw err;
  }

  const agent = normalizeHunarVoiceAgentResponse(body);
  return {
    agentId,
    agent,
    response: body,
  };
}

function buildHunarCallbackUrls(campaignId) {
  const base = String(
    process.env.PUBLIC_API_BASE_URL || process.env.API_PUBLIC_BASE_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (!base) {
    const err = new Error(
      "PUBLIC_API_BASE_URL is not configured. Set it so Hunar can deliver voice call callbacks."
    );
    err.statusCode = 500;
    err.code = "HUNAR_CALLBACK_URL_MISSING";
    throw err;
  }
  const campaignQuery = encodeURIComponent(String(campaignId || "").trim());
  const callbackPath = (suffix) =>
    `${base}/api/integrations/voice/hunar/${suffix}?campaignId=${campaignQuery}`;
  return {
    call_status_callback_url: callbackPath("call-status"),
    call_recording_callback_url: callbackPath("call-recording"),
    call_result_callback_url: callbackPath("call-result"),
    call_summary_callback_url: callbackPath("call-summary"),
  };
}

function buildCalleeCustomData(contact, campaign) {
  const jobDescription =
    String(contact.jd || "").trim() ||
    String(campaign.jobDescription || "").trim();
  const jobTitle = String(campaign.jobTitle || "").trim();
  const role = String(contact.role || "").trim();
  const company = String(contact.company || "").trim();
  const location = String(contact.location || "").trim();

  const customData = {
    key_0: jobDescription,
    key_1: jobTitle || role || company,
  };

  const customVariables = campaign?.hunarVoiceAgent?.custom_variables;
  if (Array.isArray(customVariables)) {
    for (const variable of customVariables) {
      const key = String(variable || "").trim();
      if (!key || Object.prototype.hasOwnProperty.call(customData, key)) continue;
      if (key === "job_description" || key === "job_role") {
        customData[key] = jobDescription;
      } else if (key === "job_title") {
        customData[key] = jobTitle || role;
      } else if (key === "company") {
        customData[key] = company;
      } else if (key === "location") {
        customData[key] = location;
      }
    }
  }

  return customData;
}

function buildCalleeRow(contact, campaign) {
  const mobile = normalizeToWhatsAppDigits(contact.phone);
  if (!mobile) return null;

  return {
    callee_name: String(contact.name || "").trim() || "Candidate",
    mobile_number: mobile,
    custom_data: buildCalleeCustomData(contact, campaign),
  };
}

/**
 * Place a bulk AI voice call request via Hunar.
 */
async function createHunarBulkCalls({ campaign, contacts, requestId }) {
  const apiKey = getHunarApiKey();
  if (!apiKey) {
    const err = new Error("Hunar voice API key is not configured on the server.");
    err.statusCode = 500;
    err.code = "HUNAR_API_KEY_MISSING";
    throw err;
  }

  const agentId = resolveHunarAgentId(campaign);
  if (!agentId) {
    const err = new Error("Hunar voice agent id is not configured on the server.");
    err.statusCode = 500;
    err.code = "HUNAR_AGENT_ID_MISSING";
    throw err;
  }

  const data = [];
  for (const contact of contacts) {
    const row = buildCalleeRow(contact, campaign);
    if (row) data.push(row);
  }

  if (data.length === 0) {
    const err = new Error("No selected contacts have a valid phone number for AI voice calls.");
    err.statusCode = 400;
    err.code = "VOICE_NO_VALID_PHONES";
    throw err;
  }

  const campaignId = String(campaign._id || campaign.id || "");
  const payload = {
    agent_id: agentId,
    data,
    request_id: requestId || `${campaignId}-${randomUUID()}`,
    retry_config: {
      max_retry_count: 0,
      retry_interval_hours: 0,
    },
    timezone: null,
    callback_config: buildHunarCallbackUrls(campaignId),
    remove_invalid_rows: true,
    remove_duplicate_phone_numbers: true,
    from_phone_number: null,
  };

  const res = await fetch(HUNAR_BULK_CALLS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      `Hunar voice API failed (${res.status})`;
    console.error("[hunar-voice] bulk-calls rejected", {
      status: res.status,
      message,
      agentId,
      rowCount: data.length,
      sampleRow: data[0] || null,
      details: body,
    });
    const err = new Error(message);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.code = "HUNAR_API_ERROR";
    err.details = body;
    throw err;
  }

  return {
    requestId: payload.request_id,
    dialedCount: data.length,
    response: body,
  };
}

/**
 * Create a Hunar voice agent from campaign editor settings.
 */
async function createHunarVoiceAgent({
  name,
  agentPrompt,
  objective,
  introduction,
  resultPrompt,
  resultSchema,
  voicePersona,
  language,
  personaName = null,
}) {
  const payload = buildHunarAgentWritePayload({
    name,
    agentPrompt,
    objective,
    introduction,
    resultPrompt,
    resultSchema,
    voicePersona,
    language,
    personaName,
    forUpdate: false,
  });

  const body = await requestHunarVoiceAgent("POST", HUNAR_AGENTS_URL, payload);
  return parseHunarVoiceAgentResult(body);
}

/**
 * Update an existing Hunar voice agent (PUT /external/v1/agents/{id}/).
 */
async function updateHunarVoiceAgent({
  agentId,
  name,
  agentPrompt,
  objective,
  introduction,
  resultPrompt,
  resultSchema,
  voicePersona,
  language,
  personaName = null,
}) {
  const id = String(agentId || "").trim();
  if (!id) {
    const err = new Error("Hunar voice agent id is required to update the agent.");
    err.statusCode = 400;
    err.code = "HUNAR_AGENT_ID_REQUIRED";
    throw err;
  }

  const payload = buildHunarAgentWritePayload({
    name,
    agentPrompt,
    objective,
    introduction,
    resultPrompt,
    resultSchema,
    voicePersona,
    language,
    personaName,
    forUpdate: true,
  });

  const url = `${HUNAR_AGENTS_URL}${encodeURIComponent(id)}/`;
  const body = await requestHunarVoiceAgent("PUT", url, payload);
  return parseHunarVoiceAgentResult(body, id);
}

module.exports = {
  createHunarBulkCalls,
  createHunarVoiceAgent,
  updateHunarVoiceAgent,
  buildHunarCallbackUrls,
  buildCalleeCustomData,
  buildCalleeRow,
  buildResultSchema,
  substituteJobDescription,
  resolveHunarAgentId,
  getCampaignHunarAgentId,
};
