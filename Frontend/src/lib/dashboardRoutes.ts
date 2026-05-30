/**
 * Dashboard URL ↔ in-app tab mapping.
 * Sidebar and programmatic navigation should use these paths (not setState alone).
 */

import type { ReportMetricKey } from "@/lib/campaignEmailReport";
import { reportMetricFromSlug } from "@/lib/campaignEmailReport";
import {
  campaignWorkspaceTabFromSlug,
  pathForCampaignWorkspace,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";

export type { CampaignWorkspaceTab };

export type DashboardTabKey =
  | "Dashboard"
  | "Search Candidates"
  | "Search history"
  | "Candidates"
  | "Saved"
  | "People Scout"
  | "Session Results"
  | "Outreaches"
  | "Campaigns"
  | "Integrations"
  | "Plans and pricing"
  | "Team"
  | "My Profile";

export type DashboardRouteParams = {
  tab: DashboardTabKey;
  sessionId?: string;
  campaignId?: string;
  campaignWorkspaceTab?: CampaignWorkspaceTab;
  campaignReportMetric?: ReportMetricKey;
  /** WhatsApp tab thread selection from URL segment. */
  campaignWhatsAppContactKey?: string;
};

/** Modal / overlay state via search params (shareable URLs). */
export type DashboardSearchParams = {
  filters?: "1";
  addToCampaign?: "1";
  candidate?: string;
  campaign?: string;
};

const TAB_TO_SEGMENT: Record<DashboardTabKey, string[] | null> = {
  Dashboard: null,
  "Search Candidates": ["search"],
  "Search history": ["search", "history"],
  Candidates: ["candidates"],
  Saved: ["saved"],
  "People Scout": ["people-scout"],
  "Session Results": ["sessions"], // + [sessionId]
  Outreaches: ["outreaches"],
  Campaigns: ["campaigns"],
  Integrations: ["integrations"],
  "Plans and pricing": ["plans"],
  Team: ["team"],
  "My Profile": ["profile"],
};

const SEGMENT_TAB_PAIRS: { segments: string[]; tab: DashboardTabKey }[] = [
  { segments: ["search", "history"], tab: "Search history" },
  { segments: ["search"], tab: "Search Candidates" },
  { segments: ["candidates"], tab: "Candidates" },
  { segments: ["saved"], tab: "Saved" },
  { segments: ["people-scout"], tab: "People Scout" },
  { segments: ["outreaches"], tab: "Outreaches" },
  { segments: ["campaigns"], tab: "Campaigns" },
  { segments: ["integrations"], tab: "Integrations" },
  { segments: ["plans"], tab: "Plans and pricing" },
  { segments: ["team"], tab: "Team" },
  { segments: ["profile"], tab: "My Profile" },
];

function segmentsKey(segments: string[]) {
  return segments.join("/");
}

export function tabFromPathSegments(segments: string[] | undefined): DashboardRouteParams {
  const parts = (segments ?? []).filter(Boolean);
  if (parts.length === 0) {
    return { tab: "Dashboard" };
  }

  if (parts[0] === "sessions") {
    const sessionId = parts[1]?.trim() || "";
    return {
      tab: "Session Results",
      ...(sessionId ? { sessionId } : {}),
    };
  }

  if (parts[0] === "campaigns") {
    const campaignId = parts[1]?.trim() || "";
    const tabSlug = parts[2]?.trim() || "editor";
    const workspaceTab = campaignWorkspaceTabFromSlug(tabSlug);
    const fourthSegment = parts[3]?.trim() || "";
    let campaignReportMetric: ReportMetricKey | undefined;
    let campaignWhatsAppContactKey: string | undefined;
    if (workspaceTab === "Report" && fourthSegment) {
      campaignReportMetric = reportMetricFromSlug(fourthSegment) ?? undefined;
    }
    if (workspaceTab === "WhatsApp" && fourthSegment) {
      try {
        campaignWhatsAppContactKey = decodeURIComponent(fourthSegment).trim() || undefined;
      } catch {
        campaignWhatsAppContactKey = fourthSegment;
      }
    }
    return {
      tab: "Campaigns",
      ...(campaignId ? { campaignId } : {}),
      ...(campaignId ? { campaignWorkspaceTab: workspaceTab } : {}),
      ...(campaignId && campaignReportMetric ? { campaignReportMetric } : {}),
      ...(campaignId && campaignWhatsAppContactKey
        ? { campaignWhatsAppContactKey }
        : {}),
    };
  }

  const match = SEGMENT_TAB_PAIRS.find((p) => segmentsKey(p.segments) === segmentsKey(parts));
  if (match) {
    return { tab: match.tab };
  }

  return { tab: "Dashboard" };
}

export function pathForDashboardTab(
  tab: DashboardTabKey,
  options?: {
    sessionId?: string;
    campaignId?: string;
    campaignWorkspaceTab?: CampaignWorkspaceTab;
  }
): string {
  if (tab === "Session Results") {
    const sid = options?.sessionId?.trim();
    return sid ? `/dashboard/sessions/${encodeURIComponent(sid)}` : "/dashboard/sessions";
  }

  if (tab === "Campaigns" && options?.campaignId?.trim()) {
    return pathForCampaignWorkspace(
      options.campaignId,
      options.campaignWorkspaceTab ?? "Editor"
    );
  }

  const segments = TAB_TO_SEGMENT[tab];
  if (!segments || segments.length === 0) {
    return "/dashboard";
  }
  return `/dashboard/${segments.join("/")}`;
}

export function pathWithSearchParams(
  pathname: string,
  params: DashboardSearchParams
): string {
  const q = new URLSearchParams();
  if (params.filters === "1") q.set("filters", "1");
  if (params.addToCampaign === "1") q.set("addToCampaign", "1");
  if (params.candidate?.trim()) q.set("candidate", params.candidate.trim());
  if (params.campaign?.trim()) q.set("campaign", params.campaign.trim());
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Sidebar label → tab key (Candidate pool uses Candidates tab). */
export function tabKeyFromSidebarLabel(label: string, tabKey?: string): DashboardTabKey {
  if (tabKey === "Candidates" || label === "Candidate pool") return "Candidates";
  return label as DashboardTabKey;
}
