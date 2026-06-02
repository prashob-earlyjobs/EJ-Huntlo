import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";

export type StartScheduleMode =
  | "immediate"
  | "next_business_day"
  | "soonest_at"
  | "after";

export type StartScheduleState = {
  mode: StartScheduleMode;
  afterDays: number;
  soonestAt: string;
  sendTime: string;
  timezone: string;
};

export const START_MODE_OPTIONS: { value: StartScheduleMode; label: string }[] = [
  { value: "immediate", label: "immediately" },
  { value: "next_business_day", label: "next business day" },
  { value: "soonest_at", label: "soonest at" },
  { value: "after", label: "after" },
];

export function defaultSoonestAtLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function daysUntilDatetime(value: string): number {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/** Maps editor start mode → first touchpoint `waitDays` (what the API stores). */
export function waitDaysForStartMode(
  mode: StartScheduleMode,
  afterDays: number,
  soonestAt: string
): number {
  if (mode === "immediate") return 0;
  if (mode === "next_business_day") return 1;
  if (mode === "soonest_at") return daysUntilDatetime(soonestAt);
  return Math.max(1, afterDays);
}

export function inferStartMode(waitDays: number): StartScheduleMode {
  if (waitDays <= 0) return "immediate";
  if (waitDays === 1) return "next_business_day";
  return "after";
}

export function inferAfterDays(waitDays: number): number {
  return waitDays >= 2 ? waitDays : 2;
}

export function mergeSendTimeIntoSoonestAt(isoLocal: string, hhmm: string): string {
  const [hh, mm] = hhmm.split(":");
  const base = new Date(isoLocal);
  if (Number.isNaN(base.getTime())) return defaultSoonestAtLocal();
  base.setHours(Number(hh), Number(mm), 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export function soonestAtFromWaitDays(waitDays: number, sendTime: string): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, waitDays));
  const [hh, mm] = sendTime.split(":");
  d.setHours(Number(hh) || 9, Number(mm) || 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatScheduleDate(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function applySendTime(date: Date, hhmm: string): Date {
  const [hh, mm] = hhmm.split(":");
  const next = new Date(date);
  next.setHours(Number(hh) || 9, Number(mm) || 0, 0, 0);
  return next;
}

function addCalendarDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + Math.max(0, days));
  return next;
}

/** When the first email is expected to send (preview in the step rail). */
export function computeFirstSendDate(state: StartScheduleState, base = new Date()): Date {
  const { mode, afterDays, soonestAt, sendTime } = state;

  if (mode === "immediate") {
    return new Date(base);
  }

  if (mode === "soonest_at") {
    const parsed = new Date(soonestAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return applySendTime(addCalendarDays(base, 1), sendTime);
  }

  if (mode === "next_business_day") {
    return applySendTime(addCalendarDays(base, 1), sendTime);
  }

  return applySendTime(addCalendarDays(base, Math.max(1, afterDays)), sendTime);
}

export function touchpointScheduleLabel(
  touchpoints: OutreachTouchpointDraft[],
  index: number,
  start: StartScheduleState
): string {
  const tp = touchpoints[index];
  if (!tp) return "";

  if (index === 0) {
    if (start.mode === "immediate") return formatScheduleDate(new Date());
    return formatScheduleDate(computeFirstSendDate(start));
  }

  let cursor = computeFirstSendDate(start);
  for (let i = 1; i <= index; i++) {
    const step = touchpoints[i];
    const waitDays = step?.waitDays ?? 0;
    const waitHours = step?.waitHours ?? 0;
    if (waitHours > 0) {
      cursor = new Date(cursor.getTime() + waitHours * 60 * 60 * 1000);
    } else if (waitDays > 0) {
      cursor = applySendTime(addCalendarDays(cursor, waitDays), start.sendTime);
    }
  }
  return formatScheduleDate(cursor);
}

export function startModeShowsSendTime(mode: StartScheduleMode): boolean {
  return mode !== "immediate";
}

export function startModeShowsSoonestDate(mode: StartScheduleMode): boolean {
  return mode === "soonest_at";
}

export function formatSoonestDateLabel(isoLocal: string): string {
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return "Pick date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
