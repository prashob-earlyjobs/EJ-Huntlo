/**
 * Huntlo 360 — unified outreach → schedule flow URLs.
 */

export type Huntlo360BuilderMode = "single" | "multi";

export type Huntlo360RouteView =
  | "landing"
  | "mode-select"
  | "single-builder"
  | "multi-builder"
  | "resume-builder"
  | "detail";

export type ParsedHuntlo360Route = {
  view: Huntlo360RouteView;
  campaignId?: string;
};

export function pathForHuntlo360Landing(): string {
  return "/dashboard/huntlo-360";
}

export function pathForHuntlo360New(): string {
  return "/dashboard/huntlo-360/new";
}

export function pathForHuntlo360Builder(mode: Huntlo360BuilderMode): string {
  return `/dashboard/huntlo-360/new/${mode}`;
}

export function pathForHuntlo360Campaign(campaignId: string): string {
  return `/dashboard/huntlo-360/${encodeURIComponent(campaignId.trim())}`;
}

export function pathForHuntlo360DraftResume(campaignId: string): string {
  return `/dashboard/huntlo-360/${encodeURIComponent(campaignId.trim())}/edit`;
}

export function parseHuntlo360Route(segments: string[]): ParsedHuntlo360Route | null {
  if (segments[0] !== "huntlo-360") return null;
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
