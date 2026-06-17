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
  // "Settings",
];

/** Shorter tab labels for narrow screens. */
export function campaignWorkspaceTabShortLabel(
  tab: CampaignWorkspaceTab,
  outreachChannel?: CampaignOutreachChannel | null
): string {
  if (tab === "Job description") return "Job";
  if (tab === "Emails" && outreachChannel === "voice_call") return "Voice";
  return tab;
}

/** Display label for workspace nav tabs (channel-aware). */
export function campaignWorkspaceTabLabel(
  tab: CampaignWorkspaceTab,
  outreachChannel?: CampaignOutreachChannel | null
): string {
  if (tab === "Emails" && outreachChannel === "voice_call") return "Voice calls";
  return tab;
}

export type CampaignOutreachChannel = "gmail" | "whatsapp" | "voice_call";

export function resolveCampaignOutreachChannel(
  outreachChannel?: CampaignOutreachChannel | string | null
): CampaignOutreachChannel | null {
  if (
    outreachChannel === "gmail" ||
    outreachChannel === "whatsapp" ||
    outreachChannel === "voice_call"
  ) {
    return outreachChannel;
  }
  return null;
}

/** Human-readable channel label for campaign lists and summaries. */
export function campaignOutreachChannelLabel(
  outreachChannel?: CampaignOutreachChannel | null
): string {
  if (outreachChannel === "whatsapp") return "WhatsApp";
  if (outreachChannel === "voice_call") return "Voice calls";
  return "Email";
}

/** First workspace tab to open for a campaign channel. */
export function defaultCampaignWorkspaceTab(
  _outreachChannel?: CampaignOutreachChannel | null
): CampaignWorkspaceTab {
  return "Editor";
}

/** Known channel from campaign record, or inferred from the active workspace tab URL. */
export function inferCampaignWorkspaceChannel(
  workspaceTab: CampaignWorkspaceTab,
  outreachChannel?: CampaignOutreachChannel | null
): CampaignOutreachChannel | null {
  if (outreachChannel === "gmail" || outreachChannel === "whatsapp" || outreachChannel === "voice_call") {
    return outreachChannel;
  }
  if (workspaceTab === "WhatsApp") return "whatsapp";
  if (workspaceTab === "Emails") return "gmail";
  return null;
}

/** Whether the Job description workspace tab should appear (matches CampaignWorkspace rules). */
export function inferShowJobDescriptionTab(
  workspaceTab: CampaignWorkspaceTab,
  opts: {
    outreachChannel?: CampaignOutreachChannel | null;
    hasJobDescription?: boolean;
  } = {}
): boolean {
  if (workspaceTab === "Job description") return true;
  if (opts.hasJobDescription) return true;
  if (opts.outreachChannel === "whatsapp" || opts.outreachChannel === "voice_call") return true;
  return false;
}

/** Tabs shown in the workspace nav (email vs WhatsApp modes hide the other channel's tab). */
export function getVisibleCampaignWorkspaceTabs(opts: {
  outreachChannel?: CampaignOutreachChannel | null;
  /** When false, show all tabs (channel picker on Editor). Defaults to true if channel is set. */
  channelLocked?: boolean;
  showJobDescriptionTab?: boolean;
  workspaceTab?: CampaignWorkspaceTab;
  hasJobDescription?: boolean;
}): CampaignWorkspaceTab[] {
  const effectiveChannel =
    opts.outreachChannel === "whatsapp"
      ? "whatsapp"
      : opts.outreachChannel === "voice_call"
        ? "voice_call"
        : opts.outreachChannel === "gmail"
          ? "gmail"
          : null;
  const channelLocked =
    opts.channelLocked ??
    (effectiveChannel === "gmail" ||
      effectiveChannel === "whatsapp" ||
      effectiveChannel === "voice_call");
  const showJobDescriptionTab =
    opts.showJobDescriptionTab !== undefined
      ? opts.showJobDescriptionTab
      : inferShowJobDescriptionTab(opts.workspaceTab ?? "Editor", {
          outreachChannel: effectiveChannel,
          hasJobDescription: opts.hasJobDescription,
        });

  return CAMPAIGN_WORKSPACE_TABS.filter((tab) => {
    if (tab === "Contacts") return false;
    if (tab === "Job description" && !showJobDescriptionTab) return false;
    if (!channelLocked || !effectiveChannel) return true;
    if (effectiveChannel === "voice_call") {
      if (tab === "WhatsApp") return false;
      return true;
    }
    if (effectiveChannel === "gmail") {
      if (tab === "WhatsApp") return false;
      return true;
    }
    return tab !== "Emails";
  });
}

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

/** Channel-specific tab for managing campaign contacts (replaces legacy Contacts tab). */
export function contactsWorkspaceTabForChannel(
  outreachChannel?: CampaignOutreachChannel | null
): CampaignWorkspaceTab {
  return outreachChannel === "whatsapp" ? "WhatsApp" : "Emails";
}

/** Map legacy / hidden tabs to a visible workspace tab. */
export function normalizeCampaignWorkspaceTab(
  tab: CampaignWorkspaceTab,
  outreachChannel?: CampaignOutreachChannel | null
): CampaignWorkspaceTab {
  if (tab === "Contacts") {
    return contactsWorkspaceTabForChannel(outreachChannel);
  }
  if (tab === "Settings") {
    return "Editor";
  }
  return tab;
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
