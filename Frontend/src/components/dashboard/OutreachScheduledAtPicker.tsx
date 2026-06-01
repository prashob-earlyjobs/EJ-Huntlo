"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import {
  clampScheduledAtLocal,
  formatScheduledDateLabel,
  getScheduledAtMaxDate,
  getScheduledAtMinDate,
  isSameLocalCalendarDay,
  parseScheduledAtLocal,
  roundUpToScheduleSlot,
  toScheduledAtLocal,
} from "@/lib/outreachStartSchedule";
import { OutreachScheduleFieldSelect } from "@/components/dashboard/OutreachScheduleFieldSelect";
import { OutreachTimePeriodSelect } from "@/components/dashboard/OutreachTimePeriodSelect";
import {
  OUTREACH_TIMEZONE_OPTIONS,
  normalizeOutreachTimezone,
  parseSendTime12,
  sendTimeFrom12Parts,
  type OutreachTimezoneCode,
  type SendTime12Parts,
} from "@/lib/outreachSchedule";
import "react-datepicker/dist/react-datepicker.css";

const TIMEZONE_OPTIONS = OUTREACH_TIMEZONE_OPTIONS.map((tz) => ({
  value: tz,
  label: tz === "IST" ? "IST (India)" : "UTC",
}));

type Props = {
  value: string;
  onChange: (isoLocal: string) => void;
  timezone: OutreachTimezoneCode;
  onTimezoneChange: (tz: OutreachTimezoneCode) => void;
  disabled?: boolean;
};

function sanitizeHourInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  const n = Number(digits);
  if (n > 12) return "12";
  return digits;
}

function sanitizeMinuteInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  const n = Number(digits);
  if (n > 59) return "59";
  return digits;
}

function parseHourInput(raw: string, fallback: number): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return fallback;
  return Math.min(12, Math.max(1, Number(digits)));
}

function parseMinuteInput(raw: string, fallback: number): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return fallback;
  return Math.min(59, Math.max(0, Number(digits)));
}

function formatHourDraft(hour12: number): string {
  return String(Math.min(12, Math.max(1, hour12)));
}

function formatMinuteDraft(minute: number): string {
  return String(Math.min(59, Math.max(0, minute))).padStart(2, "0");
}

function applyTimePartsToDate(date: Date, parts: SendTime12Parts): Date {
  const [hStr, mStr] = sendTimeFrom12Parts(parts).split(":");
  const next = new Date(date);
  next.setHours(Number(hStr), Number(mStr), 0, 0);
  return next;
}

