const crypto = require("crypto");
const { SchemaType } = require("@google-cloud/vertexai");
const { generateJsonWithGemini } = require("./geminiService");
const Campaign = require("../models/Campaign");
const {
  sanitizeJdField,
  sanitizeCompanyName,
  isStaleVoiceJdExtract,
  resolveJdRole,
  buildDefaultRoleBrief,
  buildDefaultScreeningQuestions,
  normalizeScreeningQuestions,
} = require("./voiceJdFieldUtils");

const VOICE_JD_EXTRACT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    company: {
      type: SchemaType.STRING,
      description: "Hiring company or employer name from the job description.",
    },
    role: {
      type: SchemaType.STRING,
      description: "Job title or designation being hired for.",
    },
    experience: {
      type: SchemaType.STRING,
      description:
        'Required experience in plain words, e.g. "zero to three years" or "five plus years".',
    },
    qualification: {
      type: SchemaType.STRING,
      description: "Required education or qualification.",
    },
    responsibilities: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Key responsibilities — each item is one short phrase describing what the role involves.",
    },
    roleBrief: {
      type: SchemaType.STRING,
      description:
        "One or two conversational sentences summarizing the role for a phone screening intro. Do not use bullet points.",
    },
    screeningQuestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Exactly eight short phone-screening questions tailored to this job description. Include {callee_name} in question 1 only. Cover experience, role-relevant skills or responsibilities from the JD, a recent project or accomplishment, CTC, notice period, location, and education — word only from what the JD supports.",
    },
  },
  required: [
    "company",
    "role",
    "experience",
    "qualification",
    "responsibilities",
    "roleBrief",
    "screeningQuestions",
  ],
};

const SYSTEM_INSTRUCTION = `You extract structured hiring details from job descriptions for AI voice screening calls.
Use only information explicitly stated or clearly implied in the job description.
Do not invent salary, benefits, or details not supported by the text.
Return JSON only.`;

function hashJobDescription(jobDescription) {
  return crypto.createHash("sha256").update(String(jobDescription || "")).digest("hex");
}

function parseJsonFromModel(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const err = new Error("AI job description extraction returned invalid JSON. Try again.");
    err.statusCode = 502;
    throw err;
  }
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeJdExtract(raw, jobTitle = "") {
  const responsibilities = normalizeStringList(raw?.responsibilities)
    .map((item) => sanitizeJdField(item))
    .filter(Boolean);
  const role = resolveJdRole(raw, jobTitle);
  const company = sanitizeCompanyName(raw?.company);
  const experience = sanitizeJdField(raw?.experience);
  const qualification = sanitizeJdField(raw?.qualification);
  const roleBrief =
    sanitizeJdField(raw?.roleBrief) || buildDefaultRoleBrief(role, company);
  const screeningQuestions = normalizeScreeningQuestions(raw?.screeningQuestions, role);

  return {
    company,
    role,
    experience,
    qualification,
    responsibilities,
    roleBrief,
    screeningQuestions,
  };
}

function parseStructuredJdLines(jobDescription) {
  const trimmed = String(jobDescription || "").trim();
  if (!trimmed) {
    return {
      company: "",
      role: "",
      experience: "",
      qualification: "",
      responsibilities: [],
    };
  }

  const lines = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const parsed = {
    company: "",
    role: "",
    experience: "",
    qualification: "",
    responsibilities: [],
  };

  const labelMatchers = [
    { key: "company", pattern: /^(?:company|employer|organization|organisation)\s*[:.\-–]\s*(.+)$/i },
    { key: "role", pattern: /^(?:role|designation|job title|position|title)\s*[:.\-–]\s*(.+)$/i },
    {
      key: "experience",
      pattern: /^(?:experience|years of experience|exp(?:erience)? required)\s*[:.\-–]\s*(.+)$/i,
    },
    {
      key: "qualification",
      pattern: /^(?:qualification|education|degree|requirements)\s*[:.\-–]\s*(.+)$/i,
    },
  ];

  let inResponsibilities = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^responsibilit(y|ies)\s*[:.\-–]?\s*$/i.test(line)) {
      inResponsibilities = true;
      continue;
    }

    let matchedLabel = false;
    for (const matcher of labelMatchers) {
      const match = line.match(matcher.pattern);
      if (!match) continue;
      parsed[matcher.key] = match[1].trim();
      inResponsibilities = false;
      matchedLabel = true;
      break;
    }
    if (matchedLabel) continue;

    const bulletMatch = line.match(/^[-*•]\s*(.+)$/);
    if (bulletMatch) {
      parsed.responsibilities.push(bulletMatch[1].trim());
      inResponsibilities = true;
      continue;
    }

    if (inResponsibilities && line.length > 12) {
      parsed.responsibilities.push(line);
    }
  }

  return parsed;
}

