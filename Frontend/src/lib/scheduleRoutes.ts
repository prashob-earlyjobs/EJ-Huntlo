/**
 * Schedule module URL helpers (UI-only; no backend).
 */

export type ScheduleRouteView =
  | "landing"
  | "direct"
  | "builder"
  | "calendar"
  | "reschedule"
  | "reports"
  | "reminders";

export type ParsedScheduleRoute = {
  view: ScheduleRouteView;
};

export function pathForScheduleLanding(): string {
  return "/dashboard/schedule";
}

export function pathForScheduleDirectAdd(): string {
  return "/dashboard/schedule/add";
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

export function pathForScheduleReminders(): string {
  return "/dashboard/schedule/reminders";
}

export function parseScheduleRoute(segments: string[]): ParsedScheduleRoute | null {
  if (segments[0] !== "schedule") return null;
  const rest = segments.slice(1).filter(Boolean);

  if (rest.length === 0) return { view: "landing" };
  if (rest[0] === "add") return { view: "direct" };
  if (rest[0] === "new") return { view: "builder" };
  if (rest[0] === "calendar") return { view: "calendar" };
  if (rest[0] === "reschedule") return { view: "reschedule" };
  if (rest[0] === "reports") return { view: "reports" };
  if (rest[0] === "reminders") return { view: "reminders" };

  return { view: "landing" };
}
