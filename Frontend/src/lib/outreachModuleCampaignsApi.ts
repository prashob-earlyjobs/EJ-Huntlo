import { authHeaders } from "@/lib/auth";
import type {
  CampaignCalendlyConfig,
  CampaignDetailStats,
  CampaignGoal,
  CampaignScheduledInterview,
  CampaignTrackingCandidate,
  CandidateSource,
  OutreachCampaignMode,
  OutreachCampaignRow,
  OutreachCampaignStatus,
  OutreachCandidate,
  OutreachChannel,
  SequenceStep,
} from "@/components/dashboard/outreach/types";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type OutreachModuleDashboardStats = {
  totalCampaigns: number;
  candidatesContacted: number;
  interestedCandidates: number;
  avgResponseRate: string;
};

export type OutreachModuleChannelMessage = {
  channel: OutreachChannel;
  templateId?: string;
  followUpTemplateId?: string;
  followUpBody?: string;
  followUpWaitHours?: number;
  followUp2TemplateId?: string;
  followUp2Body?: string;
  followUp2WaitHours?: number;
  replyQuestions?: string[];
  replyBody?: string;
  subject?: string;
  body?: string;
  emailTouchpoints?: Array<{
    order: number;
    label: string;
    subject: string;
    body: string;
    waitDays: number;
  }>;
  callObjective?: string;
  voiceTone?: "professional" | "friendly" | "direct";
  callAttempts?: number;
  attemptGapHours?: number;
};

export type CreateOutreachModuleCampaignInput = {
  name: string;
  jobTitle: string;
  jobDescription?: string;
  goal?: CampaignGoal;
  mode: OutreachCampaignMode;
  launch?: boolean;
  status?: OutreachCampaignStatus;
  candidateSource?: CandidateSource;
  candidateIds: string[];
  aiPersonalize?: boolean;
  channel?: OutreachChannel;
  channelMessage?: OutreachModuleChannelMessage;
  sequenceSteps?: Array<Omit<SequenceStep, "id"> & { message?: OutreachModuleChannelMessage | null }>;
};

export type OutreachModuleCampaignDetail = OutreachCampaignRow & {
  jobTitle: string;
  jobDescription: string;
  goal: CampaignGoal;
  candidateSource: CandidateSource;
  aiPersonalize: boolean;
  channel: OutreachChannel | "";
  channelMessage: OutreachModuleChannelMessage | null;
  sequenceSteps: SequenceStep[];
  launchedAt: string | null;
  completedAt: string | null;
  emailAutoReplyEnabled?: boolean;
  calendlyAutomation?: {
    enabled?: boolean;
    meetingUri?: string;
    meetingName?: string;
    schedulingUrl?: string;
    durationMinutes?: number;
    kind?: string;
  };
  stats: CampaignDetailStats;
  funnel: { label: string; count: number }[];
  trackingCandidates: CampaignTrackingCandidate[];
  builder: OutreachModuleBuilderState | null;
};

type ApiErrorBody = { success?: boolean; message?: string; code?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & ApiErrorBody;
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function createOutreachModuleDraft(
  token: string,
  mode: OutreachCampaignMode,
  options?: { sourceModule?: "outreach" | "screening" | "huntlo360" }
) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/drafts`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      ...(options?.sourceModule ? { sourceModule: options.sourceModule } : {}),
    }),
  });
  return parseJson<{
    success: boolean;
    campaign: OutreachModuleCampaignDetail;
    row: OutreachCampaignRow;
    builder: OutreachModuleBuilderState;
  }>(res);
}

export type OutreachModuleBuilderStepKey =
  | "details"
  | "channel"
  | "message"
  | "sequence"
  | "personalize"
  | "candidates";

export type OutreachModuleBuilderState = {
  currentStep: number;
  completedSteps: OutreachModuleBuilderStepKey[];
  stepOrder: OutreachModuleBuilderStepKey[];
  steps: Partial<Record<OutreachModuleBuilderStepKey, unknown>>;
};

export async function fetchOutreachModuleCampaignBuilder(token: string, campaignId: string) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}/builder`, {
    headers: authHeaders(token),
  });
  return parseJson<{
    success: boolean;
    campaignId: string;
    mode: OutreachCampaignMode;
    status: OutreachCampaignStatus;
    builder: OutreachModuleBuilderState;
  }>(res);
}