function timePartsFromDate(date: Date): SendTime12Parts {
  const pad = (n: number) => String(n).padStart(2, "0");
  return parseSendTime12(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
}

function normalizeScheduledDraft(
  day: Date,
  parts: SendTime12Parts,
  now = new Date()
): { day: Date; parts: SendTime12Parts } {
  const min = getScheduledAtMinDate(now);
  const merged = applyTimePartsToDate(day, parts);
  if (merged.getTime() >= min.getTime()) {
    return { day, parts };
  }
  const next = roundUpToScheduleSlot(now);
  return {
    day: new Date(next.getFullYear(), next.getMonth(), next.getDate()),
    parts: timePartsFromDate(next),
  };
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function OutreachScheduledAtPicker({
  value,
  onChange,
  timezone,
  onTimezoneChange,
  disabled = false,
}: Props) {
  const panelId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseScheduledAtLocal(value));
  const [timeParts, setTimeParts] = useState<SendTime12Parts>(() =>
    timePartsFromDate(parseScheduledAtLocal(value))
  );
  const [hourDraft, setHourDraft] = useState(() =>
    formatHourDraft(timePartsFromDate(parseScheduledAtLocal(value)).hour12)
  );
  const [minuteDraft, setMinuteDraft] = useState(() =>
    formatMinuteDraft(timePartsFromDate(parseScheduledAtLocal(value)).minute)
  );
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [scheduleNow, setScheduleNow] = useState(() => new Date());

  const minCalendarDate = useMemo(() => startOfLocalDay(scheduleNow), [scheduleNow]);
  const maxDate = useMemo(() => getScheduledAtMaxDate(scheduleNow), [scheduleNow]);
  const displayLabel = formatScheduledDateLabel(value);

  const filterPastDates = useCallback(
    (date: Date) => startOfLocalDay(date).getTime() >= minCalendarDate.getTime(),
    [minCalendarDate]
  );

  const [scheduleTimeNotice, setScheduleTimeNotice] = useState<string | null>(null);

  const syncDraftToFuture = useCallback((day: Date, parts: SendTime12Parts, now = new Date()) => {
    const merged = applyTimePartsToDate(day, parts);
    const min = getScheduledAtMinDate(now);
    const wasPast =
      isSameLocalCalendarDay(day, now) && merged.getTime() < min.getTime();
    const next = normalizeScheduledDraft(day, parts, now);
    setDraft(next.day);
    setTimeParts(next.parts);
    setHourDraft(formatHourDraft(next.parts.hour12));
    setMinuteDraft(formatMinuteDraft(next.parts.minute));
    if (wasPast) {
      const adjusted = applyTimePartsToDate(next.day, next.parts);
      setScheduleTimeNotice(
        `Past times aren't allowed. Adjusted to ${adjusted.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}.`
      );
    } else {
      setScheduleTimeNotice(null);
    }
    return next;
  }, []);

  const PANEL_WIDTH = 312;
  const VIEWPORT_MARGIN = 8;
  const ANCHOR_GAP = 6;

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 460;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = rect.left;
    if (left + PANEL_WIDTH > viewportW - VIEWPORT_MARGIN) {
      left = viewportW - PANEL_WIDTH - VIEWPORT_MARGIN;
    }
    left = Math.max(VIEWPORT_MARGIN, left);

    const spaceBelow = viewportH - rect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - ANCHOR_GAP - VIEWPORT_MARGIN;
    const maxPanelHeight = viewportH - VIEWPORT_MARGIN * 2;

    let top: number;
    if (panelHeight <= spaceBelow) {
      top = rect.bottom + ANCHOR_GAP;
    } else if (panelHeight <= spaceAbove) {
      top = rect.top - panelHeight - ANCHOR_GAP;
    } else {
      top = VIEWPORT_MARGIN;
    }

    setPanelStyle({
      position: "fixed",
      top,
      left,
      width: PANEL_WIDTH,
      maxHeight: maxPanelHeight,
      zIndex: 99999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const run = () => updatePanelPosition();
    run();
    const raf = requestAnimationFrame(run);

    const panelEl = panelRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (panelEl && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => run());
      resizeObserver.observe(panelEl);
    }

    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setScheduleNow(now);
    setScheduleTimeNotice(null);
    const parsed = parseScheduledAtLocal(value);
    syncDraftToFuture(parsed, timePartsFromDate(parsed), now);
  }, [open, value, syncDraftToFuture]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const commitDraft = (day: Date, parts: SendTime12Parts) => {
    const now = new Date();
    const { day: futureDay, parts: futureParts } = normalizeScheduledDraft(day, parts, now);
    const merged = applyTimePartsToDate(futureDay, futureParts);
    onChange(clampScheduledAtLocal(toScheduledAtLocal(merged), now));
    setOpen(false);
  };

  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    syncDraftToFuture(date, timeParts, new Date());
  };

  const handleTimePartsChange = (patch: Partial<SendTime12Parts>) => {
    const nextParts = { ...timeParts, ...patch };
    syncDraftToFuture(draft, nextParts, new Date());
  };

  const commitHourDraft = (raw = hourDraft) => {
    const hour12 = parseHourInput(raw, timeParts.hour12);
    handleTimePartsChange({ hour12 });
  };

  const commitMinuteDraft = (raw = minuteDraft) => {
    const minute = parseMinuteInput(raw, timeParts.minute);
    handleTimePartsChange({ minute });
  };

  const handleHourDraftChange = (raw: string) => {
    const next = sanitizeHourInput(raw);
    setHourDraft(next);
    if (!next) return;
    const hour12 = parseHourInput(next, timeParts.hour12);
    if (next.length >= 2 || hour12 >= 2) {
      handleTimePartsChange({ hour12 });
    }
  };

  const handleMinuteDraftChange = (raw: string) => {
    const next = sanitizeMinuteInput(raw);
    setMinuteDraft(next);
    if (!next) return;
    const minute = parseMinuteInput(next, timeParts.minute);
    if (next.length >= 2 || minute > 5) {
      handleTimePartsChange({ minute });
    }
  };

  const handleDone = () => {
    const parts: SendTime12Parts = {
      ...timeParts,
      hour12: parseHourInput(hourDraft, timeParts.hour12),
      minute: parseMinuteInput(minuteDraft, timeParts.minute),
    };
    commitDraft(draft, parts);
  };

  const isTodaySelected = isSameLocalCalendarDay(draft, scheduleNow);
  const minTimeToday = useMemo(
    () => (isTodaySelected ? getScheduledAtMinDate(scheduleNow) : null),
    [isTodaySelected, scheduleNow]
  );

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Scheduled start date and time"
            className="dashboard-outreach-schedule-panel"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="dashboard-outreach-schedule-panel-title">Scheduled start</p>
            <p className="dashboard-outreach-schedule-panel-hint">
              Future date and time only · within 1 month
              {isTodaySelected && minTimeToday
                ? ` · today from ${minTimeToday.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : null}
            </p>

            <div className="dashboard-outreach-schedule-calendar-wrap">
              <DatePicker
                inline
                selected={draft}
                onChange={handleDateChange}
                minDate={minCalendarDate}
                maxDate={maxDate}
                filterDate={filterPastDates}
                disabledKeyboardNavigation
                calendarClassName="dashboard-outreach-schedule-calendar"
              />
            </div>

            <p className="dashboard-outreach-schedule-time-label">Time</p>
            <div className="dashboard-outreach-time-panel-fields">
              <label className="dashboard-outreach-time-field">
                <span className="dashboard-outreach-time-field-label">Hour (1–12)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={hourDraft}
                  onChange={(e) => handleHourDraftChange(e.target.value)}
                  onBlur={() => commitHourDraft()}
                  className="dashboard-outreach-time-field-input"
                  aria-label="Hour, 1 to 12"
                  aria-invalid={Boolean(scheduleTimeNotice)}
                />
              </label>
              <label className="dashboard-outreach-time-field">
                <span className="dashboard-outreach-time-field-label">Min (0–59)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={minuteDraft}
                  onChange={(e) => handleMinuteDraftChange(e.target.value)}
                  onBlur={() => commitMinuteDraft()}
                  className="dashboard-outreach-time-field-input"
                  aria-label="Minute, 0 to 59"
                  aria-invalid={Boolean(scheduleTimeNotice)}
                />
              </label>
              <div className="dashboard-outreach-time-field dashboard-outreach-time-field--period">
                <span className="dashboard-outreach-time-field-label">AM/PM</span>
                <OutreachTimePeriodSelect
                  value={timeParts.period}
                  onChange={(period) => handleTimePartsChange({ period })}
                  invalid={Boolean(scheduleTimeNotice)}
                />
              </div>
            </div>
            {scheduleTimeNotice ? (
              <p className="dashboard-outreach-schedule-time-error" role="alert">
                {scheduleTimeNotice}
              </p>
            ) : null}
            <div className="dashboard-outreach-schedule-timezone">
              <span className="dashboard-outreach-time-field-label">Timezone</span>
              <OutreachScheduleFieldSelect
                inputId="outreach-schedule-timezone"
                ariaLabel="Scheduled start timezone"
                classNamePrefix="outreach-schedule-timezone-select"
                value={normalizeOutreachTimezone(timezone)}
                options={TIMEZONE_OPTIONS}
                onChange={(tz) => onTimezoneChange(normalizeOutreachTimezone(tz))}
                disabled={disabled}
              />
            </div>
            <button type="button" className="dashboard-outreach-time-apply" onClick={handleDone}>
              Done
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <span className="dashboard-outreach-scheduled-picker" onMouseDown={(e) => e.stopPropagation()}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-label="Scheduled send date and time"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="dashboard-outreach-start-chip dashboard-outreach-start-chip--select dashboard-outreach-start-chip--scheduled-trigger"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        {displayLabel}
      </button>
      {panel}
    </span>
  );
}
