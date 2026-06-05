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

export type CampaignRecord = {
  id: string;
  name: string;
  /** Role context for AI and the Job description tab. */
  jobDescription?: string;
  /** Per-campaign interview link for email AI auto-replies. */
  calendlyAutomation?: CampaignCalendlyAutomation;
  createdAt: string;
  /** Linked outreach sequence for the campaign editor. */
  outreachPlanId?: string;
  /** gmail = email sequence; whatsapp = WhatsApp sequence */
  outreachChannel?: "gmail" | "whatsapp";
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
  contacts: CampaignContact[];
};