export async function saveOutreachModuleCampaignStep(
  token: string,
  campaignId: string,
  stepKey: OutreachModuleBuilderStepKey,
  payload: { data: Record<string, unknown>; currentStep?: number }
) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}/steps/${stepKey}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<{
    success: boolean;
    campaign: OutreachModuleCampaignDetail;
    row: OutreachCampaignRow;
    builder: OutreachModuleBuilderState;
    savedStep: OutreachModuleBuilderStepKey;
  }>(res);
}

export async function fetchOutreachModuleStats(token: string) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/stats`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<{ success: boolean; stats: OutreachModuleDashboardStats }>(res);
  return data.stats;
}

export async function fetchOutreachModuleCandidatePool(
  token: string,
  options?: {
    search?: string;
    location?: string;
    experience?: string;
    source?: "talent_pool" | "interested" | "outreach_interested";
  }
) {
  const qs = new URLSearchParams();
  if (options?.search) qs.set("search", options.search);
  if (options?.location) qs.set("location", options.location);
  if (options?.experience) qs.set("experience", options.experience);
  if (options?.source && options.source !== "talent_pool") {
    qs.set(
      "source",
      options.source === "outreach_interested" ? "interested" : options.source
    );
  }
  const query = qs.toString();
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/candidates/pool${query ? `?${query}` : ""}`,
    { headers: authHeaders(token), cache: "no-store" }
  );
  const data = await parseJson<{ success: boolean; candidates: OutreachCandidate[] }>(res);
  return data.candidates;
}

export type OutreachCsvImportContact = {
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  location?: string;
};

export async function importOutreachModuleCandidatesCsv(
  token: string,
  contacts: OutreachCsvImportContact[]
) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/candidates/import-csv`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ contacts }),
  });
  const data = await parseJson<{
    success: boolean;
    candidates: OutreachCandidate[];
    imported: number;
  }>(res);
  return data;
}

export async function fetchOutreachModuleCampaigns(
  token: string,
  options?: {
    page?: number;
    limit?: number;
    status?: OutreachCampaignStatus;
    sourceModule?: "outreach" | "screening" | "huntlo360";
  }
) {
  const qs = new URLSearchParams();
  if (options?.page) qs.set("page", String(options.page));
  if (options?.limit) qs.set("limit", String(options.limit));
  if (options?.status) qs.set("status", options.status);
  if (options?.sourceModule) qs.set("sourceModule", options.sourceModule);
  const query = qs.toString();
  const res = await fetch(`${apiBase()}/api/outreach-campaigns${query ? `?${query}` : ""}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<{
    success: boolean;
    campaigns: OutreachCampaignRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(res);
  return data;
}

export async function fetchOutreachModuleCampaign(token: string, campaignId: string) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<{ success: boolean; campaign: OutreachModuleCampaignDetail }>(res);
  return data.campaign;
}

export async function createOutreachModuleCampaign(
  token: string,
  payload: CreateOutreachModuleCampaignInput
) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{
    success: boolean;
    campaign: OutreachModuleCampaignDetail;
    row: OutreachCampaignRow;
  }>(res);
  return data;
}

export async function updateOutreachModuleCampaign(
  token: string,
  campaignId: string,
  payload: Partial<CreateOutreachModuleCampaignInput>
) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{
    success: boolean;
    campaign: OutreachModuleCampaignDetail;
    row: OutreachCampaignRow;
  }>(res);
  return data;
}

export async function deleteOutreachModuleCampaign(token: string, campaignId: string) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parseJson<{ success: boolean; deleted: boolean; id: string }>(res);
}

