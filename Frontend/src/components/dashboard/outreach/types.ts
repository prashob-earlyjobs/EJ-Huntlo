export type OutreachChannel = "whatsapp" | "email" | "voice" | "linkedin";

export type OutreachCampaignMode = "single" | "multi";

export type OutreachCampaignStatus = "active" | "draft" | "completed" | "paused";

export type CampaignGoal =
  | "interest"
  | "screening"
  | "job_opportunity"
  | "follow_up";

export type CandidateSource =
  | "talent_pool"
  | "csv"
  | "cvs"
  | "ats";

export type SequenceCondition =
  | "all"
  | "no_response"
  | "not_opened"
  | "not_interested"
  | "whatsapp_not_delivered";

export type DelayUnit = "minutes" | "hours" | "days";

export type VoiceTone = "professional" | "friendly" | "direct";

export type CandidateResponseStatus =
  | "interested"
  | "not_interested"
  | "no_response"
  | "replied"
  | "follow_up_scheduled"
  | "interview_scheduled"
  | "call_completed"
  | "failed_delivery";

export type OutreachCampaignRow = {
  id: string;
  name: string;
  mode: OutreachCampaignMode;
  channels: string[];
  candidates: number;
  status: OutreachCampaignStatus;
  responseRate: string;
  createdDate: string;
};

export type OutreachCandidate = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  matchScore: number;
  status: string;
};

export type SequenceStep = {
  id: string;
  channel: OutreachChannel;
  label: string;
  delayValue: number;
  delayUnit: DelayUnit;
  condition: SequenceCondition;
  timingLabel: string;
  message?: string | null;
};

export type CampaignTrackingCandidate = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  channel: string;
  lastStep: string;
  status: CandidateResponseStatus;
  interest: string;
  lastResponse: string;
  nextAction: string;
  /** Outreach enrollment — used for live sequence flow counts */
  sentCount?: number;
  hasReply?: boolean;
  replyCount?: number;
  currentStepOrder?: number | null;
};

export type SequenceFlowStepCounts = {
  stepOrder: number;
  contacted: number;
  replied: number;
  noReply: number;
  awaiting: number;
};

export type CampaignDetailStats = {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  interested: number;
  notInterested: number;
  noResponse: number;
};

export type CampaignScheduledInterview = {
  id: string;
  candidateId: string;
  candidateRefId: string;
  candidateName: string;
  inviteeEmail: string;
  inviteeName: string;
  eventName: string;
  hostName: string;
  startTime: string | null;
  endTime: string | null;
  status: "active" | "canceled";
  rescheduleUrl: string;
  cancelUrl: string;
  timezone: string;
  locationLabel: string;
};

export type CampaignCalendlyConfig = {
  enabled: boolean;
  meetingName: string;
  schedulingUrl: string;
};

export type CampaignDetailsForm = {
  name: string;
  jobTitle: string;
  jobDescription: string;
  goal: CampaignGoal;
};
