/** Campaign-level variables resolved when saving or launching the voice agent. */
export const VOICE_AGENT_JD_EXTRACT_VARIABLES = [
  "jd_company",
  "jd_role",
  "jd_experience",
  "jd_qualification",
  "jd_responsibilities",
  "jd_role_brief",
] as const;

export const VOICE_AGENT_SAVE_TIME_VARIABLES = [
  "job_description",
  "job_title",
  ...VOICE_AGENT_JD_EXTRACT_VARIABLES,
] as const;

/** Per-call variables preserved in templates until each outbound call. */
export const VOICE_AGENT_PER_CALL_VARIABLES = ["callee_name"] as const;

export const VOICE_AGENT_PROMPT_VARIABLES = [
  ...VOICE_AGENT_SAVE_TIME_VARIABLES,
  ...VOICE_AGENT_PER_CALL_VARIABLES,
] as const;

export type VoiceAgentPromptVariable = (typeof VOICE_AGENT_PROMPT_VARIABLES)[number];

export const JOB_DESCRIPTION_REFERENCE = "the job description above";
export const JOB_DESCRIPTION_BLOCK_BEGIN = "======== JOB DESCRIPTION (START) ========";
export const JOB_DESCRIPTION_BLOCK_END = "======== JOB DESCRIPTION (END) ========";

export type VoiceAgentPromptContext = {
  jobDescription?: string;
  jobTitle?: string;
  jdExtract?: {
    company?: string;
    role?: string;
    experience?: string;
    qualification?: string;
    responsibilities?: string[];
    roleBrief?: string;
    screeningQuestions?: string[];
  } | null;
};

const PLACEHOLDER_JD_VALUE_PATTERNS = [
  /^the hiring company$/i,
  /^not specified$/i,
  /^this role$/i,
  /^n\/a$/i,
  /^none$/i,
  /^unknown$/i,
  /^not provided$/i,
];

function sanitizeJdField(value: string | undefined): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (PLACEHOLDER_JD_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return "";
  return trimmed;
}

function sanitizeCompanyName(company: string | undefined): string {
  return sanitizeJdField(company);
}

function resolveJdRole(jdExtract: VoiceAgentPromptContext["jdExtract"], jobTitle: string): string {
  return sanitizeJdField(jdExtract?.role) || jobTitle || "";
}

function buildDefaultRoleBrief(role: string, company: string): string {
  if (!role) return "";
  if (company) return `We have an opening for ${role} at ${company}.`;
  return `We have an opening for ${role}.`;
}

const SCREENING_QUESTION_COUNT = 8;

