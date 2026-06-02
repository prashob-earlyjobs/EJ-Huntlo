import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import { touchpointDelayHours } from "@/lib/outreachWait";

export type StartScheduleMode = "immediate" | "scheduled";

export type StartScheduleState = {
  mode: StartScheduleMode;
  scheduledAt: string;
  sendTime: string;
  timezone: string;
};

export const START_MODE_OPTIONS: { value: StartScheduleMode; label: string }[] = [
  { value: "immediate", label: "immediately" },
  { value: "scheduled", label: "scheduled start" },
];

export function defaultScheduledAtLocal(): string {
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

/** Maps start mode → first touchpoint `waitDays` (API hint; real time uses `scheduledAt`). */
export function waitDaysForStartMode(mode: StartScheduleMode, scheduledAt: string): number {
  if (mode === "immediate") return 0;
  return daysUntilDatetime(scheduledAt);
}

export function inferStartMode(
  waitDays: number,
  scheduledAt?: string
): StartScheduleMode {
  if (String(scheduledAt || "").trim()) return "scheduled";
  if (waitDays > 0) return "scheduled";
  return "immediate";
}

export function mergeSendTimeIntoScheduledAt(isoLocal: string, hhmm: string): string {
  const [hh, mm] = hhmm.split(":");
  const base = new Date(isoLocal);
  if (Number.isNaN(base.getTime())) return defaultScheduledAtLocal();
  base.setHours(Number(hh), Number(mm), 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export function scheduledAtFromWaitDays(waitDays: number, sendTime: string): string {
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

function addWallClockHours(from: Date, hours: number): Date {
  const next = new Date(from);
  next.setTime(next.getTime() + Math.max(0, hours) * 3_600_000);
  return next;
}

/** When the first email is expected to send (preview in the step rail). */
export function computeFirstSendDate(state: StartScheduleState, base = new Date()): Date {
  if (state.mode === "immediate") {
    return new Date(base);
  }

  const parsed = new Date(state.scheduledAt);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return applySendTime(addCalendarDays(base, 1), state.sendTime);
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
    if (!step) continue;
    const delayHours = touchpointDelayHours(step);
    if (delayHours <= 0) continue;
    const waitHours = Math.max(0, Number(step.waitHours) || 0);
    const waitDays = Math.max(0, Number(step.waitDays) || 0);
    if (waitHours > 0 && waitDays === 0) {
      cursor = addWallClockHours(cursor, waitHours);
    } else {
      cursor = applySendTime(addCalendarDays(cursor, waitDays), start.sendTime);
    }
  }
  return formatScheduleDate(cursor);
}

export function startModeShowsScheduledDate(mode: StartScheduleMode): boolean {
  return mode === "scheduled";
}

export const SCHEDULED_START_MAX_MONTHS = 1;

export function roundUpToScheduleSlot(date: Date, intervalMinutes = 1): Date {
  const step = intervalMinutes * 60_000;
  const t = date.getTime();
  let next = new Date(Math.ceil(t / step) * step);
  if (next.getTime() <= t) {
    next = new Date(next.getTime() + step);
  }
  return next;
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getScheduledAtMinDate(now = new Date()): Date {
  return roundUpToScheduleSlot(now, 1);
}

export function getScheduledAtMaxDate(now = new Date()): Date {
  const max = new Date(now);
  max.setMonth(max.getMonth() + SCHEDULED_START_MAX_MONTHS);
  return max;
}

export function parseScheduledAtLocal(isoLocal: string): Date {
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return new Date(defaultScheduledAtLocal());
  return d;
}

export function toScheduledAtLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function clampScheduledAtLocal(isoLocal: string, now = new Date()): string {
  const min = getScheduledAtMinDate(now).getTime();
  const max = getScheduledAtMaxDate(now).getTime();
  let time = parseScheduledAtLocal(isoLocal).getTime();
  if (time <= min) time = min;
  if (time > max) time = max;
  return toScheduledAtLocal(new Date(time));
}

export function formatScheduledDateLabel(isoLocal: string): string {
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return "Choose date & time";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** @deprecated Read old API payloads only */
export function readLegacyScheduledAt(raw?: {
  scheduledAt?: string;
  soonestAt?: string;
}): string {
  return String(raw?.scheduledAt || raw?.soonestAt || "").trim();
}

/** @deprecated Read old API mode only */
export function readLegacyStartMode(
  rawMode: string,
  scheduledAt: string,
  firstTouchpointWaitDays = 0
): StartScheduleMode {
  const mode = String(rawMode || "").trim().toLowerCase();
  if (mode === "immediate") {
    if (scheduledAt && firstTouchpointWaitDays > 0) return "scheduled";
    return "immediate";
  }
  if (
    mode === "scheduled" ||
    mode === "soonest_at" ||
    mode === "after" ||
    mode === "next_business_day"
  ) {
    return "scheduled";
  }
  if (scheduledAt) return "scheduled";
  return "immediate";
}
