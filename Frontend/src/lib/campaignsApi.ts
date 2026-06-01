import { authHeaders } from "@/lib/auth";
import type {
  CampaignContact,
  CampaignOutreachStatus,
  CampaignCalendlyAutomation,
  CampaignRecord,
} from "@/lib/campaigns";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function parseContact(raw: unknown): CampaignContact | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidateKey = typeof o.candidateKey === "string" ? o.candidateKey : "";
  if (!candidateKey) return null;
  return {
    candidateKey,
    candidateId: typeof o.candidateId === "string" ? o.candidateId : "",
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : "",
    phone: typeof o.phone === "string" ? o.phone : "",
    role: typeof o.role === "string" ? o.role : "",
    company: typeof o.company === "string" ? o.company : "",
    location: typeof o.location === "string" ? o.location : "",
    linkedinUrl: typeof o.linkedinUrl === "string" ? o.linkedinUrl : "",
    sourcingSessionId: typeof o.sourcingSessionId === "string" ? o.sourcingSessionId : "",
    addedAt:
      typeof o.addedAt === "string"
        ? o.addedAt
        : o.addedAt
          ? new Date(String(o.addedAt)).toISOString()
          : new Date().toISOString(),
  };
}

function parseCampaign(raw: unknown): CampaignRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const name = typeof o.name === "string" ? o.name : "";
  if (!id || !name) return null;
  const contacts = Array.isArray(o.contacts)
    ? o.contacts.map(parseContact).filter((c): c is CampaignContact => c !== null)
    : [];
  const createdAt =
    typeof o.createdAt === "string"
      ? o.createdAt
      : o.createdAt
        ? new Date(String(o.createdAt)).toISOString()
        : new Date().toISOString();
  const outreachPlanId =
    typeof o.outreachPlanId === "string" && o.outreachPlanId.trim()
      ? o.outreachPlanId.trim()
      : undefined;
  const outreachChannel =
    o.outreachChannel === "whatsapp"
      ? "whatsapp"
      : o.outreachChannel === "gmail"
        ? "gmail"
        : undefined;
  const outreachStatus =
    typeof o.outreachStatus === "string" &&
    ["idle", "active", "paused", "completed"].includes(o.outreachStatus)
      ? (o.outreachStatus as CampaignOutreachStatus)
      : undefined;
  const outreachStartedAt =
    typeof o.outreachStartedAt === "string"
      ? o.outreachStartedAt
      : o.outreachStartedAt
        ? new Date(String(o.outreachStartedAt)).toISOString()
        : null;
  const contactsSent =
    typeof o.contactsSent === "number" && Number.isFinite(o.contactsSent)
      ? Math.max(0, Math.floor(o.contactsSent))
      : undefined;
  const interestedCount =
    typeof o.interestedCount === "number" && Number.isFinite(o.interestedCount)
      ? Math.max(0, Math.floor(o.interestedCount))
      : undefined;
  const lastActivityAt =
    typeof o.lastActivityAt === "string"
      ? o.lastActivityAt
      : o.lastActivityAt
        ? new Date(String(o.lastActivityAt)).toISOString()
        : null;
  const jobDescription =
    typeof o.jobDescription === "string" ? o.jobDescription.trim() : "";

  let calendlyAutomation: CampaignCalendlyAutomation | undefined;
  if (o.calendlyAutomation && typeof o.calendlyAutomation === "object") {
    const c = o.calendlyAutomation as Record<string, unknown>;
    calendlyAutomation = {
      enabled: Boolean(c.enabled),
      meetingUri: typeof c.meetingUri === "string" ? c.meetingUri.trim() : "",
      meetingName: typeof c.meetingName === "string" ? c.meetingName.trim() : "",
      schedulingUrl: typeof c.schedulingUrl === "string" ? c.schedulingUrl.trim() : "",
      durationMinutes:
        typeof c.durationMinutes === "number" && Number.isFinite(c.durationMinutes)
          ? c.durationMinutes
          : 0,
      kind: typeof c.kind === "string" ? c.kind.trim() : "",
    };
  }

  return {
    id,
    name,
    createdAt,
    contacts,
    jobDescription,
    ...(calendlyAutomation ? { calendlyAutomation } : {}),
    ...(outreachPlanId ? { outreachPlanId } : {}),
    ...(outreachChannel ? { outreachChannel } : {}),
    ...(outreachStatus ? { outreachStatus } : {}),
    ...(outreachStartedAt !== undefined ? { outreachStartedAt } : {}),
    ...(contactsSent !== undefined ? { contactsSent } : {}),
    ...(interestedCount !== undefined ? { interestedCount } : {}),
    ...(lastActivityAt !== undefined ? { lastActivityAt } : {}),
  };
}

