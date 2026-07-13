/** Variables substituted when creating/updating the Hunar agent (campaign-level data). */
const SAVE_TIME_VARIABLES = [
  "job_description",
  "job_title",
  "jd_company",
  "jd_role",
  "jd_experience",
  "jd_qualification",
  "jd_responsibilities",
  "jd_role_brief",
  "jd_company_kb_section",
  "jd_role_details_kb_section",
  "jd_company_from_clause",
  "jd_company_at_clause",
  "jd_company_on_behalf_clause",
  "jd_company_se_clause",
  "jd_company_mein_clause",
  "jd_role_screening_header",
  "jd_role_screening_label",
  "jd_role_opening_phrase",
  "jd_role_opportunity_phrase",
  "jd_role_referral_phrase",
  "jd_role_candidate_screening_line",
  "jd_role_hindi_opening",
  "jd_role_hindi_opportunity",
  "jd_role_hindi_referral",
  "jd_role_brief_spoken",
  "jd_role_involves_response",
  "jd_screening_questions_list",
  "jd_screening_call_flow_steps",
  "jd_screening_probes_section",
];

/** Variables left in templates for per-call resolution by the voice platform. */
const PER_CALL_VARIABLES = ["callee_name"];

const JOB_DESCRIPTION_REFERENCE = "the job description above";
const JOB_DESCRIPTION_BLOCK_BEGIN = "======== JOB DESCRIPTION (START) ========";
const JOB_DESCRIPTION_BLOCK_END = "======== JOB DESCRIPTION (END) ========";

const {
  sanitizeJdField,
  sanitizeCompanyName,
  resolveJdRole,
  buildDefaultRoleBrief,
  normalizeScreeningQuestions,
  SCREENING_QUESTION_COUNT,
} = require("./voiceJdFieldUtils");

function normalizeMultilineText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .trim();
}

function formatJobDescriptionBlock(jobDescription) {
  const normalized = normalizeMultilineText(jobDescription);
  if (!normalized) return "";
  return [JOB_DESCRIPTION_BLOCK_BEGIN, normalized, JOB_DESCRIPTION_BLOCK_END].join("\n");
}

function normalizeResponsibilityList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeJdField(item))
    .filter(Boolean);
}

function formatCompanyKnowledgeSection(company, role) {
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
}) {
  const lines = [];

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

const GENERIC_SCREENING_PROBES_SECTION = `- Probing rules per question:
  - Q1: If vague, ask once — "Approximately how many years in total?"
  - Q2-Q4: If unclear, ask once for a rough or more specific answer — do not repeat the question verbatim.
  - Q5: If only one CTC figure is given, probe once for the missing one — current or expected as needed.
  - Q6: If vague, ask once — "Is it fifteen days, thirty days, sixty days, or ninety days?"
  - Q7: If only a city is given, ask once — "Are you currently working from there as well?"
  - Q8: If they mention only graduation, ask once — "Have you completed any postgraduate qualification?"`;

const VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER =
  "=== ADDITIONAL QUESTIONS TO ASK ===";
const SCREENING_QUESTIONS_NONE_MARKER = "(none)";
const MAX_SCREENING_QUESTIONS = 20;
const CALL_PROMPT_NEXT_SECTION_PATTERN = /\n=== [^\n]+ ===/;

function hasScreeningQuestionsSectionInCallPrompt(prompt) {
  return String(prompt || "").includes(VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER);
}

function parseAdditionalQuestionsFromCallPrompt(prompt) {
  const text = String(prompt || "");
  const headerIdx = text.indexOf(VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER);
  if (headerIdx < 0) return [];

  const afterHeader = text.slice(headerIdx + VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER.length);
  const nextSectionMatch = afterHeader.match(CALL_PROMPT_NEXT_SECTION_PATTERN);
  const sectionBody =
    nextSectionMatch && nextSectionMatch.index !== undefined
      ? afterHeader.slice(0, nextSectionMatch.index)
      : afterHeader;

  const questions = [];
  for (const line of sectionBody.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine === SCREENING_QUESTIONS_NONE_MARKER) continue;
    const match = line.match(/^\s*[-*]\s*(.*)$/);
    if (!match) continue;
    const question = match[1].trim();
    if (question && question !== SCREENING_QUESTIONS_NONE_MARKER) questions.push(question);
  }
  return questions;
}

