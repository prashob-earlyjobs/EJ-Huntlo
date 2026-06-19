/** Shared sanitizers for JD fields extracted from Gemini or fallback parsers. */
const PLACEHOLDER_JD_VALUE_PATTERNS = [
  /^the hiring company$/i,
  /^not specified$/i,
  /^this role$/i,
  /^n\/a$/i,
  /^none$/i,
  /^unknown$/i,
  /^not provided$/i,
];

function sanitizeJdField(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (PLACEHOLDER_JD_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return "";
  return trimmed;
}

function sanitizeCompanyName(company) {
  return sanitizeJdField(company);
}

function isPlaceholderJdValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return PLACEHOLDER_JD_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function resolveJdRole(jdExtract, jobTitle = "") {
  return sanitizeJdField(jdExtract?.role) || String(jobTitle || "").trim() || "";
}

function buildDefaultRoleBrief(role, company) {
  if (!role) return "";
  if (company) return `We have an opening for ${role} at ${company}.`;
  return `We have an opening for ${role}.`;
}

const SCREENING_QUESTION_COUNT = 8;

function buildDefaultScreeningQuestions(role = "") {
  const roleLabel = String(role || "").trim();
  const relevantTarget = roleLabel || "this opportunity";
  return [
    "So {callee_name}, first — how many years of total work experience do you have?",
    `And how much of that is relevant to ${relevantTarget}?`,
    "Which key skills, tools, or technologies do you use that are relevant for this opportunity?",
    "Could you briefly describe a recent project or accomplishment that fits this role?",
    "Sure. Could you share your current CTC — and what's your expectation for this role?",
    "And what's your notice period? How soon can you join if selected?",
    "What's your current location?",
    "Last one — what's your highest educational qualification?",
  ];
}

function normalizeScreeningQuestions(questions, role = "") {
  const cleaned = (Array.isArray(questions) ? questions : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, SCREENING_QUESTION_COUNT);

  const defaults = buildDefaultScreeningQuestions(role);
  while (cleaned.length < SCREENING_QUESTION_COUNT) {
    cleaned.push(defaults[cleaned.length]);
  }
  return cleaned;
}

function isStaleVoiceJdExtract(cached) {
  if (!cached || typeof cached !== "object") return true;
  if (["company", "role", "experience", "qualification", "roleBrief"].some((key) =>
    isPlaceholderJdValue(cached[key])
  )) {
    return true;
  }
  return (
    !Array.isArray(cached.screeningQuestions) ||
    cached.screeningQuestions.length < SCREENING_QUESTION_COUNT
  );
}

module.exports = {
  sanitizeJdField,
  sanitizeCompanyName,
  isPlaceholderJdValue,
  isStaleVoiceJdExtract,
  resolveJdRole,
  buildDefaultRoleBrief,
  buildDefaultScreeningQuestions,
  normalizeScreeningQuestions,
  SCREENING_QUESTION_COUNT,
};
