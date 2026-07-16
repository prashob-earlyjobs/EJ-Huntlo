export type ScreeningType = "voice" | "video";

export type ScreeningStatus = "active" | "draft" | "completed" | "paused";

export type ScreeningGoal =
  | "interest"
  | "eligibility"
  | "communication"
  | "shortlist"
  | "custom";

export type CandidateSource =
  | "talent_pool"
  | "outreach_interested"
  | "csv"
  | "cvs"
  | "existing_pool"
  | "ats";

export type VoiceTone = "professional" | "friendly" | "direct";

export type CallLanguage =
  | "english"
  | "hindi"
  | "malayalam"
  | "kannada"
  | "tamil"
  | "telugu";

export type CandidateScreeningStatus =
  | "completed"
  | "pending"
  | "in_progress"
  | "call_failed"
  | "no_response"
  | "shortlisted"
  | "rejected";

export type Recommendation =
  | "strong_fit"
  | "good_fit"
  | "average_fit"
  | "not_recommended"
  | "needs_review";

export type ScreeningRow = {
  id: string;
  name: string;
  type: ScreeningType;
  candidates: number;
  completed: number;
  shortlisted: number;
  status: ScreeningStatus;
  createdDate: string;
};

export type ScreeningCandidate = {
  id: string;
  name: string;
  role: string;
  location: string;
  experience: string;
  matchScore: number;
  status: string;
  phone?: string;
  email?: string;
};

export type ScreeningQuestion = {
  id: string;
  text: string;
  hint?: string;
  criteriaTag?: string;
  weight: number;
  required: boolean;
  responseTimeLimit?: string;
};

export type EvaluationCriterion = {
  id: string;
  label: string;
  description: string;
  weight: number;
  enabled: boolean;
};

export type ScreeningDetailsForm = {
  name: string;
  jobTitle: string;
  companyName: string;
  location: string;
  experienceRequired: string;
  goal: ScreeningGoal;
  jobDescription: string;
};

export type VoiceScriptSections = {
  opening: string;
  jobIntro: string;
  closing: string;
};

export type ScreeningResultRow = {
  id: string;
  name: string;
  role: string;
  type: ScreeningType;
  status: CandidateScreeningStatus;
  score: number | null;
  recommendation: Recommendation | null;
  keyStrength: string;
  concern: string;
  completedAt: string;
};

export type ScorecardEntry = {
  label: string;
  score: number;
};

export type ScreeningTranscriptLine = {
  speaker: string;
  text: string;
};

export type ScreeningResultField = {
  label: string;
  value: string;
};

export type ScreeningResultDetail = {
  id: string;
  name: string;
  role: string;
  location: string;
  experience: string;
  overallScore: number | null;
  recommendation: Recommendation;
  aiSummary: string;
  scorecard: ScorecardEntry[];
  resultDetails: ScreeningResultField[];
  transcript: ScreeningTranscriptLine[];
  recordingUrl: string;
  insights: string[];
  concerns: string[];
  type: ScreeningType;
};