function stripScreeningQuestionsMetadataSection(prompt) {
  const header = VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER;
  const headerIdx = String(prompt || "").indexOf(header);
  if (headerIdx < 0) return String(prompt || "");
  return String(prompt || "")
    .slice(0, headerIdx)
    .replace(/\s+$/u, "");
}

function sanitizeUserScreeningQuestions(questions, max = MAX_SCREENING_QUESTIONS) {
  return (Array.isArray(questions) ? questions : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function formatScreeningQuestionsList(questions) {
  return questions
    .map((question, index) => `  ${index + 1}. "${String(question || "").trim()}"`)
    .join("\n");
}

function formatScreeningCallFlowSteps(questionCount = SCREENING_QUESTION_COUNT) {
  const steps = [];
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

function formatScreeningProbesSection(questionCount) {
  if (questionCount <= SCREENING_QUESTION_COUNT) {
    return GENERIC_SCREENING_PROBES_SECTION;
  }
  const extraLines = [];
  for (let index = SCREENING_QUESTION_COUNT + 1; index <= questionCount; index += 1) {
    extraLines.push(
      `  - Q${index}: If unclear, ask once for clarification — do not repeat the question verbatim.`
    );
  }
  return `${GENERIC_SCREENING_PROBES_SECTION}\n${extraLines.join("\n")}`;
}

function applyScreeningQuestionCountToPromptText(text, count) {
  const questionCount = Math.max(0, Number(count) || 0);
  const closingStep = 3 + questionCount + 1;
  const allQuestionsLabel =
    questionCount === 1 ? "the screening question" : `all ${questionCount} screening questions`;
  const askQuestionsLabel =
    questionCount === 1 ? "ask the screening question" : `ask all ${questionCount} screening questions`;

  let result = String(text || "");
  result = result.replace(/\ball eight screening questions\b/gi, allQuestionsLabel);
  result = result.replace(/\bask eight screening questions\b/gi, askQuestionsLabel);
  result = result.replace(/\bask the eight questions\b/gi, "ask the screening questions");
  result = result.replace(
    /\beight questions from the Screening Questions section\b/gi,
    "questions from the Screening Questions section"
  );
  result = result.replace(/\n(\d+)\. CLOSURE —/g, `\n${closingStep}. CLOSURE —`);
  return result;
}

function applyScreeningQuestionCountToCallObjective(objective, count) {
  const questionCount = Math.max(0, Number(count) || 0);
  const askQuestionsLabel =
    questionCount === 1 ? "ask the screening question" : `ask all ${questionCount} screening questions`;
  return String(objective || "").replace(/\bask eight screening questions\b/gi, askQuestionsLabel);
}

function mergeAdditionalQuestionsIntoCallPrompt(prompt, questions) {
  const trimmedQuestions = sanitizeUserScreeningQuestions(questions);
  const questionsBlock =
    trimmedQuestions.length > 0
      ? trimmedQuestions.map((question) => `- ${question}`).join("\n")
      : SCREENING_QUESTIONS_NONE_MARKER;

  const text = String(prompt || "");
  const header = VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER;
  const headerIdx = text.indexOf(header);

  if (headerIdx < 0) {
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

function syncScreeningQuestionsIntoCallPrompt(prompt, questions, options = {}) {
  const storageQuestions = options.storageForm
    ? sanitizeUserScreeningQuestions(questions)
    : sanitizeUserScreeningQuestions(questions);
  const questionsListBlock =
    storageQuestions.length > 0
      ? formatScreeningQuestionsList(storageQuestions)
      : `  ${SCREENING_QUESTIONS_NONE_MARKER}`;
  const callFlowBlock = formatScreeningCallFlowSteps(storageQuestions.length);
  const probesBlock = formatScreeningProbesSection(storageQuestions.length);

  let text = mergeAdditionalQuestionsIntoCallPrompt(prompt, storageQuestions);

  if (text.includes("{jd_screening_questions_list}")) {
    text = text.split("{jd_screening_questions_list}").join(questionsListBlock);
  } else {
    text = text.replace(
      /(- These are the screening questions to ask —\s*\n\s*\n)([\s\S]*?)(\n\s*\n(?:\{jd_screening_probes_section\}|- Probing rules per question:))/,
      `$1${questionsListBlock}$3`
    );
  }

  if (text.includes("{jd_screening_probes_section}")) {
    text = text.split("{jd_screening_probes_section}").join(probesBlock);
  } else {
    text = text.replace(
      /- Probing rules per question:[\s\S]*?(?=\n---|\n## Objective|\n### Closure)/,
      probesBlock
    );
  }

  if (text.includes("{jd_screening_call_flow_steps}")) {
    text = text.split("{jd_screening_call_flow_steps}").join(callFlowBlock);
  } else if (storageQuestions.length > 0) {
    text = text.replace(/\n4\. SCREENING Q1[\s\S]*?(?=\n\d+\. CLOSURE —)/, `\n${callFlowBlock}`);
  }

  return applyScreeningQuestionCountToPromptText(text, storageQuestions.length);
}

function upgradeLegacyVoiceCallPrompt(template) {
  let text = String(template || "");
  const hasLegacyCallFlow =
    !text.includes("{jd_screening_call_flow_steps}") &&
    /\n4\. SCREENING Q1[\s\S]*?\n12\. CLOSURE/.test(text);
  const hasLegacyQuestionList =
    !text.includes("{jd_screening_questions_list}") &&
    /- These are the screening questions to ask —\s*\n\s+1\./.test(text);
  const hasLegacyHindiQuestions = /### Screening Questions\s*\n1\. "तो \{callee_name\}/.test(text);

  if (!hasLegacyCallFlow && !hasLegacyQuestionList && !hasLegacyHindiQuestions) {
    return text;
  }

  if (hasLegacyCallFlow) {
    text = text.replace(
      /\n4\. SCREENING Q1[\s\S]*?\n12\. CLOSURE/,
      "\n{jd_screening_call_flow_steps}\n\n12. CLOSURE"
    );
  }

  if (hasLegacyQuestionList) {
    text = text.replace(
      /- These are the screening questions to ask —\s*\n[\s\S]*?(?=\n---\s*\n\n### Closure)/,
      "- These are the screening questions to ask —\n\n{jd_screening_questions_list}\n\n{jd_screening_probes_section}\n"
    );
  }

  if (hasLegacyHindiQuestions) {
    text = text.replace(
      /### Screening Questions\s*\n1\. "तो[\s\S]*?(?=\n### Closure)/,
      "### Screening Questions\nWhen ACTIVE_LANGUAGE = Hindi, ask the eight questions from the Screening Questions section above — translate each one naturally into conversational Hinglish while keeping the same meaning and order.\n\n"
    );
  }

  return text;
}

function buildJdVariableMap(context = {}) {
  const jobTitle = String(context.jobTitle || "").trim();
  const jdExtract =
    context.jdExtract && typeof context.jdExtract === "object" && !Array.isArray(context.jdExtract)
      ? context.jdExtract
      : {};

  const company = sanitizeCompanyName(jdExtract.company);
  const role = resolveJdRole(jdExtract, jobTitle);
  const experience = sanitizeJdField(jdExtract.experience);
  const qualification = sanitizeJdField(jdExtract.qualification);
  const responsibilities = normalizeResponsibilityList(jdExtract.responsibilities);
  const roleBrief =
    sanitizeJdField(jdExtract.roleBrief) || buildDefaultRoleBrief(role, company);
  const userScreeningQuestions = sanitizeUserScreeningQuestions(context.userScreeningQuestions);
  const screeningQuestions = context.useCustomScreeningQuestions
    ? userScreeningQuestions
    : userScreeningQuestions.length > 0
      ? userScreeningQuestions
      : normalizeScreeningQuestions(jdExtract.screeningQuestions, role);

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

function buildVoiceAgentLaunchContext({
  jobDescription = "",
  jobTitle = "",
  jdExtract = null,
  userScreeningQuestions = [],
  useCustomScreeningQuestions = false,
  companyName = "",
  location = "",
  experienceRequired = "",
} = {}) {
  const context = { jobTitle, jdExtract, userScreeningQuestions, useCustomScreeningQuestions };
  return {
    jobDescription,
    jobTitle,
    jdExtract,
    companyName,
    location,
    experienceRequired,
    jdVariables: buildJdVariableMap(context),
  };
}

/**
 * Map legacy screening placeholders ({{job_title}}, {candidate_first_name}, etc.)
 * to Hunar-safe single-brace tokens or plain values before agent sync.
 */
function normalizeScreeningTemplateText(text, details = {}) {
  const jobTitle = String(details.jobTitle || "").trim();
  const companyName = String(details.companyName || "").trim();
  const location = String(details.location || "").trim();
  const experience = String(details.experienceRequired || "").trim();

  const replacements = [
    [/\{\{\s*candidate_first_name\s*\}\}/gi, "{callee_name}"],
    [/\{\{\s*job_title\s*\}\}/gi, jobTitle || "{jd_role}"],
    [/\{\{\s*company_name\s*\}\}/gi, companyName || "{jd_company}"],
    [/\{\{\s*job_location\s*\}\}/gi, location || "the job location"],
    [/\{\{\s*experience_required\s*\}\}/gi, experience || "{jd_experience}"],
    [/\{\s*candidate_first_name\s*\}/gi, "{callee_name}"],
    [/\{\s*company_name\s*\}/gi, companyName || "{jd_company}"],
    [/\{\s*job_location\s*\}/gi, location || "the job location"],
    [/\{\s*experience_required\s*\}/gi, experience || "{jd_experience}"],
  ];

  let result = String(text || "");
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Resolve campaign-level placeholders in a voice-agent prompt template.
 */
function resolveVoiceAgentPromptTemplate(template, context = {}) {
  const jobDescription = normalizeMultilineText(context.jobDescription || "");
  const jobTitle = String(context.jobTitle || "").trim();
  const jdExtract =
    context.jdExtract && typeof context.jdExtract === "object" && !Array.isArray(context.jdExtract)
      ? context.jdExtract
      : {};
  const normalizedTemplate = normalizeScreeningTemplateText(template, {
    jobTitle,
    companyName: String(context.companyName || jdExtract.company || "").trim(),
    location: String(context.location || "").trim(),
    experienceRequired: String(context.experienceRequired || jdExtract.experience || "").trim(),
  });
  const jdVariables =
    context.jdVariables && typeof context.jdVariables === "object"
      ? context.jdVariables
      : buildJdVariableMap(context);
  let jobDescriptionInjected = false;

  return normalizedTemplate.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, rawKey) => {
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
      return jdVariables[key];
    }
    if (PER_CALL_VARIABLES.includes(key)) {
      return match;
    }
    return match;
  });
}

/** @deprecated Use resolveVoiceAgentPromptTemplate */
function substituteJobDescription(text, jobDescription, jobTitle = "", jdExtract = null) {
  return resolveVoiceAgentPromptTemplate(text, {
    jobDescription,
    jobTitle,
    jdExtract,
  });
}

function normalizeResultFieldRows(fields) {
  const rows = [];
  const seen = new Set();
  for (const row of Array.isArray(fields) ? fields : []) {
    const columnName = String(row?.columnName || "").trim();
    const expectedValue = String(row?.expectedValue || "").trim();
    if (!columnName || !expectedValue) continue;
    const key = columnName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ columnName, expectedValue });
  }
  return rows;
}

function escapeResultPromptJsonKey(key) {
  return String(key || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function jsonPlaceholderForResultField(columnName, expectedValue) {
  const key = String(columnName || "").trim().toLowerCase();
  const hint = String(expectedValue || "").trim().toLowerCase();
  if (hint.includes("array") || key.includes("questions")) return "[]";
  return '""';
}

function compactRuleExpectedValue(expectedValue) {
  let text = String(expectedValue || "").trim();
  if (!text) return "explicit conversation evidence only";
  if (text.toLowerCase().startsWith("candidate's answer to:")) {
    return "answer stated during the call";
  }
  text = text.replace(/\{[a-z_][a-z0-9_]*\}/gi, "the candidate");
  text = text.replace(/\s+/g, " ");
  if (text.length > 72) return `${text.slice(0, 69).trimEnd()}...`;
  return text;
}

function fieldRuleLineForResultField(columnName, expectedValue) {
  const name = String(columnName || "").trim();
  if (!name) return "";
  const hint = String(expectedValue || "").trim().toLowerCase();
  if (hint.includes("array") || name.toLowerCase().includes("questions")) {
    return `- ${name}: array of strings from the conversation`;
  }
  return `- ${name}: ${compactRuleExpectedValue(expectedValue)}`;
}

function buildResultPromptJsonBlock(fields) {
  const rows = normalizeResultFieldRows(fields);
  if (!rows.length) return '{\n  "field": ""\n}';
  const lines = rows.map(
    (row) =>
      `  "${escapeResultPromptJsonKey(row.columnName)}": ${jsonPlaceholderForResultField(
        row.columnName,
        row.expectedValue
      )}`
  );
  return `{\n${lines.join(",\n")}\n}`;
}

/** Builds the Hunar result prompt from result column rows. */
function buildResultPromptFromFields(fields) {
  const rows = normalizeResultFieldRows(fields);
  const jsonBlock = buildResultPromptJsonBlock(rows);
  const fieldRules = rows
    .map((row) => fieldRuleLineForResultField(row.columnName, row.expectedValue))
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
${fieldRules || "- Populate every field using only explicit conversation evidence."}`.trim();
}

function buildHunarResultSchema(resultFields) {
  const schema = {};
  normalizeResultFieldRows(resultFields).forEach((row) => {
    schema[row.columnName] = row.expectedValue;
  });
  return schema;
}

function resolveHunarResultConfig(campaign, resultFields) {
  const config = campaign?.voiceAgentConfig || {};
  const storedAgent =
    campaign?.hunarVoiceAgent &&
    typeof campaign.hunarVoiceAgent === "object" &&
    !Array.isArray(campaign.hunarVoiceAgent)
      ? campaign.hunarVoiceAgent
      : {};

  const rebuiltPrompt = buildResultPromptFromFields(resultFields);
  const storedPrompt = String(storedAgent.result_prompt || config.resultPrompt || "").trim();
  const resultPrompt = rebuiltPrompt || storedPrompt;

  const rebuiltSchema = buildHunarResultSchema(resultFields);
  const storedSchema =
    storedAgent.result_schema && typeof storedAgent.result_schema === "object"
      ? storedAgent.result_schema
      : {};
  const resultSchema =
    Object.keys(rebuiltSchema).length > 0 ? rebuiltSchema : storedSchema;

  return { resultPrompt, resultSchema };
}

module.exports = {
  SAVE_TIME_VARIABLES,
  PER_CALL_VARIABLES,
  JOB_DESCRIPTION_BLOCK_BEGIN,
  JOB_DESCRIPTION_BLOCK_END,
  JOB_DESCRIPTION_REFERENCE,
  normalizeMultilineText,
  formatJobDescriptionBlock,
  formatCompanyKnowledgeSection,
  formatRoleDetailsKnowledgeSection,
  buildJdVariableMap,
  buildVoiceAgentLaunchContext,
  upgradeLegacyVoiceCallPrompt,
  normalizeScreeningTemplateText,
  resolveVoiceAgentPromptTemplate,
  substituteJobDescription,
  parseAdditionalQuestionsFromCallPrompt,
  hasScreeningQuestionsSectionInCallPrompt,
  stripScreeningQuestionsMetadataSection,
  syncScreeningQuestionsIntoCallPrompt,
  applyScreeningQuestionCountToCallObjective,
  buildResultPromptFromFields,
  buildHunarResultSchema,
  resolveHunarResultConfig,
};
