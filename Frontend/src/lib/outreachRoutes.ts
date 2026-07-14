/**
 * Outreach module URL helpers (UI-only; no backend).
 */

export type OutreachBuilderMode = "single" | "multi";

export type OutreachRouteView =
  | "landing"
  | "mode-select"
  | "single-builder"
  | "multi-builder"
  | "resume-builder"
  | "detail";

export type ParsedOutreachRoute = {
  view: OutreachRouteView;
  campaignId?: string;
};

export function pathForOutreachLanding(): string {
  return "/dashboard/outreach";
}

export function pathForOutreachNew(): string {
  return "/dashboard/outreach/new";
}

export function pathForOutreachBuilder(mode: OutreachBuilderMode): string {
  return `/dashboard/outreach/new/${mode}`;
}

export function pathForOutreachCampaign(campaignId: string): string {
  return `/dashboard/outreach/${encodeURIComponent(campaignId.trim())}`;
}

export function pathForOutreachDraftResume(campaignId: string): string {
  return `/dashboard/outreach/${encodeURIComponent(campaignId.trim())}/edit`;
}

export function parseOutreachRoute(segments: string[]): ParsedOutreachRoute | null {
  if (segments[0] !== "outreach") return null;
  const rest = segments.slice(1).filter(Boolean);

  if (rest.length === 0) {
    return { view: "landing" };
  }

  if (rest[0] === "new") {
    const mode = rest[1]?.trim();
    if (mode === "single") return { view: "single-builder" };
    if (mode === "multi") return { view: "multi-builder" };
    return { view: "mode-select" };
  }

  const campaignId = rest[0]?.trim();
  if (!campaignId) {
    return { view: "landing" };
  }

  if (rest[1] === "edit") {
    return { view: "resume-builder", campaignId };
  }

  return { view: "detail", campaignId };
}
