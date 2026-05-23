export type CampaignContact = {
  candidateKey: string;
  candidateId: string;
  name: string;
  email: string;
  role: string;
  company: string;
  location: string;
  linkedinUrl: string;
  sourcingSessionId: string;
  addedAt: string;
};

export type CampaignRecord = {
  id: string;
  name: string;
  createdAt: string;
  contacts: CampaignContact[];
};
