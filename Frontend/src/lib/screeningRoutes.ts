/**
 * Screening module URL helpers.
 */

export type ScreeningBuilderMode = "voice" | "video";

export type ScreeningRouteView =
  | "landing"
  | "mode-select"
  | "voice-builder"
  | "video-builder"
  | "detail"
  | "variables";

export type ParsedScreeningRoute = {
  view: ScreeningRouteView;
  screeningId?: string;
};

export function pathForScreeningLanding(): string {
  return "/dashboard/screening";
}

export function pathForScreeningNew(): string {
  return "/dashboard/screening/new";
}

export function pathForScreeningBuilder(mode: ScreeningBuilderMode): string {
  return `/dashboard/screening/new/${mode}`;
}

export function pathForScreeningDetail(screeningId: string): string {
  return `/dashboard/screening/${encodeURIComponent(screeningId.trim())}`;
}

export function pathForScreeningVariables(screeningId: string): string {
  return `/dashboard/screening/${encodeURIComponent(screeningId.trim())}/details`;
}

export function pathForScreeningEdit(screeningId: string): string {
  return `/dashboard/screening/${encodeURIComponent(screeningId.trim())}/edit`;
}

export function parseScreeningRoute(segments: string[]): ParsedScreeningRoute | null {
  if (segments[0] !== "screening") return null;
  const rest = segments.slice(1).filter(Boolean);

  if (rest.length === 0) return { view: "landing" };

  if (rest[0] === "new") {
    const mode = rest[1]?.trim();
    if (mode === "voice") return { view: "voice-builder" };
    if (mode === "video") return { view: "video-builder" };
    return { view: "mode-select" };
  }

  if (rest[1] === "details") {
    return { view: "variables", screeningId: rest[0] };
  }

  if (rest[1] === "edit") {
    return { view: "voice-builder", screeningId: rest[0] };
  }

  return { view: "detail", screeningId: rest[0] };
}