export async function launchOutreachModuleCampaign(
  token: string,
  campaignId: string,
  options?: { emailIntegrationId?: string }
) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}/launch`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });
  const data = await parseJson<{ success: boolean; campaign: OutreachModuleCampaignDetail }>(res);
  return data.campaign;
}

export async function pauseOutreachModuleCampaign(token: string, campaignId: string) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}/pause`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await parseJson<{ success: boolean; campaign: OutreachModuleCampaignDetail }>(res);
  return data.campaign;
}

export async function resumeOutreachModuleCampaign(token: string, campaignId: string) {
  const res = await fetch(`${apiBase()}/api/outreach-campaigns/${campaignId}/resume`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await parseJson<{ success: boolean; campaign: OutreachModuleCampaignDetail }>(res);
  return data.campaign;
}

export async function fetchOutreachModuleCampaignTracking(
  token: string,
  campaignId: string,
  options?: { syncReplies?: boolean }
) {
  const params = new URLSearchParams();
  if (options?.syncReplies) params.set("syncReplies", "1");
  const query = params.toString();
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/${campaignId}/tracking${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(token),
    }
  );
  const data = await parseJson<{
    success: boolean;
    campaign: OutreachCampaignRow;
    stats: CampaignDetailStats;
    funnel: { label: string; count: number }[];
    candidates: CampaignTrackingCandidate[];
    sequenceSteps?: SequenceStep[];
    whatsappReplyQuestions?: string[];
  }>(res);
  return data;
}

export async function recordOutreachModuleCandidateAction(
  token: string,
  campaignId: string,
  candidateId: string,
  payload: { action: "screening" | "interview" | "not_interested" | "note" | "send_scheduling_link"; note?: string }
) {
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/${campaignId}/candidates/${candidateId}/actions`,
    {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return parseJson<{
    success: boolean;
    candidate: CampaignTrackingCandidate;
    stats: CampaignDetailStats;
    funnel: { label: string; count: number }[];
    schedulingUrl?: string;
    emailSent?: boolean;
    whatsappSent?: boolean;
  }>(res);
}

export async function fetchCampaignScheduledInterviews(
  token: string,
  campaignId: string,
  options?: { sync?: boolean }
) {
  const qs = new URLSearchParams();
  if (options?.sync === false) qs.set("sync", "0");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/${campaignId}/scheduled-interviews${suffix}`,
    { headers: authHeaders(token) }
  );
  return parseJson<{
    success: boolean;
    interviews: CampaignScheduledInterview[];
    calendly: CampaignCalendlyConfig;
  }>(res);
}

export async function syncCampaignScheduledInterviews(token: string, campaignId: string) {
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/${campaignId}/scheduled-interviews/sync`,
    { method: "POST", headers: authHeaders(token) }
  );
  return parseJson<{
    success: boolean;
    synced: number;
    message: string;
    interviews: CampaignScheduledInterview[];
    calendly: CampaignCalendlyConfig;
  }>(res);
}

export async function sendCampaignSchedulingLink(
  token: string,
  campaignId: string,
  candidateId: string
) {
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/${campaignId}/candidates/${candidateId}/send-scheduling-link`,
    { method: "POST", headers: authHeaders(token) }
  );
  return parseJson<{
    success: boolean;
    schedulingUrl: string;
    candidateId: string;
  }>(res);
}

export async function fetchOutreachModuleCandidateInteractions(
  token: string,
  campaignId: string,
  candidateId: string
) {
  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/${campaignId}/candidates/${candidateId}/interactions`,
    { headers: authHeaders(token) }
  );
  return parseJson<{
    success: boolean;
    candidate: CampaignTrackingCandidate;
    interactions: Array<{
      id: string;
      type: string;
      summary: string;
      content: unknown;
      at: string | null;
    }>;
    scheduledInterview: CampaignScheduledInterview | null;
  }>(res);
}
