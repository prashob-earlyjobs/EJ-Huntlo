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

export type CampaignRevealFieldStatus =
  | "queued"
  | "running"
  | "revealed"
  | "not_found"
  | "skipped"
  | "not_requested"
  | "failed"
  | "quota_exceeded";

export type CampaignRevealContactProgress = {
  candidateKey: string;
  name: string;
  emailStatus: CampaignRevealFieldStatus;
  phoneStatus: CampaignRevealFieldStatus;
  email: string;
  phone: string;
  detail: string;
  updatedAt: string | null;
};

export type CampaignRevealType = "EMAIL" | "PHONE";

/** Short phrase for toasts after add-to-campaign (e.g. "Email and phone unveil started"). */
export function campaignRevealStartedLabel(types: CampaignRevealType[]): string {
  const wantsEmail = types.includes("EMAIL");
  const wantsPhone = types.includes("PHONE");
  if (wantsEmail && wantsPhone) return "Email and phone unveil started";
  if (wantsEmail) return "Email unveil started";
  if (wantsPhone) return "Phone unveil started";
  return "";
}

export type CampaignRevealJob = {
  id: string;
  campaignId: string;
  status: CampaignRevealJobStatus;
  revealTypes: CampaignRevealType[];
  total: number;
  processed: number;
  revealedEmailCount: number;
  revealedPhoneCount: number;
  contactProgress: CampaignRevealContactProgress[];
  errorMessage: string;
};

function parseJob(raw: unknown): CampaignRevealJob | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const campaignId = typeof o.campaignId === "string" ? o.campaignId : "";
  const status = typeof o.status === "string" ? o.status : "pending";
  if (!id || !campaignId) return null;
  const revealTypes = Array.isArray(o.revealTypes)
    ? o.revealTypes
        .map((t) => String(t).toUpperCase())
        .filter((t): t is CampaignRevealType => t === "EMAIL" || t === "PHONE")
    : (["EMAIL", "PHONE"] as CampaignRevealType[]);

  const contactProgress = Array.isArray(o.contactProgress)
    ? o.contactProgress
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null;
          const entry = raw as Record<string, unknown>;
          return {
            candidateKey: typeof entry.candidateKey === "string" ? entry.candidateKey : "",
            name: typeof entry.name === "string" ? entry.name : "",
            emailStatus: (typeof entry.emailStatus === "string"
              ? entry.emailStatus
              : "queued") as CampaignRevealFieldStatus,
            phoneStatus: (typeof entry.phoneStatus === "string"
              ? entry.phoneStatus
              : "queued") as CampaignRevealFieldStatus,
            email: typeof entry.email === "string" ? entry.email : "",
            phone: typeof entry.phone === "string" ? entry.phone : "",
            detail: typeof entry.detail === "string" ? entry.detail : "",
            updatedAt:
              typeof entry.updatedAt === "string"
                ? entry.updatedAt
                : entry.updatedAt
                  ? new Date(String(entry.updatedAt)).toISOString()
                  : null,
          };
        })
        .filter((entry): entry is CampaignRevealContactProgress => Boolean(entry?.candidateKey))
    : [];

  return {
    id,
    campaignId,
    status: status as CampaignRevealJobStatus,
    revealTypes,
    total: typeof o.total === "number" ? o.total : 0,
    processed: typeof o.processed === "number" ? o.processed : 0,
    revealedEmailCount: typeof o.revealedEmailCount === "number" ? o.revealedEmailCount : 0,
    revealedPhoneCount: typeof o.revealedPhoneCount === "number" ? o.revealedPhoneCount : 0,
    contactProgress,
    errorMessage: typeof o.errorMessage === "string" ? o.errorMessage : "",
  };
}

export function parseRevealJobFromResponse(data: Record<string, unknown>): CampaignRevealJob | null {
  if (!data.revealJob || typeof data.revealJob !== "object") return null;
  return parseJob(data.revealJob);
}

const revealJobFetchInit = (token: string): RequestInit => ({
  headers: authHeaders(token),
  cache: "no-store",
});

const revealJobHintKey = (campaignId: string) => `campaign-reveal-job:${campaignId}`;

export function rememberCampaignRevealJobHint(campaignId: string, jobId: string) {
  if (typeof window === "undefined" || !campaignId.trim() || !jobId.trim()) return;
  try {
    sessionStorage.setItem(revealJobHintKey(campaignId), jobId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readCampaignRevealJobHint(campaignId: string): string | null {
  if (typeof window === "undefined" || !campaignId.trim()) return null;
  try {
    return sessionStorage.getItem(revealJobHintKey(campaignId));
  } catch {
    return null;
  }
}

export function clearCampaignRevealJobHint(campaignId: string) {
  if (typeof window === "undefined" || !campaignId.trim()) return;
  try {
    sessionStorage.removeItem(revealJobHintKey(campaignId));
  } catch {
    /* ignore */
  }
}

export async function getCampaignRevealJob(
  token: string,
  jobId: string
): Promise<CampaignRevealJob> {
  const res = await fetch(`${apiBase()}/api/campaigns/reveal-jobs/${jobId}`, {
    ...revealJobFetchInit(token),
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
    ...revealJobFetchInit(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) return null;
  if (!data.job) return null;
  return parseJob(data.job);
}

export async function getLatestCampaignRevealJob(
  token: string,
  campaignId: string
): Promise<CampaignRevealJob | null> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/reveal-job/latest`, {
    ...revealJobFetchInit(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) return null;
  if (!data.job) return null;
  return parseJob(data.job);
}

export async function startCampaignReveal(
  token: string,
  campaignId: string,
  candidateKeys?: string[],
  revealTypes?: CampaignRevealType[]
): Promise<CampaignRevealJob> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/reveal-contacts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      ...(candidateKeys && candidateKeys.length > 0 ? { candidateKeys } : {}),
      ...(revealTypes && revealTypes.length > 0 ? { revealTypes } : {}),
    }),
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