export type LaunchCampaignSequenceResult = {
  campaign: CampaignRecord;
  enrolled: number;
  skipped: number;
  touchpointCount: number;
  outreachStatus: CampaignOutreachStatus;
};

export async function launchCampaignSequence(
  token: string,
  campaignId: string
): Promise<LaunchCampaignSequenceResult> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/launch-sequence`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to launch campaign"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return {
    campaign,
    enrolled: typeof data.enrolled === "number" ? data.enrolled : 0,
    skipped: typeof data.skipped === "number" ? data.skipped : 0,
    touchpointCount: typeof data.touchpointCount === "number" ? data.touchpointCount : 0,
    outreachStatus:
      typeof data.outreachStatus === "string" ? data.outreachStatus : "active",
  };
}

export async function pauseCampaignSequence(
  token: string,
  campaignId: string
): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/pause-sequence`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to pause campaign"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function resumeCampaignSequence(
  token: string,
  campaignId: string
): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/resume-sequence`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to resume campaign"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function setCampaignOutreachPlan(
  token: string,
  campaignId: string,
  outreachPlanId: string | null,
  outreachChannel: "gmail" | "whatsapp" = "gmail"
): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/outreach-plan`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ outreachPlanId, outreachChannel }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to link sequence to campaign"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function updateCampaignJobDescription(
  token: string,
  campaignId: string,
  jobDescription: string
): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/job-description`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ jobDescription: jobDescription.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to save job description"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function updateCampaignCalendlyAutomation(
  token: string,
  campaignId: string,
  calendlyAutomation: CampaignCalendlyAutomation
): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/calendly-automation`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ calendlyAutomation }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to save interview link"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function syncCampaignRevealedContacts(
  token: string,
  campaignId: string
): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/contacts/sync-revealed`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to sync revealed contacts"
    );
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function fetchCampaign(token: string, campaignId: string): Promise<CampaignRecord> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load campaign");
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return campaign;
}

export async function fetchCampaignContactsPage(
  token: string,
  campaignId: string,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    disposition?: "all" | "interested" | "not_interested" | "awaiting";
  }
): Promise<{
  contacts: CampaignContact[];
  dispositionByCandidateKey: Record<string, "unknown" | "interested" | "not_interested">;
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}> {
  const params = new URLSearchParams();
  if (options?.page && options.page > 0) params.set("page", String(options.page));
  if (options?.limit && options.limit > 0) params.set("limit", String(options.limit));
  if (options?.search && options.search.trim()) params.set("search", options.search.trim());
  if (options?.disposition && options.disposition !== "all") {
    params.set("disposition", options.disposition);
  }
  const qs = params.toString();
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/contacts${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load contacts");
  }
  const contacts = Array.isArray(data.contacts)
    ? data.contacts.map(parseContact).filter((c: CampaignContact | null): c is CampaignContact => c !== null)
    : [];
  const page = typeof data.pagination?.page === "number" ? data.pagination.page : options?.page || 1;
  const limit =
    typeof data.pagination?.limit === "number" ? data.pagination.limit : options?.limit || 15;
  const total = typeof data.pagination?.total === "number" ? data.pagination.total : contacts.length;
  const totalPages =
    typeof data.pagination?.totalPages === "number"
      ? data.pagination.totalPages
      : Math.max(1, Math.ceil(total / Math.max(1, limit)));
  return {
    contacts,
    dispositionByCandidateKey:
      data.dispositionByCandidateKey && typeof data.dispositionByCandidateKey === "object"
        ? (data.dispositionByCandidateKey as Record<
            string,
            "unknown" | "interested" | "not_interested"
          >)
        : {},
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: Boolean(data.pagination?.hasMore),
    },
  };
}

export async function fetchCampaigns(token: string): Promise<CampaignRecord[]> {
  const res = await fetch(`${apiBase()}/api/campaigns`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load campaigns");
  }
  if (!Array.isArray(data.campaigns)) return [];
  return data.campaigns
    .map(parseCampaign)
    .filter((c: CampaignRecord | null): c is CampaignRecord => c !== null);
}

export const CAMPAIGNS_LIST_PAGE_SIZE = 15;

export type CampaignsListSummary = {
  total: number;
  active: number;
  contacts: number;
};

export type CampaignsListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export async function fetchCampaignsPage(
  token: string,
  options?: { page?: number; limit?: number }
): Promise<{
  campaigns: CampaignRecord[];
  summary: CampaignsListSummary;
  pagination: CampaignsListPagination;
}> {
  const params = new URLSearchParams();
  if (options?.page && options.page > 0) params.set("page", String(options.page));
  if (options?.limit && options.limit > 0) params.set("limit", String(options.limit));
  const qs = params.toString();
  const res = await fetch(`${apiBase()}/api/campaigns${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load campaigns");
  }
  const campaigns = Array.isArray(data.campaigns)
    ? data.campaigns
        .map(parseCampaign)
        .filter((c: CampaignRecord | null): c is CampaignRecord => c !== null)
    : [];
  const page = typeof data.pagination?.page === "number" ? data.pagination.page : options?.page || 1;
  const limit =
    typeof data.pagination?.limit === "number"
      ? data.pagination.limit
      : options?.limit || CAMPAIGNS_LIST_PAGE_SIZE;
  const total =
    typeof data.pagination?.total === "number" ? data.pagination.total : campaigns.length;
  const totalPages =
    typeof data.pagination?.totalPages === "number"
      ? data.pagination.totalPages
      : Math.max(1, Math.ceil(total / limit) || 1);
  const summaryRaw =
    data.summary && typeof data.summary === "object"
      ? (data.summary as Record<string, unknown>)
      : null;

  return {
    campaigns,
    summary: {
      total: typeof summaryRaw?.total === "number" ? summaryRaw.total : total,
      active: typeof summaryRaw?.active === "number" ? summaryRaw.active : 0,
      contacts: typeof summaryRaw?.contacts === "number" ? summaryRaw.contacts : 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: typeof data.pagination?.hasMore === "boolean" ? data.pagination.hasMore : page < totalPages,
    },
  };
}