function buildDefaultScreeningQuestions(role = ""): string[] {
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

function normalizeScreeningQuestions(questions: string[] | undefined, role = ""): string[] {
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

const GENERIC_SCREENING_PROBES_SECTION = `- Probing rules per question:
  - Q1: If vague, ask once — "Approximately how many years in total?"
  - Q2-Q4: If unclear, ask once for a rough or more specific answer — do not repeat the question verbatim.
  - Q5: If only one CTC figure is given, probe once for the missing one — current or expected as needed.
  - Q6: If vague, ask once — "Is it fifteen days, thirty days, sixty days, or ninety days?"
  - Q7: If only a city is given, ask once — "Are you currently working from there as well?"
  - Q8: If they mention only graduation, ask once — "Have you completed any postgraduate qualification?"`;

function formatScreeningQuestionsList(questions: string[]): string {
  return questions
    .map((question, index) => `  ${index + 1}. "${String(question || "").trim()}"`)
    .join("\n");
}

function formatScreeningCallFlowSteps(questionCount = SCREENING_QUESTION_COUNT): string {
  const steps: string[] = [];
  const closingStep = 3 + questionCount + 1;
  for (let index = 0; index < questionCount; index += 1) {
    const stepNumber = 4 + index;
    const nextStep = index === questionCount - 1 ? closingStep : stepNumber + 1;
    steps.push(
      `${stepNumber}. SCREENING Q${index + 1} — Ask question ${index + 1} from Screening Questions. Acknowledge briefly (no echo). Go to Step ${nextStep}.`
    );
  }
  return steps.join("\n\n");
}

function formatCompanyKnowledgeSection(company: string, role: string): string {
  const roleRef = role || "the opportunity";
  if (company) {
    return `#### ${company} (your employer — the hiring company)
- The hiring company for this role.
- Hiring for a ${roleRef} position within the organisation.`;
  }

  return `#### Company
- Company name is not specified in the job description.
- Do not invent or mention a company name on the call — refer only to ${roleRef}.`;
}

function formatRoleDetailsKnowledgeSection({
  role,
  company,
  experience,
  qualification,
  responsibilities,
}: {
  role: string;
  company: string;
  experience: string;
  qualification: string;
  responsibilities: string[];
}): string {
  const lines: string[] = [];

  if (role) {
    lines.push(`### Role Details – ${role}`);
    lines.push(`- Designation: ${role}`);
  } else {
    lines.push("### Role Details");
    lines.push("- Job title is not specified in the job description.");
    lines.push('- On the call, refer to this as "the opportunity" — do not invent a job title.');
  }

  if (company) {
    lines.push(`- Company: ${company}`);
  } else {
    lines.push("- Company: not in job description — do not mention a company name on the call.");
  }

  if (experience) {
    lines.push(`- Experience Required: ${experience}`);
  } else {
    lines.push(
      "- Experience Required: not in job description — do not mention required experience on the call."
    );
  }

  if (qualification) {
    lines.push(`- Qualification: ${qualification}`);
  } else {
    lines.push("- Qualification: not in job description — do not mention on the call.");
  }

  lines.push("");
  lines.push("#### What the role involves");
  if (responsibilities.length > 0) {
    for (const item of responsibilities) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("- Not specified in the job description.");
    lines.push(
      "- Do not invent responsibilities — if asked, say the team will share full details in the next round."
    );
  }
  lines.push("- Keep explanations short — only expand if the candidate asks.");

  return lines.join("\n");
}

function buildJdVariableMap(context: VoiceAgentPromptContext = {}) {
  const jobTitle = String(context.jobTitle || "").trim();
  const jdExtract = context.jdExtract || {};
  const company = sanitizeCompanyName(jdExtract.company);
  const role = resolveJdRole(jdExtract, jobTitle);
  const experience = sanitizeJdField(jdExtract.experience);
  const qualification = sanitizeJdField(jdExtract.qualification);
  const responsibilities = Array.isArray(jdExtract.responsibilities)
    ? jdExtract.responsibilities.map((item) => sanitizeJdField(item)).filter(Boolean)
    : [];
  const roleBrief = sanitizeJdField(jdExtract.roleBrief) || buildDefaultRoleBrief(role, company);
  const screeningQuestions = normalizeScreeningQuestions(jdExtract.screeningQuestions, role);

  return {
    jd_company: company,
    jd_role: role,
    jd_experience: experience,
    jd_qualification: qualification,
    jd_responsibilities: responsibilities.map((item) => `- ${item}`).join("\n"),
    jd_role_brief: roleBrief,
    jd_company_kb_section: formatCompanyKnowledgeSection(company, role),
    jd_role_details_kb_section: formatRoleDetailsKnowledgeSection({
      role,
      company,
      experience,
      qualification,
      responsibilities,
    }),
    jd_company_from_clause: company ? ` from ${company}` : "",
    jd_company_at_clause: company ? ` at ${company}` : "",
    jd_company_on_behalf_clause: company ? ` calling on behalf of ${company}` : "",
    jd_company_se_clause: company ? ` ${company} से` : "",
    jd_company_mein_clause: company ? ` ${company} में` : "",
    jd_role_screening_header: role ? `${role} Screening Call` : "Recruitment Screening Call",
    jd_role_screening_label: role ? `${role} role` : "opportunity",
    jd_role_opening_phrase: role ? `an opening for ${role}` : "an opening",
    jd_role_opportunity_phrase: role ? `a ${role} opportunity` : "an opportunity",
    jd_role_referral_phrase: role ? `a ${role} role` : "this opportunity",
    jd_role_candidate_screening_line: role ? `the ${role} role` : "this opportunity",
    jd_role_hindi_opening: role ? `${role} की एक opening` : "एक opening",
    jd_role_hindi_opportunity: role ? `एक ${role} opportunity` : "एक opportunity",
    jd_role_hindi_referral: role ? `इस ${role} role` : "इस opportunity",
    jd_role_brief_spoken: roleBrief ? `${roleBrief} ` : "",
    jd_role_involves_response:
      roleBrief ||
      "The hiring team will walk you through the full role details in the next round — this call is just a quick screening.",
    jd_screening_questions_list: formatScreeningQuestionsList(screeningQuestions),
    jd_screening_call_flow_steps: formatScreeningCallFlowSteps(screeningQuestions.length),
    jd_screening_probes_section: GENERIC_SCREENING_PROBES_SECTION,
  };
}

export function normalizeMultilineText(text: string): string {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .trim();
}

export function formatJobDescriptionBlock(jobDescription: string): string {
  const normalized = normalizeMultilineText(jobDescription);
  if (!normalized) return "";
  return [JOB_DESCRIPTION_BLOCK_BEGIN, normalized, JOB_DESCRIPTION_BLOCK_END].join("\n");
}

/**
 * Mirror of backend resolveVoiceAgentPromptTemplate for editor previews.
 */
export function resolveVoiceAgentPromptTemplate(
  template: string,
  context: VoiceAgentPromptContext = {}
): string {
  const jobDescription = normalizeMultilineText(context.jobDescription || "");
  const jobTitle = String(context.jobTitle || "").trim();
  const jdVariables = buildJdVariableMap(context);
  let jobDescriptionInjected = false;

  return String(template || "").replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, rawKey: string) => {
    const key = String(rawKey || "").toLowerCase();
    if (key === "job_description") {
      if (!jobDescription) return "";
      if (!jobDescriptionInjected) {
        jobDescriptionInjected = true;
        return formatJobDescriptionBlock(jobDescription);
      }
      return JOB_DESCRIPTION_REFERENCE;
    }
    if (key === "job_title") {
      return jobTitle || "";
    }
    if (Object.prototype.hasOwnProperty.call(jdVariables, key)) {
      return jdVariables[key as keyof typeof jdVariables];
    }
    if ((VOICE_AGENT_PER_CALL_VARIABLES as readonly string[]).includes(key)) {
      return match;
    }
    return match;
  });
}

