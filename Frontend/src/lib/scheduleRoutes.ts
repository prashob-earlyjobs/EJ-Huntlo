/**
 * Schedule module URL helpers (UI-only; no backend).
 */

export type ScheduleRouteView =
  | "landing"
  | "builder"
  | "calendar"
  | "reschedule"
  | "reports";

export type ParsedScheduleRoute = {
  view: ScheduleRouteView;
};

export function pathForScheduleLanding(): string {
  return "/dashboard/schedule";
}

export function pathForScheduleBuilder(): string {
  return "/dashboard/schedule/new";
}

export function pathForScheduleCalendar(): string {
  return "/dashboard/schedule/calendar";
}

export function pathForScheduleReschedule(): string {
  return "/dashboard/schedule/reschedule";
}

export function pathForScheduleReports(): string {
  return "/dashboard/schedule/reports";
}

export function parseScheduleRoute(segments: string[]): ParsedScheduleRoute | null {
  if (segments[0] !== "schedule") return null;
  const rest = segments.slice(1).filter(Boolean);

  if (rest.length === 0) return { view: "landing" };
  if (rest[0] === "new") return { view: "builder" };
  if (rest[0] === "calendar") return { view: "calendar" };
  if (rest[0] === "reschedule") return { view: "reschedule" };
  if (rest[0] === "reports") return { view: "reports" };

  return { view: "landing" };
}
