import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import {
  clampScheduledAtLocal,
  defaultScheduledAtLocal,
  readLegacyScheduledAt,
  readLegacyStartMode,
  waitDaysForStartMode,
  type StartScheduleMode,
} from "@/lib/outreachStartSchedule";
import { inferGmailWaitDisplay } from "@/lib/outreachWait";

/** India Standard Time (UTC+5:30). */
export const DEFAULT_OUTREACH_TIMEZONE = "IST";
export const OUTREACH_TIMEZONE_OPTIONS = ["IST", "UTC"] as const;
export type OutreachTimezoneCode = (typeof OUTREACH_TIMEZONE_OPTIONS)[number];

export type OutreachStartScheduleDraft = {
  mode: StartScheduleMode;
  scheduledAt: string;
  sendTime: string;
  timezone: OutreachTimezoneCode;
};

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function normalizeOutreachTimezone(raw?: string): OutreachTimezoneCode {
  const value = String(raw || DEFAULT_OUTREACH_TIMEZONE)
    .trim()
    .toUpperCase();
  return value === "UTC" ? "UTC" : "IST";
}

export function normalizeSendTime(raw?: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw || "09:00").trim());
  if (!match) return "09:00";
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export type SendTime12Parts = {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
};

export function parseSendTime12(hhmm: string): SendTime12Parts {
  const normalized = normalizeSendTime(hhmm);
  const [hStr, mStr] = normalized.split(":");
  const hour24 = Number.parseInt(hStr ?? "9", 10);
  const minute = Number.parseInt(mStr ?? "0", 10);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

export function sendTimeFrom12Parts(parts: SendTime12Parts): string {
  const hour12 = Math.min(12, Math.max(1, Math.floor(parts.hour12) || 12));
  const minute = Math.min(59, Math.max(0, Math.floor(parts.minute) || 0));
  let hour24 = hour12 % 12;
  if (parts.period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Display label for HH:mm (e.g. 09:00 → 9:00 AM). */
export function formatSendTimeLabel(hhmm: string): string {
  const { hour12, minute, period } = parseSendTime12(hhmm);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function getZonedParts(date: Date, tzCode: OutreachTimezoneCode) {
  if (tzCode === "UTC") {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
  const istMs = date.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

function utcFromLocalParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tzCode: OutreachTimezoneCode
): Date {
  if (tzCode === "UTC") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - IST_OFFSET_MS);
}

function addCalendarDaysInTimezone(
  baseDate: Date,
  days: number,
  tzCode: OutreachTimezoneCode
): Date {
  const parts = getZonedParts(baseDate, tzCode);
  return utcFromLocalParts(
    parts.year,
    parts.month,
    parts.day + Math.max(0, days),
    parts.hour,
    parts.minute,
    tzCode
  );
}


export function applySendTimeOnDate(
  baseDate: Date,
  sendTime: string,
  tzCode: OutreachTimezoneCode,
  options: { strict?: boolean } = {}
): Date {
  const parts = getZonedParts(baseDate, tzCode);
  const [hour, minute] = normalizeSendTime(sendTime).split(":").map((v) => Number(v));
  let target = utcFromLocalParts(parts.year, parts.month, parts.day, hour, minute, tzCode);
  if (!options.strict && target.getTime() <= baseDate.getTime()) {
    target = utcFromLocalParts(parts.year, parts.month, parts.day + 1, hour, minute, tzCode);
  }
  return target;
}

function addWallClockHours(from: Date, hours: number): Date {
  const next = new Date(from);
  next.setTime(next.getTime() + Math.max(0, hours) * 3_600_000);
  return next;
}

function addWallClockMinutes(from: Date, minutes: number): Date {
  const next = new Date(from);
  next.setTime(next.getTime() + Math.max(0, minutes) * 60_000);
  return next;
}

export function normalizeStartSchedule(
  raw?: Partial<OutreachStartScheduleDraft> & {
    soonestAt?: string;
    afterDays?: number;
  } | null,
  firstTouchpointWaitDays = 0
): OutreachStartScheduleDraft {
  const sendTime = normalizeSendTime(raw?.sendTime);
  const rawMode = String(raw?.mode ?? "immediate");
  let scheduledAt = readLegacyScheduledAt(raw ?? undefined);
  const mode = readLegacyStartMode(rawMode, scheduledAt, firstTouchpointWaitDays);

  if (mode === "scheduled") {
    if (!scheduledAt) {
      scheduledAt = defaultScheduledAtLocal();
    }
    scheduledAt = clampScheduledAtLocal(scheduledAt);
  } else {
    scheduledAt = "";
  }

  return {
    mode,
    scheduledAt,
    sendTime,
    timezone: normalizeOutreachTimezone(raw?.timezone),
  };
}

export function touchpointsWithScheduleForSave(
  touchpoints: OutreachTouchpointDraft[],
  startSchedule: OutreachStartScheduleDraft,
  stepScheduleMeta: Record<number, { time: string; tz: string }>
): OutreachTouchpointDraft[] {
  return touchpoints.map((tp) => {
    if (tp.order === 1) {
      return {
        ...tp,
        waitDays: waitDaysForStartMode(startSchedule.mode, startSchedule.scheduledAt),
        waitHours: 0,
        sendTime: startSchedule.sendTime,
        timezone: startSchedule.timezone,
      };
    }
    const waitUnit = inferGmailWaitDisplay(tp).unit;
    if (waitUnit === "hours" || waitUnit === "minutes") {
      return tp;
    }
    const meta = stepScheduleMeta[tp.order];
    if (!meta) return tp;
    return {
      ...tp,
      sendTime: normalizeSendTime(meta.time),
      timezone: normalizeOutreachTimezone(meta.tz),
    };
  });
}

export function stepScheduleFromTouchpoints(
  touchpoints: OutreachTouchpointDraft[]
): Record<number, { time: string; tz: OutreachTimezoneCode }> {
  const meta: Record<number, { time: string; tz: OutreachTimezoneCode }> = {};
  for (const tp of touchpoints) {
    if (tp.order > 1) {
      meta[tp.order] = {
        time: normalizeSendTime(tp.sendTime),
        tz: normalizeOutreachTimezone(tp.timezone),
      };
    }
  }
  return meta;
}

export function computeTouchpointSendDate(
  touchpoints: OutreachTouchpointDraft[],
  index: number,
  start: OutreachStartScheduleDraft,
  base = new Date()
): Date {
  const tp = touchpoints[index];
  if (!tp) return base;

  if (index === 0) {
    if (start.mode === "immediate") return new Date(base);
    if (start.mode === "scheduled" && start.scheduledAt) {
      const parsed = new Date(start.scheduledAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date(base);
  }

  let cursor = computeTouchpointSendDate(touchpoints, 0, start, base);
  for (let i = 1; i <= index; i++) {
    const step = touchpoints[i];
    if (!step) continue;
    const waitMinutes = Math.max(0, Number(step.waitMinutes) || 0);
    const waitHours = Math.max(0, Number(step.waitHours) || 0);
    const waitDays = Math.max(0, Number(step.waitDays) || 0);
    if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
      cursor = addWallClockMinutes(cursor, waitMinutes);
      continue;
    }
    if (waitHours > 0 && waitDays === 0) {
      cursor = addWallClockHours(cursor, waitHours);
      continue;
    }
    if (waitDays <= 0) continue;
    const sendTime = normalizeSendTime(step.sendTime ?? start.sendTime);
    const timezone = normalizeOutreachTimezone(step.timezone ?? start.timezone);
    cursor = applySendTimeOnDate(
      addCalendarDaysInTimezone(cursor, waitDays, timezone),
      sendTime,
      timezone,
      { strict: true }
    );
  }
  return cursor;
}

export function formatTouchpointScheduleLabel(
  touchpoints: OutreachTouchpointDraft[],
  index: number,
  start: OutreachStartScheduleDraft
): string {
  return computeTouchpointSendDate(touchpoints, index, start).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: start.timezone === "UTC" ? "UTC" : "Asia/Kolkata",
  });
}
