import { authHeaders } from "@/lib/auth";
import type {
  CampaignContact,
  CampaignOutreachStatus,
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
  return {
    id,
    name,
    createdAt,
    contacts,
    ...(outreachPlanId ? { outreachPlanId } : {}),
    ...(outreachChannel ? { outreachChannel } : {}),
    ...(outreachStatus ? { outreachStatus } : {}),
    ...(outreachStartedAt !== undefined ? { outreachStartedAt } : {}),
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

export async function createCampaign(
  token: string,
  name: string,
  contacts: CampaignContact[] = [],
  options?: { revealInBackground?: boolean }
): Promise<{ campaign: CampaignRecord; revealJobId: string | null }> {
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
  return { campaign, revealJobId };
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
  const revealJobId =
    data.revealJob && typeof data.revealJob === "object" && typeof data.revealJob.id === "string"
      ? data.revealJob.id
      : null;
  return { campaign, addedCount, skippedCount, revealJobId };
}

export async function removeContactFromCampaignApi(
  token: string,
  campaignId: string,
  candidateKey: string
): Promise<{ campaign: CampaignRecord; removed: boolean }> {
  const encodedKey = encodeURIComponent(candidateKey);
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/contacts/${encodedKey}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to remove contact");
  }
  const campaign = parseCampaign(data.campaign);
  if (!campaign) throw new Error("Invalid campaign response");
  return { campaign, removed: Boolean(data.removed) };
}
