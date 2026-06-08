import type { EmailReportActivity } from "@/lib/campaignEmailReport";
import type {
  CampaignRevealContactProgress,
  CampaignRevealFieldStatus,
  CampaignRevealJob,
  CampaignRevealType,
} from "@/lib/campaignRevealJob";

export type CampaignFeedItem = {
  id: string;
  kind: "unveil" | "outreach";
  candidateKey: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  at: string;
  detail: string;
  outreachType?: EmailReportActivity["type"];
  unveil?: {
    revealTypes: CampaignRevealType[];
    emailStatus: CampaignRevealFieldStatus;
    phoneStatus: CampaignRevealFieldStatus;
    email: string;
    phone: string;
    isActive: boolean;
  };
};

export function unveilFieldStatusLabel(status: CampaignRevealFieldStatus): string {
  switch (status) {
    case "queued":
      return "Waiting";
    case "running":
      return "Unveiling…";
    case "revealed":
      return "Revealed";
    case "not_found":
      return "Not found";
    case "skipped":
      return "On file";
    case "failed":
      return "Failed";
    case "quota_exceeded":
      return "Quota exceeded";
    default:
      return "";
  }
}

export function unveilFieldStatusClass(status: CampaignRevealFieldStatus): string {
  switch (status) {
    case "revealed":
      return "dashboard-campaign-unveil-status--success";
    case "running":
      return "dashboard-campaign-unveil-status--running";
    case "not_found":
    case "failed":
    case "quota_exceeded":
      return "dashboard-campaign-unveil-status--error";
    case "skipped":
      return "dashboard-campaign-unveil-status--muted";
    default:
      return "dashboard-campaign-unveil-status--pending";
  }
}

function unveilContactIsActive(entry: CampaignRevealContactProgress): boolean {
  return entry.emailStatus === "running" || entry.phoneStatus === "running";
}

function unveilSortRank(entry: CampaignRevealContactProgress): number {
  if (entry.emailStatus === "running" || entry.phoneStatus === "running") return 0;
  if (entry.emailStatus === "queued" || entry.phoneStatus === "queued") return 1;
  return 2;
}

function unveilContactToFeedItem(
  entry: CampaignRevealContactProgress,
  job: CampaignRevealJob,
  fallbackAt: string
): CampaignFeedItem {
  const at = entry.updatedAt || fallbackAt;
  const isActive = unveilContactIsActive(entry);
  const parts: string[] = [];
  if (entry.detail) parts.push(entry.detail);

  return {
    id: `unveil-${job.id}-${entry.candidateKey}`,
    kind: "unveil",
    candidateKey: entry.candidateKey,
    contactName: entry.name || "Candidate",
    contactEmail: entry.email,
    contactPhone: entry.phone,
    at,
    detail: parts.join(" · "),
    unveil: {
      revealTypes: job.revealTypes,
      emailStatus: entry.emailStatus,
      phoneStatus: entry.phoneStatus,
      email: entry.email,
      phone: entry.phone,
      isActive,
    },
  };
}

export function revealJobToFeedItems(job: CampaignRevealJob | null): CampaignFeedItem[] {
  if (!job || job.contactProgress.length === 0) return [];

  const fallbackAt = new Date().toISOString();
  const items = job.contactProgress.map((entry) =>
    unveilContactToFeedItem(entry, job, fallbackAt)
  );

  items.sort((a, b) => {
    const rankA = unveilSortRank(
      job.contactProgress.find((e) => e.candidateKey === a.candidateKey)!
    );
    const rankB = unveilSortRank(
      job.contactProgress.find((e) => e.candidateKey === b.candidateKey)!
    );
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });

  return items;
}

export function outreachActivityToFeedItem(activity: EmailReportActivity): CampaignFeedItem {
  return {
    id: `outreach-${activity.candidateKey}-${activity.type}-${activity.at}`,
    kind: "outreach",
    candidateKey: activity.candidateKey,
    contactName: activity.contactName,
    contactEmail: activity.contactEmail,
    contactPhone: activity.contactPhone,
    at: activity.at,
    detail: activity.detail,
    outreachType: activity.type === "unveil" ? undefined : activity.type,
  };
}

export function activityToFeedItem(activity: EmailReportActivity): CampaignFeedItem {
  if (activity.type === "unveil" && activity.unveil) {
    const meta = activity.unveil;
    return {
      id: `unveil-${meta.jobId || "job"}-${activity.candidateKey}-${activity.at}`,
      kind: "unveil",
      candidateKey: activity.candidateKey,
      contactName: activity.contactName,
      contactEmail: activity.contactEmail || meta.email,
      contactPhone: activity.contactPhone || meta.phone,
      at: activity.at,
      detail: activity.detail,
      unveil: {
        revealTypes: meta.revealTypes as CampaignRevealType[],
        emailStatus: meta.emailStatus as CampaignRevealFieldStatus,
        phoneStatus: meta.phoneStatus as CampaignRevealFieldStatus,
        email: meta.email,
        phone: meta.phone,
        isActive: meta.isActive,
      },
    };
  }
  return outreachActivityToFeedItem(activity);
}

export function sortFeedItems(items: CampaignFeedItem[]): CampaignFeedItem[] {
  return [...items].sort((a, b) => {
    const activeA = a.unveil?.isActive ? 1 : 0;
    const activeB = b.unveil?.isActive ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });
}
