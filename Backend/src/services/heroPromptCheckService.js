const { SchemaType } = require("@google-cloud/vertexai");
const { generateJsonWithGemini } = require("./geminiService");
const {
  HERO_MIN_DIMENSIONS,
  detectHeroQueryDimensions,
  countHeroQueryDimensions,
  hasMinimumHeroQueryDimensions,
} = require("../lib/heroQueryDimensions");

const HERO_PROMPT_CHECK_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    roles: {
      type: SchemaType.BOOLEAN,
      description: "Job title, role, or seniority level is mentioned or clearly implied.",
    },
    skills: {
      type: SchemaType.BOOLEAN,
      description: "Skills, tech stack, tools, or domain expertise is mentioned.",
    },
    location: {
      type: SchemaType.BOOLEAN,
      description:
        "Work location, city, region, country, or remote/hybrid/onsite preference is mentioned.",
    },
    experience: {
      type: SchemaType.BOOLEAN,
      description:
        "Years of experience or seniority band (e.g. junior, mid, senior, entry-level) is mentioned.",
    },
    allPresent: {
      type: SchemaType.BOOLEAN,
      description: `True when at least ${HERO_MIN_DIMENSIONS} of the 4 dimensions are present.`,
    },
  },
  required: ["roles", "skills", "location", "experience", "allPresent"],
};

const SYSTEM_INSTRUCTION = `You evaluate recruiter search prompts for Huntlo.
Decide whether each hiring dimension is clearly present in the user's natural-language prompt.
Be practical: accept synonyms and implied meaning (e.g. "Berlin" counts as location, "3+ yrs" counts as experience).
Return JSON only.`;

function parseJsonFromModel(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const err = new Error("AI prompt check returned invalid JSON. Try again.");
    err.statusCode = 502;
    throw err;
  }
}

function normalizeCheckResult(raw) {
  const roles = Boolean(raw?.roles);
  const skills = Boolean(raw?.skills);
  const location = Boolean(raw?.location);
  const experience = Boolean(raw?.experience);
  const dimensionFlags = { roles, skills, location, experience };
  const count = countHeroQueryDimensions(dimensionFlags);
  const allPresent = count >= HERO_MIN_DIMENSIONS;

  return { roles, skills, location, experience, allPresent, count };
}

function buildUserPrompt(prompt) {
  return `Analyze this recruiter search prompt and decide which hiring dimensions are clearly present.

Prompt:
"""
${prompt}
"""

Set each dimension to true only when it is clearly stated or strongly implied.
Set allPresent to true when at least ${HERO_MIN_DIMENSIONS} of the 4 dimensions are true.`;
}

/**
 * Gemini verification — only call after the frontend rule-based check passes.
 */
async function checkHeroPromptWithGemini(prompt) {
  const trimmed = String(prompt || "").trim();
  if (!trimmed) {
    const err = new Error("prompt is required");
    err.statusCode = 400;
    throw err;
  }

  const feDimensions = detectHeroQueryDimensions(trimmed);
  if (!hasMinimumHeroQueryDimensions(feDimensions)) {
    const err = new Error(
      `Prompt check requires at least ${HERO_MIN_DIMENSIONS} rule-based dimensions before AI verification.`
    );
    err.statusCode = 400;
    err.code = "FE_CHECK_REQUIRED";
    throw err;
  }

  const raw = await generateJsonWithGemini({
    prompt: buildUserPrompt(trimmed),
    systemInstruction: SYSTEM_INSTRUCTION,
    responseSchema: HERO_PROMPT_CHECK_RESPONSE_SCHEMA,
  });

  const parsed = parseJsonFromModel(raw);
  const dimensions = normalizeCheckResult(parsed);

  return {
    dimensions,
    allPresent: dimensions.allPresent,
    feDimensions,
  };
}

module.exports = {
  checkHeroPromptWithGemini,
};