export function voiceAgentVariableHint(variable: VoiceAgentPromptVariable): string {
  if (variable === "job_description") {
    return "Inserted once as a bounded block on save; use a single {job_description} in your prompt.";
  }
  if (variable === "job_title") {
    return "Replaced with the campaign job title when the agent is saved.";
  }
  if (variable.startsWith("jd_")) {
    return "Filled from the campaign job description via Gemini when voice calls are launched.";
  }
  if (variable === "callee_name") {
    return "Resolved per call by the voice platform; use in the introductory statement.";
  }
  return "";
}

export type ResultAgentFieldLike = {
  columnName: string;
  expectedValue: string;
};

function jsonPlaceholderForResultField(columnName: string, expectedValue: string): string {
  const key = columnName.trim().toLowerCase();
  const hint = expectedValue.trim().toLowerCase();
  if (hint.includes("array") || key.includes("questions")) {
    return "[]";
  }
  return '""';
}

function escapeJsonKey(key: string): string {
  return key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Builds the JSON example block from result-agent table rows. */
export function buildResultPromptJsonBlock(fields: ResultAgentFieldLike[]): string {
  const rows = fields
    .map((row) => ({
      columnName: row.columnName.trim(),
      expectedValue: row.expectedValue.trim(),
    }))
    .filter((row) => row.columnName);

  if (rows.length === 0) {
    return '{\n  "field": ""\n}';
  }

  const lines = rows.map((row) => {
    const placeholder = jsonPlaceholderForResultField(row.columnName, row.expectedValue);
    return `  "${escapeJsonKey(row.columnName)}": ${placeholder}`;
  });

  return `{\n${lines.join(",\n")}\n}`;
}

function fieldRuleForResultField(columnName: string, expectedValue: string): string {
  const name = columnName.trim();
  const expected = expectedValue.trim();
  if (!name) return "";
  const hint = expected.toLowerCase();
  if (hint.includes("array") || name.toLowerCase().includes("questions")) {
    return `- ${name} must be an array of strings`;
  }
  if (expected) {
    return `- ${name} must be: ${expected}`;
  }
  return `- ${name} is required`;
}

/** Builds the full Hunar result prompt from result-agent table rows. */
export function buildResultPromptFromFields(fields: ResultAgentFieldLike[]): string {
  const rows = fields
    .map((row) => ({
      columnName: row.columnName.trim(),
      expectedValue: row.expectedValue.trim(),
    }))
    .filter((row) => row.columnName && row.expectedValue);

  const jsonBlock = buildResultPromptJsonBlock(rows);
  const fieldRules = rows
    .map((row) => fieldRuleForResultField(row.columnName, row.expectedValue))
    .filter(Boolean)
    .join("\n");

  return `TASK
Analyze the conversation and return only valid JSON.

Determine whether the candidate was interested in the opportunity, requested a callback, or was not interested.

Use only information explicitly stated during the conversation.

OUTPUT FORMAT
Return JSON in the following format:
${jsonBlock}

FIELD RULES
${fieldRules || "- Populate every field using only explicit conversation evidence."}`;
}

export const VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER =
  "=== ADDITIONAL QUESTIONS TO ASK ===";

const CALL_PROMPT_NEXT_SECTION_PATTERN = /\n=== [^\n]+ ===/;

/** Reads screening questions from the call prompt template. */
export function parseAdditionalQuestionsFromCallPrompt(prompt: string): string[] {
  const text = String(prompt || "");
  const headerIdx = text.indexOf(VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER);
  if (headerIdx < 0) return [];

  const afterHeader = text.slice(headerIdx + VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER.length);
  const nextSectionMatch = afterHeader.match(CALL_PROMPT_NEXT_SECTION_PATTERN);
  const sectionBody =
    nextSectionMatch && nextSectionMatch.index !== undefined
      ? afterHeader.slice(0, nextSectionMatch.index)
      : afterHeader;

  const questions: string[] = [];
  for (const line of sectionBody.split("\n")) {
    const match = line.match(/^\s*[-*]\s*(.*)$/);
    if (!match) continue;
    const question = match[1].trim();
    if (question) questions.push(question);
  }
  return questions;
}

/** Writes screening questions into the call prompt template. */
export function mergeAdditionalQuestionsIntoCallPrompt(
  prompt: string,
  questions: string[]
): string {
  const trimmedQuestions = questions.map((question) => question.trim()).filter(Boolean);
  const questionsBlock =
    trimmedQuestions.length > 0
      ? trimmedQuestions.map((question) => `- ${question}`).join("\n")
      : "-";

  const text = String(prompt || "");
  const header = VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER;
  const headerIdx = text.indexOf(header);

  if (headerIdx < 0) {
    if (trimmedQuestions.length === 0) {
      return text;
    }
    const trimmed = text.trim();
    return trimmed ? `${trimmed}\n\n${header}\n${questionsBlock}` : `${header}\n${questionsBlock}`;
  }

  const before = text.slice(0, headerIdx + header.length);
  const afterHeader = text.slice(headerIdx + header.length);
  const nextSectionMatch = afterHeader.match(CALL_PROMPT_NEXT_SECTION_PATTERN);

  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    return `${before}\n${questionsBlock}${afterHeader.slice(nextSectionMatch.index)}`;
  }

  return `${before}\n${questionsBlock}`;
}

