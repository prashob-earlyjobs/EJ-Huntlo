/** Defaults aligned with Frontend/src/lib/defaultVoiceCallPrompt.ts and campaignVoiceApi.ts */

const VOICE_CALL_INTRO_DEFAULT = "Hello, am I speaking with {callee_name}?";

const VOICE_CALL_OBJECTIVE_DEFAULT =
  "Screen the candidate for the {jd_role_screening_label}{jd_company_at_clause} — confirm identity and timing, deliver the role brief, ask eight screening questions, and close with next steps.";

const DEFAULT_OUTREACH_VOICE_RESULT_FIELDS = [
  { columnName: "summary", expectedValue: "under 50 words" },
  {
    columnName: "candidate_status",
    expectedValue: "Confirmed Candidate, Wrong Person, Unable To Verify, or Call Disconnected",
  },
  {
    columnName: "interest_level",
    expectedValue: "Interested, Not Interested, Requested Callback, or Unclear",
  },
  { columnName: "callback_requested", expectedValue: "Yes or No" },
  { columnName: "callback_time", expectedValue: "callback time or Not provided" },
  { columnName: "candidate_questions", expectedValue: "array of question strings" },
  {
    columnName: "final_outcome",
    expectedValue:
      "Interested, Not Interested, Callback Scheduled, Wrong Person, Incomplete Call, or Unable To Determine",
  },
  { columnName: "experience", expectedValue: "total years of work experience" },
  {
    columnName: "relevant_experience",
    expectedValue: "years of experience relevant to the role",
  },
  {
    columnName: "skills_and_tools",
    expectedValue: "key skills, tools, or technologies mentioned",
  },
  {
    columnName: "recent_project",
    expectedValue: "recent project or accomplishment described",
  },
  { columnName: "ctc", expectedValue: "current CTC or salary" },
  { columnName: "expected_ctc", expectedValue: "expected CTC or salary for this role" },
  { columnName: "notice_period", expectedValue: "notice period or how soon they can join" },
  { columnName: "location", expectedValue: "current location" },
  { columnName: "education", expectedValue: "highest educational qualification" },
];

const VOICE_TONE_INTROS = {
  professional: VOICE_CALL_INTRO_DEFAULT,
  friendly: "Hi there! Am I speaking with {callee_name}?",
  direct: "Hello, is this {callee_name}?",
};

module.exports = {
  VOICE_CALL_INTRO_DEFAULT,
  VOICE_CALL_OBJECTIVE_DEFAULT,
  DEFAULT_OUTREACH_VOICE_RESULT_FIELDS,
  VOICE_TONE_INTROS,
};
