/**
 * Campaign workspace URL segments (under /dashboard/campaigns/…).
 */

import {
  reportMetricFromSlug,
  slugForReportMetric,
  type ReportMetricKey,
} from "@/lib/campaignEmailReport";

export type CampaignWorkspaceTab =
  | "Editor"
  | "Job description"
  | "Contacts"
  | "Emails"
  | "WhatsApp"
  | "Activity"
  | "Report"
  | "Settings";

export const CAMPAIGN_WORKSPACE_TABS: CampaignWorkspaceTab[] = [
  "Editor",
  "Job description",
  "Contacts",
  "Emails",
  "WhatsApp",
  "Activity",
  "Report",
  "Settings",
];

const TAB_TO_SLUG: Record<CampaignWorkspaceTab, string> = {
  Editor: "editor",
  "Job description": "job-description",
  Contacts: "contacts",
  Emails: "emails",
  WhatsApp: "whatsapp",
  Activity: "activity",
  Report: "report",
  Settings: "settings",
};

const SLUG_TO_TAB: Record<string, CampaignWorkspaceTab> = {
  ...Object.fromEntries(
    Object.entries(TAB_TO_SLUG).map(([tab, slug]) => [slug, tab as CampaignWorkspaceTab])
  ),
  /** @deprecated legacy URL segment */
  phones: "WhatsApp",
};

export function slugForCampaignWorkspaceTab(tab: CampaignWorkspaceTab): string {
  return TAB_TO_SLUG[tab];
}

export function campaignWorkspaceTabFromSlug(slug: string): CampaignWorkspaceTab {
  const key = String(slug || "").trim().toLowerCase();
  return SLUG_TO_TAB[key] ?? "Editor";
}

export function pathForCampaignsList(): string {
  return "/dashboard/campaigns";
}

export function pathForCampaignWorkspace(
  campaignId: string,
  tab: CampaignWorkspaceTab = "Editor"
): string {
  const id = String(campaignId || "").trim();
  if (!id) return pathForCampaignsList();
  return `/dashboard/campaigns/${encodeURIComponent(id)}/${slugForCampaignWorkspaceTab(tab)}`;
}

/** Report outcome drill-down: /dashboard/campaigns/:id/report/:metric */
export function pathForCampaignReportMetric(
  campaignId: string,
  metric: ReportMetricKey
): string {
  const id = String(campaignId || "").trim();
  if (!id) return pathForCampaignsList();
  return `/dashboard/campaigns/${encodeURIComponent(id)}/report/${slugForReportMetric(metric)}`;
}

/** Open WhatsApp tab with a specific contact thread selected. */
export function pathForCampaignWhatsAppConversation(
  campaignId: string,
  candidateKey: string
): string {
  const id = String(campaignId || "").trim();
  const key = String(candidateKey || "").trim();
  if (!id) return pathForCampaignsList();
  if (!key) return pathForCampaignWorkspace(id, "WhatsApp");
  return `/dashboard/campaigns/${encodeURIComponent(id)}/whatsapp/${encodeURIComponent(key)}`;
}

export function parseCampaignWhatsAppContactKeyFromPathname(pathname: string): string | null {
  const match = String(pathname || "").match(
    /\/dashboard\/campaigns\/[^/]+\/whatsapp\/([^/?#]+)/i
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function parseCampaignReportMetricFromPathname(pathname: string): ReportMetricKey | null {
  const match = String(pathname || "").match(
    /\/dashboard\/campaigns\/[^/]+\/report\/([^/?#]+)/i
  );
  if (!match?.[1]) return null;
  return reportMetricFromSlug(match[1]);
}

/** Read workspace tab from URL without a Next.js navigation (back/forward, replaceState). */
export function parseCampaignWorkspaceTabFromPathname(
  pathname: string
): CampaignWorkspaceTab | null {
  const match = String(pathname || "").match(/\/dashboard\/campaigns\/[^/]+\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  return campaignWorkspaceTabFromSlug(match[1]);
}

/** Update the address bar only — avoids remounting the dashboard page. */
export function replaceCampaignWorkspaceUrl(
  campaignId: string,
  tab: CampaignWorkspaceTab
): void {
  if (typeof window === "undefined") return;
  const next = pathForCampaignWorkspace(campaignId, tab);
  if (window.location.pathname === next) return;
  window.history.replaceState(window.history.state, "", next);
}