/** Snake_case key for a screening question in call result JSON. */
export function slugifyVoiceResultColumnName(text: string): string {
  const slug = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || "screening_answer";
}

const SCREENING_ANSWER_EXPECTED_PREFIX = "candidate's answer to:";
const SCREENING_QUESTION_STOP_WORDS = new Set([
  "are",
  "you",
  "your",
  "the",
  "this",
  "that",
  "for",
  "with",
  "from",
  "have",
  "has",
  "had",
  "was",
  "were",
  "did",
  "does",
  "can",
  "will",
  "would",
  "about",
  "what",
  "when",
  "where",
  "which",
  "who",
  "how",
  "any",
]);

function normalizeQuestionTokens(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !SCREENING_QUESTION_STOP_WORDS.has(token));
}

export function isAutoScreeningResultField(field: ResultAgentFieldLike): boolean {
  return field.expectedValue
    .trim()
    .toLowerCase()
    .startsWith(SCREENING_ANSWER_EXPECTED_PREFIX);
}

/** True when a result column already captures a screening question (manual or auto). */
export function resultFieldCoversScreeningQuestion(
  field: ResultAgentFieldLike,
  question: string
): boolean {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return false;

  const questionLower = trimmedQuestion.toLowerCase();
  const expected = field.expectedValue.trim().toLowerCase();
  const column = field.columnName.trim().toLowerCase();

  if (expected.startsWith(SCREENING_ANSWER_EXPECTED_PREFIX)) {
    const linked = expected.slice(SCREENING_ANSWER_EXPECTED_PREFIX.length).trim();
    if (linked === questionLower) return true;
  }

  if (expected.includes(questionLower) || questionLower.includes(expected)) return true;

  const questionSlug = slugifyVoiceResultColumnName(trimmedQuestion);
  if (column === questionSlug) return true;

  const questionTokens = normalizeQuestionTokens(trimmedQuestion);
  if (questionTokens.length === 0) return false;

  const columnTokens = column.split("_").filter(Boolean);
  return questionTokens.some(
    (token) =>
      column.includes(token) ||
      expected.includes(token) ||
      columnTokens.some((part) => part.includes(token) || token.includes(part))
  );
}

