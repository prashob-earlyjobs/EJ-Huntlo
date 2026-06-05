/** India Standard Time (Asia/Kolkata, UTC+5:30, no DST). */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const VALID_TIMEZONES = ["IST", "UTC"];
const VALID_START_MODES = ["immediate", "scheduled"];

const LEGACY_SCHEDULED_MODES = new Set([
  "scheduled",
  "soonest_at",
  "after",
  "next_business_day",
]);

function normalizeTimezoneCode(raw) {
  const value = String(raw || "IST")
    .trim()
    .toUpperCase();
  return VALID_TIMEZONES.includes(value) ? value : "IST";
}

function normalizeSendTime(raw) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw || "09:00").trim());
  if (!match) return "09:00";
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getZonedParts(date, tzCode) {
  const tz = normalizeTimezoneCode(tzCode);
  if (tz === "UTC") {
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

function utcFromLocalParts(year, month, day, hour, minute, tzCode) {
  const tz = normalizeTimezoneCode(tzCode);
  if (tz === "UTC") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - IST_OFFSET_MS);
}

function addCalendarDaysInTimezone(baseDate, days, tzCode) {
  const parts = getZonedParts(baseDate, tzCode);
  return utcFromLocalParts(
    parts.year,
    parts.month,
    parts.day + Math.max(0, Number(days) || 0),
    parts.hour,
    parts.minute,
    tzCode
  );
}

function normalizeWaitUnit() {
  return "days";
}

function roundUpToScheduleSlot(date, stepMs = 60_000) {
  const t = date.getTime();
  let next = new Date(Math.ceil(t / stepMs) * stepMs);
  if (next.getTime() <= t) {
    next = new Date(next.getTime() + stepMs);
  }
  return next;
}

function applySendTimeOnDate(baseDate, sendTime, tzCode, { strict = false } = {}) {
  const parts = getZonedParts(baseDate, tzCode);
  const [hour, minute] = normalizeSendTime(sendTime)
    .split(":")
    .map((v) => Number(v));
  let target = utcFromLocalParts(parts.year, parts.month, parts.day, hour, minute, tzCode);
  if (!strict && target.getTime() <= baseDate.getTime()) {
    target = utcFromLocalParts(parts.year, parts.month, parts.day + 1, hour, minute, tzCode);
  }
  return target;
}

function addWallClockHours(baseDate, hours) {
  const next = new Date(baseDate);
  next.setTime(next.getTime() + Math.max(0, Number(hours) || 0) * 3_600_000);
  return next;
}

function addWallClockMinutes(baseDate, minutes) {
  const next = new Date(baseDate);
  next.setTime(next.getTime() + Math.max(0, Number(minutes) || 0) * 60_000);
  return next;
}

function getTouchpointDelayHours(touchpoint) {
  if (!touchpoint || typeof touchpoint !== "object") return 0;
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);
  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return waitMinutes / 60;
  }
  if (waitHours > 0 && waitDays === 0) return waitHours;
  if (waitDays > 0) return waitDays * 24;
  return 0;
}

