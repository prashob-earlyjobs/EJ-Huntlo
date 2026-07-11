const { GoogleGenAI } = require("@google/genai");
const { SchemaType } = require("../constants/geminiSchemaTypes");
const {
  getAiConfig,
  requireVertexConfig,
  requireAiStudioKey,
} = require("../config/ai");

/** JSON schema for outreach AI (structured JSON-only output). */
const OUTREACH_SEQUENCE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    planName: { type: SchemaType.STRING },
    touchpoints: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          order: { type: SchemaType.NUMBER },
          label: { type: SchemaType.STRING },
          subject: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
          waitDays: { type: SchemaType.NUMBER },
        },
        required: ["order", "label", "subject", "body", "waitDays"],
      },
    },
  },
  required: ["planName", "touchpoints"],
};

/** JSON schema for campaign email auto-reply (classify + draft). */
const OUTREACH_AUTO_REPLY_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    disposition: {
      type: SchemaType.STRING,
      description:
        "unknown | interested | not_interested — only interested/not_interested when explicit.",
    },
    shouldSendReply: {
      type: SchemaType.BOOLEAN,
      description: "Whether to send replyBody to the candidate.",
    },
    replyBody: {
      type: SchemaType.STRING,
      description: "Plain-text email body to send (no HTML).",
    },
  },
  required: ["disposition", "shouldSendReply", "replyBody"],
};

/** JSON schema for WhatsApp outreach sequence from JD (template picks + reply questions only). */
const WHATSAPP_OUTREACH_SEQUENCE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    planName: { type: SchemaType.STRING },
    openingTemplateId: {
      type: SchemaType.STRING,
      description: "profile_review_reminder_v1 or role_alignment_review",
    },
    noReply1TemplateId: {
      type: SchemaType.STRING,
      description: "profile_review_reminder_v1 or recruitment_update_reminder_v1",
    },
    noReply2TemplateId: {
      type: SchemaType.STRING,
      description: "final_profile_follow_up_v1 or profile_review_closure_v1",
    },
    replyQuestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "planName",
    "openingTemplateId",
    "noReply1TemplateId",
    "noReply2TemplateId",
    "replyQuestions",
  ],
};

function usesGcpVertex() {
  return getAiConfig().useVertex;
}

function loadGcpSettings() {
  const cfg = requireVertexConfig();
  return {
    project: cfg.projectId,
    location: cfg.location,
    model: cfg.model,
    credentials: cfg.credentials,
  };
}

function createGenAIClient(cfg) {
  if (cfg.useVertex) {
    const vertexCfg = requireVertexConfig();
    return new GoogleGenAI({
      vertexai: true,
      project: vertexCfg.projectId,
      location: vertexCfg.location,
      googleAuthOptions: { credentials: vertexCfg.credentials },
    });
  }

  return new GoogleGenAI({ apiKey: requireAiStudioKey() });
}

/**
 * Reusable Gemini call (Vertex AI or AI Studio via @google/genai).
 */
async function generateWithGemini({
  prompt,
  systemInstruction = "",
  jsonResponse = false,
  responseSchema = null,
}) {
  const text = String(prompt || "").trim();
  if (!text) {
    const err = new Error("Prompt is required");
    err.statusCode = 400;
    throw err;
  }

  const cfg = getAiConfig();
  if (!cfg.useVertex && !cfg.useAiStudio) {
    const err = new Error(
      "AI is not configured. Add your real GCP service account JSON to GCP_CREDENTIALS_JSON in Backend/.env, or set GEMINI_API_KEY."
    );
    err.statusCode = 503;
    throw err;
  }

  const ai = createGenAIClient(cfg);
  const config = {
    temperature: 0.35,
    maxOutputTokens: 8192,
  };

  const instruction = String(systemInstruction || "").trim();
  if (instruction) {
    config.systemInstruction = instruction;
  }

  if (jsonResponse) {
    config.responseMimeType = "application/json";
    if (responseSchema) {
      config.responseSchema = responseSchema;
    }
  }

  const response = await ai.models.generateContent({
    model: cfg.model,
    contents: text,
    config,
  });

  const output = String(response?.text || "").trim();
  if (!output) {
    const err = new Error(
      cfg.useVertex ? "Vertex AI returned an empty response" : "Gemini returned an empty response"
    );
    err.statusCode = 502;
    throw err;
  }

  return output;
}

async function generateJsonWithGemini({ prompt, systemInstruction = "", responseSchema }) {
  if (!responseSchema) {
    const err = new Error("responseSchema is required for JSON-only generation");
    err.statusCode = 500;
    throw err;
  }
  return generateWithGemini({
    prompt,
    systemInstruction,
    jsonResponse: true,
    responseSchema,
  });
}

function getModelName() {
  return getAiConfig().model;
}

module.exports = {
  generateWithGemini,
  generateJsonWithGemini,
  getModelName,
  loadGcpSettings,
  usesGcpVertex,
  getAiConfig,
  SchemaType,
  OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
  OUTREACH_AUTO_REPLY_RESPONSE_SCHEMA,
  WHATSAPP_OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
};