/** Adds result columns for screening questions so answers can be extracted after calls. */
export function mergeScreeningQuestionsIntoResultFields(
  questions: string[],
  resultFields: ResultAgentFieldLike[]
): Array<{ columnName: string; expectedValue: string }> {
  const merged = resultFields.map((row) => ({
    columnName: row.columnName.trim(),
    expectedValue: row.expectedValue.trim(),
  }));
  const existingColumns = new Set(merged.map((row) => row.columnName.toLowerCase()));

  for (const question of questions) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) continue;
    if (merged.some((field) => resultFieldCoversScreeningQuestion(field, trimmedQuestion))) {
      continue;
    }

    let columnName = slugifyVoiceResultColumnName(trimmedQuestion);
    let suffix = 2;
    while (existingColumns.has(columnName.toLowerCase())) {
      columnName = `${slugifyVoiceResultColumnName(trimmedQuestion).slice(0, 44)}_${suffix}`;
      suffix += 1;
    }

    merged.push({
      columnName,
      expectedValue: `${SCREENING_ANSWER_EXPECTED_PREFIX} ${trimmedQuestion}`,
    });
    existingColumns.add(columnName.toLowerCase());
  }

  return merged;
}

/** Prefer manual result columns over auto-generated screening duplicates in the UI. */
export function dedupeVoiceResultFieldsForDisplay(
  resultFields: ResultAgentFieldLike[]
): Array<{ columnName: string; expectedValue: string }> {
  const normalized = resultFields
    .map((field) => ({
      columnName: field.columnName.trim(),
      expectedValue: field.expectedValue.trim(),
    }))
    .filter((field) => field.columnName);

  const kept: Array<{ columnName: string; expectedValue: string }> = [];

  for (const field of normalized) {
    if (isAutoScreeningResultField(field)) {
      const question = field.expectedValue
        .slice(SCREENING_ANSWER_EXPECTED_PREFIX.length)
        .trim();
      const manualDuplicate = normalized.some(
        (candidate) =>
          candidate.columnName.toLowerCase() !== field.columnName.toLowerCase() &&
          !isAutoScreeningResultField(candidate) &&
          resultFieldCoversScreeningQuestion(candidate, question)
      );
      if (manualDuplicate) continue;
    }

    if (kept.some((candidate) => candidate.columnName.toLowerCase() === field.columnName.toLowerCase())) {
      continue;
    }

    kept.push(field);
  }

  return kept;
}
