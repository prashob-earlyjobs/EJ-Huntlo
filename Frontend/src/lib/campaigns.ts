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

export type CampaignRecord = {
  id: string;
  name: string;
  createdAt: string;
  /** Linked outreach sequence for the campaign editor. */
  outreachPlanId?: string;
  /** gmail = email sequence; whatsapp = WhatsApp sequence */
  outreachChannel?: "gmail" | "whatsapp";
  outreachStatus?: CampaignOutreachStatus;
  outreachStartedAt?: string | null;
  contacts: CampaignContact[];
};
