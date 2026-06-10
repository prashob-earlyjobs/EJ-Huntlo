const { VertexAI, SchemaType } = require("@google-cloud/vertexai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

function extractTextFromVertexResponse(result) {
  const parts = result?.response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (p?.text ? String(p.text) : ""))
    .join("")
    .trim();
}

async function generateWithVertex({
  prompt,
  systemInstruction,
  jsonResponse,
  responseSchema,
}) {
  const cfg = requireVertexConfig();

  const vertexAI = new VertexAI({
    project: cfg.projectId,
    location: cfg.location,
    googleAuthOptions: { credentials: cfg.credentials },
  });

  const generationConfig = {
    temperature: 0.35,
    maxOutputTokens: 8192,
  };
  if (jsonResponse) {
    generationConfig.responseMimeType = "application/json";
    if (responseSchema) {
      generationConfig.responseSchema = responseSchema;
    }
  }

  const model = vertexAI.getGenerativeModel({
    model: cfg.model,
    generationConfig,
    systemInstruction: systemInstruction.trim()
      ? { role: "system", parts: [{ text: systemInstruction.trim() }] }
      : undefined,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const output = extractTextFromVertexResponse(result);
  if (!output) {
    const err = new Error("Vertex AI returned an empty response");
    err.statusCode = 502;
    throw err;
  }
  return output;
}

async function generateWithAiStudio({
  prompt,
  systemInstruction,
  jsonResponse,
  responseSchema,
}) {
  const cfg = getAiConfig();
  const genAI = new GoogleGenerativeAI(requireAiStudioKey());
  const generationConfig = {};
  if (jsonResponse) {
    generationConfig.responseMimeType = "application/json";
    if (responseSchema) {
      generationConfig.responseSchema = responseSchema;
    }
  }

  const model = genAI.getGenerativeModel({
    model: cfg.model,
    systemInstruction: systemInstruction.trim() || undefined,
    generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined,
  });

  const result = await model.generateContent(prompt);
  const output = result?.response?.text?.();
  if (!output || !String(output).trim()) {
    const err = new Error("Gemini returned an empty response");
    err.statusCode = 502;
    throw err;
  }
  return String(output).trim();
}

/**
 * Reusable Gemini / Vertex call (config from env via config/ai.js).
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

  const opts = { prompt: text, systemInstruction, jsonResponse, responseSchema };
  if (cfg.useVertex) {
    return generateWithVertex(opts);
  }
  return generateWithAiStudio(opts);
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
  OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
  OUTREACH_AUTO_REPLY_RESPONSE_SCHEMA,
  WHATSAPP_OUTREACH_SEQUENCE_RESPONSE_SCHEMA,
};
