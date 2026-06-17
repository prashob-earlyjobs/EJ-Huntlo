export type CampaignContact = {
  candidateKey: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  location: string;
  linkedinUrl: string;
  sourcingSessionId: string;
  /** Per-contact job description (AI voice call campaigns). */
  jd?: string;
  addedAt: string;
};

export type CampaignOutreachStatus = "idle" | "active" | "paused" | "completed";

export type CampaignCalendlyAutomation = {
  enabled?: boolean;
  meetingUri?: string;
  meetingName?: string;
  schedulingUrl?: string;
  durationMinutes?: number;
  kind?: string;
};

export type HunarVoiceAgentRecord = {
  id: string;
  name?: string;
  voice_persona?: string;
  persona_name?: string | null;
  voice_name?: string;
  summary?: string;
  logo?: string;
  agent_code?: string;
  created_at?: string;
  agent_prompt?: string;
  introduction?: string;
  objective?: string;
  introduction_prompt?: string;
  silence_response?: string;
  conclusion?: string;
  result_prompt?: string;
  status?: string | null;
  language?: string;
  custom_variables?: string[];
  result_schema?: Record<string, unknown>;
  [key: string]: unknown;
};

export type VoiceAgentConfigRecord = {
  callObjective: string;
  introductoryStatement: string;
  callPrompt: string;
  resultPrompt: string;
  resultFields: Array<{ columnName: string; expectedValue: string }>;
};

export type CampaignRecord = {
  id: string;
  name: string;
  /** Open role title for outreach merge tags and AI context. */
  jobTitle?: string;
  /** Role context for AI and the Job description tab. */
  jobDescription?: string;
  /** Per-campaign interview link for email AI auto-replies. */
  calendlyAutomation?: CampaignCalendlyAutomation;
  createdAt: string;
  /** Linked outreach sequence for the campaign editor. */
  outreachPlanId?: string;
  /** gmail = email sequence; whatsapp = WhatsApp sequence; voice_call = AI voice calls */
  outreachChannel?: "gmail" | "whatsapp" | "voice_call";
  emailIntegrationId?: string;
  outreachStatus?: CampaignOutreachStatus;
  outreachStartedAt?: string | null;
  /** Contacts with at least one outreach message sent (list view). */
  contactsSent?: number;
  /** Candidates marked interested (list view). */
  interestedCount?: number;
  /** Latest send, reply, or campaign update (list view). */
  lastActivityAt?: string | null;
  /** Total contacts in campaign (may be set when `contacts` is not loaded). */
  contactCount?: number;
  /** Hunar AI voice agent id created from the voice agent editor. */
  hunarVoiceAgentId?: string;
  /** Full Hunar voice agent object returned when the agent is created. */
  hunarVoiceAgent?: HunarVoiceAgentRecord | null;
  /** Saved voice agent editor templates (placeholders resolved on save). */
  voiceAgentConfig?: VoiceAgentConfigRecord | null;
  contacts: CampaignContact[];
};