export async function createCampaign(
  token: string,
  name: string,
  contacts: CampaignContact[] = [],
  options?: { revealInBackground?: boolean }
): Promise<{
  campaign: CampaignRecord;
  revealJobId: string | null;
  limitSkippedCount: number;
}> {
  const res = await fetch(`${apiBase()}/api/campaigns`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      name,
      contacts,
      revealInBackground: options?.revealInBackground !== false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to create campaign");
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  const revealJobId =
    data.revealJob && typeof data.revealJob === "object" && typeof data.revealJob.id === "string"
      ? data.revealJob.id
      : null;
  const limitSkippedCount =
    typeof data.limitSkippedCount === "number" ? data.limitSkippedCount : 0;
  return { campaign, revealJobId, limitSkippedCount };
}

export async function addContactsToCampaignApi(
  token: string,
  campaignId: string,
  contacts: CampaignContact[],
  options?: { revealInBackground?: boolean }
): Promise<{
  campaign: CampaignRecord;
  addedCount: number;
  skippedCount: number;
  limitSkippedCount: number;
  revealJobId: string | null;
}> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/contacts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      contacts,
      revealInBackground: options?.revealInBackground !== false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to add contacts");
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  const addedCount = typeof data.addedCount === "number" ? data.addedCount : 0;
  const skippedCount = typeof data.skippedCount === "number" ? data.skippedCount : 0;
  const limitSkippedCount =
    typeof data.limitSkippedCount === "number" ? data.limitSkippedCount : 0;
  const revealJobId =
    data.revealJob && typeof data.revealJob === "object" && typeof data.revealJob.id === "string"
      ? data.revealJob.id
      : null;
  return { campaign, addedCount, skippedCount, limitSkippedCount, revealJobId };
}

export async function removeContactFromCampaignApi(
  token: string,
  campaignId: string,
  candidateKey: string
): Promise<{ campaign: CampaignRecord; removed: number }> {
  const key = String(candidateKey || "").trim();
  if (!key) throw new Error("candidateKey is required");
  const res = await fetch(
    `${apiBase()}/api/campaigns/${campaignId}/contacts/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to remove contact");
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return {
    campaign,
    removed: typeof data.removed === "number" ? data.removed : 0,
  };
}
