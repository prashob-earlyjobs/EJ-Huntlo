import { authHeaders } from "@/lib/auth";
import type { CampaignRecord } from "@/lib/campaigns";
import { fetchCampaign } from "@/lib/campaignsApi";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type CampaignRevealJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "quota_exceeded";

export type CampaignRevealJob = {
  id: string;
  campaignId: string;
  status: CampaignRevealJobStatus;
  total: number;
  processed: number;
  revealedEmailCount: number;
  revealedPhoneCount: number;
  errorMessage: string;
};

function parseJob(raw: unknown): CampaignRevealJob | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const campaignId = typeof o.campaignId === "string" ? o.campaignId : "";
  const status = typeof o.status === "string" ? o.status : "pending";
  if (!id || !campaignId) return null;
  return {
    id,
    campaignId,
    status: status as CampaignRevealJobStatus,
    total: typeof o.total === "number" ? o.total : 0,
    processed: typeof o.processed === "number" ? o.processed : 0,
    revealedEmailCount: typeof o.revealedEmailCount === "number" ? o.revealedEmailCount : 0,
    revealedPhoneCount: typeof o.revealedPhoneCount === "number" ? o.revealedPhoneCount : 0,
    errorMessage: typeof o.errorMessage === "string" ? o.errorMessage : "",
  };
}

export function parseRevealJobFromResponse(data: Record<string, unknown>): CampaignRevealJob | null {
  if (!data.revealJob || typeof data.revealJob !== "object") return null;
  return parseJob(data.revealJob);
}

export async function getCampaignRevealJob(
  token: string,
  jobId: string
): Promise<CampaignRevealJob> {
  const res = await fetch(`${apiBase()}/api/campaigns/reveal-jobs/${jobId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load reveal job");
  }
  const job = parseJob(data.job);
  if (!job) throw new Error("Invalid reveal job response");
  return job;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollCampaignRevealJob(
  token: string,
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    onProgress?: (job: CampaignRevealJob) => void;
  }
): Promise<CampaignRevealJob> {
  const intervalMs = options?.intervalMs ?? 1500;
  const maxAttempts = options?.maxAttempts ?? 120;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await getCampaignRevealJob(token, jobId);
    options?.onProgress?.(job);
    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "quota_exceeded"
    ) {
      return job;
    }
    await sleep(intervalMs);
  }

  throw new Error("Reveal job timed out");
}

export async function getActiveCampaignRevealJob(
  token: string,
  campaignId: string
): Promise<CampaignRevealJob | null> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/reveal-job/active`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) return null;
  if (!data.job) return null;
  return parseJob(data.job);
}

export async function startCampaignReveal(
  token: string,
  campaignId: string,
  candidateKeys?: string[]
): Promise<CampaignRevealJob> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/reveal-contacts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(
      candidateKeys && candidateKeys.length > 0 ? { candidateKeys } : {}
    ),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to start reveal");
  }
  const job = parseJob(data.job);
  if (!job) throw new Error("Invalid reveal job response");
  return job;
}

export async function waitForCampaignRevealAndRefresh(
  token: string,
  jobId: string,
  onProgress?: (job: CampaignRevealJob, campaign: CampaignRecord | null) => void
): Promise<{ job: CampaignRevealJob; campaign: CampaignRecord }> {
  const job = await pollCampaignRevealJob(token, jobId, {
    onProgress: (j) => {
      onProgress?.(j, null);
    },
  });
  const campaign = await fetchCampaign(token, job.campaignId);
  onProgress?.(job, campaign);
  return { job, campaign };
}