function fallbackJdExtract(jobDescription, jobTitle = "") {
  const structured = parseStructuredJdLines(jobDescription);
  const role = resolveJdRole(structured, jobTitle);
  const trimmed = String(jobDescription || "").trim();
  const responsibilities =
    structured.responsibilities.length > 0
      ? structured.responsibilities.map((item) => sanitizeJdField(item)).filter(Boolean)
      : trimmed
          .split(/\n+/)
          .map((line) => line.replace(/^[-*•]\s*/, "").trim())
          .filter((line) => line.length > 12)
          .slice(0, 6);

  return normalizeJdExtract(
    {
      company: structured.company || "",
      role,
      experience: structured.experience || "",
      qualification: structured.qualification || "",
      responsibilities,
      roleBrief: "",
      screeningQuestions: [],
    },
    jobTitle
  );
}

function buildExtractPrompt(jobDescription, jobTitle = "") {
  const titleHint = String(jobTitle || "").trim();
  return `Extract hiring details from this job description for a recruiter voice screening call.

${titleHint ? `Suggested job title (use if consistent with the JD): ${titleHint}\n` : ""}
Job description:
"""
${String(jobDescription || "").trim()}
"""

Return JSON with:
- company: employer / hiring company name
- role: job title or designation
- experience: required experience in plain words
- qualification: required education
- responsibilities: array of short responsibility phrases (3-8 items when available)
- roleBrief: 1-2 conversational sentences for a phone intro about the role
- screeningQuestions: exactly 8 short screening questions for a phone call, tailored to THIS job description (use {callee_name} in question 1 only; draw skills, tools, and topics from the JD text)`;
}

function logJdExtractJson(source, campaignId, payload) {
  const { jdHash, extractedAt, ...fields } = payload || {};
  console.log("[voice-jd-extract] JD JSON", JSON.stringify({
    source,
    campaignId: campaignId ? String(campaignId) : undefined,
    jdHash,
    extractedAt,
    ...fields,
  }, null, 2));
}

async function extractVoiceJdDetailsFromGemini(jobDescription, jobTitle = "") {
  const trimmed = String(jobDescription || "").trim();
  if (!trimmed) {
    const err = new Error("Job description is required for voice JD extraction.");
    err.statusCode = 400;
    throw err;
  }

  try {
    const raw = await generateJsonWithGemini({
      prompt: buildExtractPrompt(trimmed, jobTitle),
      systemInstruction: SYSTEM_INSTRUCTION,
      responseSchema: VOICE_JD_EXTRACT_RESPONSE_SCHEMA,
    });
    const parsed = parseJsonFromModel(raw);
    console.log("[voice-jd-extract] Gemini raw JSON", JSON.stringify(parsed, null, 2));
    const normalized = normalizeJdExtract(parsed, jobTitle);
    logJdExtractJson("gemini", "", normalized);
    return normalized;
  } catch (error) {
    console.warn("[voice-jd-extract] Gemini extraction failed; using structured JD fallback", {
      message: error?.message,
      hint:
        "Check GCP_CREDENTIALS_JSON / GCP_PROJECT_ID or GEMINI_API_KEY in Backend/.env if you expect AI extraction.",
    });
    const fallback = fallbackJdExtract(trimmed, jobTitle);
    logJdExtractJson("fallback", "", fallback);
    return fallback;
  }
}

/**
 * Extract JD fields once per JD revision; cache on the campaign document.
 */
async function getOrExtractVoiceJdDetails(campaign, jobDescription, jobTitle = "") {
  const trimmed = String(jobDescription || "").trim();
  const jdHash = hashJobDescription(trimmed);
  const cached =
    campaign?.voiceJdExtract &&
    typeof campaign.voiceJdExtract === "object" &&
    !Array.isArray(campaign.voiceJdExtract)
      ? campaign.voiceJdExtract
      : null;

  if (cached && String(cached.jdHash || "") === jdHash && !isStaleVoiceJdExtract(cached)) {
    const cachedPayload = {
      company: String(cached.company || "").trim(),
      role: String(cached.role || "").trim(),
      experience: String(cached.experience || "").trim(),
      qualification: String(cached.qualification || "").trim(),
      responsibilities: normalizeStringList(cached.responsibilities),
      roleBrief: String(cached.roleBrief || "").trim(),
      screeningQuestions: normalizeScreeningQuestions(cached.screeningQuestions, cached.role),
      jdHash,
      extractedAt: cached.extractedAt || null,
    };
    logJdExtractJson("cache", campaign?._id, cachedPayload);
    return cachedPayload;
  }

  const extracted = await extractVoiceJdDetailsFromGemini(trimmed, jobTitle);
  const payload = {
    ...extracted,
    jdHash,
    extractedAt: new Date(),
  };

  if (campaign?._id) {
    await Campaign.updateOne({ _id: campaign._id }, { $set: { voiceJdExtract: payload } });
    campaign.voiceJdExtract = payload;
  }

  logJdExtractJson("extracted", campaign?._id, payload);
  return payload;
}

module.exports = {
  VOICE_JD_EXTRACT_RESPONSE_SCHEMA,
  hashJobDescription,
  extractVoiceJdDetailsFromGemini,
  getOrExtractVoiceJdDetails,
  fallbackJdExtract,
  parseStructuredJdLines,
  normalizeJdExtract,
};