function defaultScheduledAtLocal(sendTime = "09:00") {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const [hh, mm] = normalizeSendTime(sendTime).split(":").map((v) => Number(v));
  d.setHours(hh || 9, mm || 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse `YYYY-MM-DDTHH:mm` as wall time in `tzCode`. */
function parseScheduledAtLocal(isoLocal, tzCode) {
  const raw = String(isoLocal || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/.exec(raw);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return utcFromLocalParts(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    tzCode
  );
}

function readLegacyScheduledAt(raw) {
  return String(raw?.scheduledAt || raw?.soonestAt || "").trim();
}

function readLegacyStartMode(rawMode, scheduledAt, firstTouchpoint) {
  const mode = String(rawMode || "")
    .trim()
    .toLowerCase();
  if (mode === "immediate") {
    const waitDays = Math.max(0, Number(firstTouchpoint?.waitDays) || 0);
    if (scheduledAt && waitDays > 0) return "scheduled";
    return "immediate";
  }
  if (mode === "scheduled" || LEGACY_SCHEDULED_MODES.has(mode)) return "scheduled";
  if (scheduledAt) return "scheduled";
  return "immediate";
}

function normalizeStartSchedule(raw, firstTouchpoint) {
  const o = raw && typeof raw === "object" ? raw : {};
  const sendTime = normalizeSendTime(o.sendTime);
  const rawMode = String(o.mode ?? "immediate");
  let scheduledAt = readLegacyScheduledAt(o);
  const mode = readLegacyStartMode(rawMode, scheduledAt, firstTouchpoint);

  if (mode === "scheduled" && !scheduledAt) {
    scheduledAt = defaultScheduledAtLocal(sendTime);
  }
  if (mode !== "scheduled") {
    scheduledAt = "";
  }

  return {
    mode,
    scheduledAt: mode === "scheduled" ? scheduledAt : "",
    sendTime,
    timezone: normalizeTimezoneCode(o.timezone),
  };
}

/**
 * When the first sequence email should send.
 */
function computeFirstSendAt(now, startSchedule, firstTouchpoint = {}) {
  const schedule = normalizeStartSchedule(startSchedule || {}, firstTouchpoint);
  const sendTime = normalizeSendTime(
    schedule.sendTime || firstTouchpoint.sendTime || "09:00"
  );
  const timezone = normalizeTimezoneCode(
    schedule.timezone || firstTouchpoint.timezone || "IST"
  );
  const waitMinutes = Math.max(0, Number(firstTouchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(firstTouchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(firstTouchpoint.waitDays) || 0);

  if (schedule.mode === "scheduled" && schedule.scheduledAt) {
    const parsed = parseScheduledAtLocal(schedule.scheduledAt, timezone);
    if (parsed && !Number.isNaN(parsed.getTime())) {
      const min = roundUpToScheduleSlot(now, 60_000);
      return parsed.getTime() < min.getTime() ? min : parsed;
    }
  }

  if (schedule.mode === "immediate") {
    if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
      return addWallClockMinutes(now, waitMinutes);
    }
    if (waitHours > 0) return addWallClockHours(now, waitHours);
    return new Date(now);
  }

  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return addWallClockMinutes(now, waitMinutes);
  }

  if (waitHours > 0 && waitDays === 0) {
    return addWallClockHours(now, waitHours);
  }

  const days = Math.max(0, waitDays) || 1;
  return applySendTimeOnDate(
    addCalendarDaysInTimezone(now, days, timezone),
    sendTime,
    timezone,
    { strict: true }
  );
}

/** Next send after `baseDate` for a follow-up touchpoint. */
function scheduledSendAt(baseDate, touchpointOrWaitDays) {
  if (
    !touchpointOrWaitDays ||
    typeof touchpointOrWaitDays !== "object" ||
    Array.isArray(touchpointOrWaitDays)
  ) {
    const waitDays = Math.max(0, Number(touchpointOrWaitDays) || 0);
    return addWallClockHours(baseDate, waitDays * 24);
  }

  const touchpoint = touchpointOrWaitDays;
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);

  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return addWallClockMinutes(baseDate, waitMinutes);
  }

  if (waitHours > 0 && waitDays === 0) {
    return addWallClockHours(baseDate, waitHours);
  }

  if (waitDays <= 0) {
    return new Date(baseDate);
  }

  const sendTime = normalizeSendTime(touchpoint.sendTime || "09:00");
  const timezone = normalizeTimezoneCode(touchpoint.timezone || "IST");
  const afterDays = addCalendarDaysInTimezone(baseDate, waitDays, timezone);
  return applySendTimeOnDate(afterDays, sendTime, timezone, { strict: true });
}

module.exports = {
  VALID_TIMEZONES,
  normalizeTimezoneCode,
  normalizeSendTime,
  normalizeStartSchedule,
  parseScheduledAtLocal,
  computeFirstSendAt,
  scheduledSendAt,
  getTouchpointDelayHours,
  addWallClockHours,
  addWallClockMinutes,
  normalizeWaitUnit,
};
