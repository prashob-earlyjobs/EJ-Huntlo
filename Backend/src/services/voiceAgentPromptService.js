/** Variables substituted when creating/updating the Hunar agent (campaign-level data). */
const SAVE_TIME_VARIABLES = ["job_description", "job_title"];

/** Variables left in templates for per-call resolution by the voice platform. */
const PER_CALL_VARIABLES = ["callee_name"];

const JOB_DESCRIPTION_REFERENCE = "the job description above";
const JOB_DESCRIPTION_BLOCK_BEGIN = "======== JOB DESCRIPTION (START) ========";
const JOB_DESCRIPTION_BLOCK_END = "======== JOB DESCRIPTION (END) ========";

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

/**
 * Resolve campaign-level placeholders in a voice-agent prompt template.
 * - First {job_description} becomes a bounded, readable block for long JD text.
 * - Further {job_description} tokens become a short back-reference.
 * - {job_title} is inlined as plain text.
 * - Per-call tokens such as {callee_name} are preserved.
 * - Any other {token} is left unchanged so custom prompts stay flexible.
 */
function resolveVoiceAgentPromptTemplate(template, context = {}) {
  const jobDescription = normalizeMultilineText(context.jobDescription);
  const jobTitle = String(context.jobTitle || "").trim();
  let jobDescriptionInjected = false;

  return String(template || "").replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, rawKey) => {
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
      return jobTitle || "Not specified";
    }
    if (PER_CALL_VARIABLES.includes(key)) {
      return match;
    }
    return match;
  });
}

/** @deprecated Use resolveVoiceAgentPromptTemplate */
function substituteJobDescription(text, jobDescription) {
  return resolveVoiceAgentPromptTemplate(text, { jobDescription });
}

module.exports = {
  SAVE_TIME_VARIABLES,
  PER_CALL_VARIABLES,
  JOB_DESCRIPTION_BLOCK_BEGIN,
  JOB_DESCRIPTION_BLOCK_END,
  JOB_DESCRIPTION_REFERENCE,
  normalizeMultilineText,
  formatJobDescriptionBlock,
  resolveVoiceAgentPromptTemplate,
  substituteJobDescription,
};
