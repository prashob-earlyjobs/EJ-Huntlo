import { authHeaders } from "@/lib/auth";
import { parseApiError } from "@/lib/apiErrors";
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
  const contactCount =
    typeof o.contactCount === "number" && Number.isFinite(o.contactCount)
      ? Math.max(0, Math.floor(o.contactCount))
      : contacts.length;
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
  const jobTitle = typeof o.jobTitle === "string" ? o.jobTitle.trim() : "";
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

  const emailIntegrationId =
    typeof o.emailIntegrationId === "string" && o.emailIntegrationId.trim()
      ? o.emailIntegrationId.trim()
      : undefined;

  return {
    id,
    name,
    createdAt,
    contactCount,
    contacts,
    ...(jobTitle ? { jobTitle } : {}),
    jobDescription,
    ...(calendlyAutomation ? { calendlyAutomation } : {}),
    ...(outreachPlanId ? { outreachPlanId } : {}),
    ...(outreachChannel ? { outreachChannel } : {}),
    ...(emailIntegrationId ? { emailIntegrationId } : {}),
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

export type GmailDailyLimitSnapshot = {
  limit: number;
  reserved: number;
  sent: number;
  remaining: number;
  requested: number;
  usageDate?: string;
  integrationEmail?: string;
};

export class CampaignLaunchBlockedError extends Error {
  readonly code: "CAMPAIGN_ALREADY_ACTIVE" | "GMAIL_DAILY_LIMIT_EXCEEDED";
  readonly activeCampaignName: string;
  readonly gmailDailyLimit: GmailDailyLimitSnapshot | null;

  constructor(
    message: string,
    options: {
      code?: "CAMPAIGN_ALREADY_ACTIVE" | "GMAIL_DAILY_LIMIT_EXCEEDED";
      activeCampaignName?: string;
      gmailDailyLimit?: GmailDailyLimitSnapshot | null;
    } = {}
  ) {
    super(message);
    this.name = "CampaignLaunchBlockedError";
    this.code = options.code ?? "CAMPAIGN_ALREADY_ACTIVE";
    this.activeCampaignName = options.activeCampaignName ?? "";
    this.gmailDailyLimit = options.gmailDailyLimit ?? null;
  }
}

function parseGmailDailyLimit(raw: unknown): GmailDailyLimitSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const limit = typeof o.limit === "number" ? o.limit : 0;
  const reserved = typeof o.reserved === "number" ? o.reserved : 0;
  const sent = typeof o.sent === "number" ? o.sent : 0;
  const remaining = typeof o.remaining === "number" ? o.remaining : 0;
  const requested = typeof o.requested === "number" ? o.requested : 0;
  if (!limit) return null;
  return {
    limit,
    reserved,
    sent,
    remaining,
    requested,
    usageDate: typeof o.usageDate === "string" ? o.usageDate : undefined,
    integrationEmail:
      typeof o.integrationEmail === "string" ? o.integrationEmail : undefined,
  };
}

function throwIfCampaignLaunchBlocked(
  res: Response,
  data: {
    message?: unknown;
    code?: unknown;
    activeCampaign?: { name?: unknown };
    gmailDailyLimit?: unknown;
  }
): void {
  if (res.status !== 409 && res.status !== 429) return;

  if (data.code === "GMAIL_DAILY_LIMIT_EXCEEDED") {
    const gmailDailyLimit = parseGmailDailyLimit(data.gmailDailyLimit);
    throw new CampaignLaunchBlockedError(
      typeof data.message === "string"
        ? data.message
        : "Gmail daily send limit reached for this account.",
      {
        code: "GMAIL_DAILY_LIMIT_EXCEEDED",
        gmailDailyLimit,
      }
    );
  }

  if (res.status !== 409 || data.code !== "CAMPAIGN_ALREADY_ACTIVE") return;
  const activeCampaignName =
    typeof data.activeCampaign?.name === "string" && data.activeCampaign.name.trim()
      ? data.activeCampaign.name.trim()
      : "Another campaign";
  throw new CampaignLaunchBlockedError(
    typeof data.message === "string"
      ? data.message
      : "A campaign is already running. Wait for it to finish before launching another.",
    {
      code: "CAMPAIGN_ALREADY_ACTIVE",
      activeCampaignName,
    }
  );
}

export async function launchCampaignSequence(
  token: string,
  campaignId: string,
  options?: { emailIntegrationId?: string }
): Promise<LaunchCampaignSequenceResult> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/launch-sequence`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      ...(options?.emailIntegrationId ? { emailIntegrationId: options.emailIntegrationId } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throwIfCampaignLaunchBlocked(res, data);
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
    throwIfCampaignLaunchBlocked(res, data);
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

export type CampaignRoleContextPayload = {
  jobDescription: string;
  jobTitle?: string;
};

export async function updateCampaignJobDescription(
  token: string,
  campaignId: string,
  payload: string | CampaignRoleContextPayload
): Promise<CampaignRecord> {
  const body =
    typeof payload === "string"
      ? { jobDescription: payload.trim() }
      : {
          jobDescription: payload.jobDescription.trim(),
          ...(payload.jobTitle !== undefined ? { jobTitle: payload.jobTitle.trim() } : {}),
        };
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/job-description`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
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

export type CampaignRevealTypeOption = "EMAIL" | "PHONE";

export async function createCampaign(
  token: string,
  name: string,
  contacts: CampaignContact[] = [],
  options?: { revealInBackground?: boolean; revealTypes?: CampaignRevealTypeOption[] }
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
      ...(options?.revealTypes && options.revealTypes.length > 0
        ? { revealTypes: options.revealTypes }
        : options?.revealInBackground === true
          ? { revealInBackground: true }
          : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(parseApiError(res, data, "Failed to create campaign").message);
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
  options?: { revealInBackground?: boolean; revealTypes?: CampaignRevealTypeOption[] }
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
      ...(options?.revealTypes && options.revealTypes.length > 0
        ? { revealTypes: options.revealTypes }
        : options?.revealInBackground === true
          ? { revealInBackground: true }
          : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(parseApiError(res, data, "Failed to add contacts").message);
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
