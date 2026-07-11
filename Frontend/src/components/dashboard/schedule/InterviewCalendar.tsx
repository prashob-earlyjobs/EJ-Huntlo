"use client";

import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/dashboard/schedule/StatusBadge";
import { InterviewCalendarTableSkeleton } from "@/components/dashboard/schedule/InterviewCalendarTableSkeleton";
import type { CalendarEvent } from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type ViewMode = "month" | "week" | "day" | "list";

type Props = {
  events: CalendarEvent[];
  loading?: boolean;
  calendlyConnected?: boolean;
  onScheduleInterview: () => void;
  onSync: () => void;
  onConnectCalendar: () => void;
  onSelectEvent: (id: string) => void;
};

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return localDateKey(a) === localDateKey(b);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

function formatPeriodLabel(view: ViewMode, focusDate: Date) {
  if (view === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(focusDate);
  }
  if (view === "week") {
    const start = startOfWeek(focusDate);
    const end = addDays(start, 6);
    const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    const yearFmt = new Intl.DateTimeFormat(undefined, { year: "numeric" });
    const sameYear = start.getFullYear() === end.getFullYear();
    return sameYear
      ? `${fmt.format(start)} – ${fmt.format(end)}, ${yearFmt.format(end)}`
      : `${fmt.format(start)}, ${yearFmt.format(start)} – ${fmt.format(end)}, ${yearFmt.format(end)}`;
  }
  if (view === "day") {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(focusDate);
  }
  return "All interviews";
}

function shiftFocusDate(view: ViewMode, focusDate: Date, direction: -1 | 1) {
  const d = new Date(focusDate);
  if (view === "month") {
    d.setMonth(d.getMonth() + direction);
    return d;
  }
  if (view === "week") {
    return addDays(d, direction * 7);
  }
  if (view === "day") {
    return addDays(d, direction);
  }
  return d;
}

function EventCard({
  event,
  onSelect,
  compact = false,
}: {
  event: CalendarEvent;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`dashboard-schedule-event-card dashboard-schedule-event-card--${event.status}${
        compact ? " dashboard-schedule-event-card--compact" : ""
      }`}
      onClick={() => onSelect(event.id)}
    >
      <strong>{event.candidate}</strong>
      <span>
        {event.time} · {event.interviewType}
      </span>
      {!compact ? <StatusBadge status={event.status} /> : null}
    </button>
  );
}

export function InterviewCalendar({
  events,
  loading = false,
  calendlyConnected = false,
  onScheduleInterview,
  onSync,
  onConnectCalendar,
  onSelectEvent,
}: Props) {
  const [view, setView] = useState<ViewMode>("list");
  const [focusDate, setFocusDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.date) continue;
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    const firstOfMonth = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [focusDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [focusDate]);

  const dayEvents = useMemo(() => {
    return eventsByDate.get(localDateKey(focusDate)) || [];
  }, [eventsByDate, focusDate]);

  const periodLabel = formatPeriodLabel(view, focusDate);
  const showCalendarNav = view === "month" || view === "week" || view === "day";

  const renderDayCell = (d: Date, options?: { muted?: boolean; tall?: boolean }) => {
    const key = localDateKey(d);
    const dayItems = eventsByDate.get(key) || [];
    const isToday = isSameDay(d, today);
    const isFocus = view === "day" && isSameDay(d, focusDate);

    return (
      <div
        key={key}
        className={`dashboard-schedule-calendar-cell${options?.muted ? " dashboard-schedule-calendar-cell--muted" : ""}${
          isToday ? " dashboard-schedule-calendar-cell--today" : ""
        }${isFocus ? " dashboard-schedule-calendar-cell--focus" : ""}${options?.tall ? " dashboard-schedule-calendar-cell--tall" : ""}`}
      >
        <button
          type="button"
          className="dashboard-schedule-calendar-date-btn"
          onClick={() => {
            setFocusDate(new Date(d));
            setView("day");
          }}
        >
          {d.getDate()}
        </button>
        {dayItems.slice(0, options?.tall ? 8 : 3).map((e) => (
          <EventCard key={e.id} event={e} onSelect={onSelectEvent} compact={!options?.tall} />
        ))}
        {dayItems.length > (options?.tall ? 8 : 3) ? (
          <button
            type="button"
            className="dashboard-schedule-calendar-more"
            onClick={() => {
              setFocusDate(new Date(d));
              setView("day");
            }}
          >
            +{dayItems.length - (options?.tall ? 8 : 3)} more
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="dashboard-schedule-calendar-layout">
      <div className="dashboard-schedule-calendar-main">
        <header className="dashboard-schedule-calendar-toolbar">
          <div className="dashboard-schedule-view-tabs">
            {(["month", "week", "day", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                className={`dashboard-schedule-view-tab${view === v ? " dashboard-schedule-view-tab--active" : ""}`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="dashboard-schedule-calendar-actions">
            {!calendlyConnected ? (
              <button type="button" className={dashboardBtnSecondaryClass} onClick={onConnectCalendar}>
                Connect Calendly
              </button>
            ) : (
              <button type="button" className={dashboardBtnSecondaryClass} onClick={onSync}>
                Sync Calendly
              </button>
            )}
            <button type="button" className={dashboardBtnPrimaryClass} onClick={onScheduleInterview}>
              Import CSV
            </button>
          </div>
        </header>

        {showCalendarNav ? (
          <div className="dashboard-schedule-calendar-nav">
            <button
              type="button"
              className="dashboard-schedule-icon-btn"
              aria-label="Previous"
              onClick={() => setFocusDate((d) => shiftFocusDate(view, d, -1))}
            >
              <MaterialIcon name="chevron_left" />
            </button>
            <div className="dashboard-schedule-calendar-nav-label">
              <strong>{periodLabel}</strong>
              <button
                type="button"
                className="dashboard-schedule-calendar-today-btn"
                onClick={() => setFocusDate(new Date(today))}
              >
                Today
              </button>
            </div>
            <button
              type="button"
              className="dashboard-schedule-icon-btn"
              aria-label="Next"
              onClick={() => setFocusDate((d) => shiftFocusDate(view, d, 1))}
            >
              <MaterialIcon name="chevron_right" />
            </button>
          </div>
        ) : null}

        {loading ? (
          view === "list" ? (
            <InterviewCalendarTableSkeleton />
          ) : (
            <div
              className="dashboard-schedule-calendar-skeleton"
              aria-busy="true"
              aria-label="Loading calendar"
            >
              <div className="dashboard-shimmer dashboard-schedule-calendar-skeleton-nav" />
              <div className="dashboard-shimmer dashboard-schedule-calendar-skeleton-grid" />
            </div>
          )
        ) : events.length === 0 ? (
          <div className="dashboard-schedule-empty-state">
            <MaterialIcon name="event_busy" />
            <p>
              No Calendly interviews synced yet. Import candidates or enable Calendly on a campaign, then sync.
            </p>
            {!calendlyConnected ? (
              <button type="button" className={dashboardBtnSecondaryClass} onClick={onConnectCalendar}>
                Connect Calendly
              </button>
            ) : (
              <button type="button" className={dashboardBtnPrimaryClass} onClick={onSync}>
                Sync Calendly
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <div className="dashboard-schedule-table-wrap">
            <table className="dashboard-schedule-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Date & time</th>
                  <th>Meeting</th>
                  <th>Source</th>
                  <th>Host</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.candidate}</td>
                    <td>{e.role}</td>
                    <td>
                      {e.date} {e.time}
                    </td>
                    <td>{e.interviewType}</td>
                    <td>
                      {e.source === "direct"
                        ? "Direct"
                        : e.source === "campaign"
                          ? e.campaignName || "Campaign"
                          : "Calendly"}
                    </td>
                    <td>{e.interviewer}</td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                        onClick={() => onSelectEvent(e.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : view === "month" ? (
          <div className="dashboard-schedule-calendar-grid dashboard-schedule-calendar-grid--month">
            <div className="dashboard-schedule-calendar-week-header">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="dashboard-schedule-calendar-day-label">
                  {d}
                </span>
              ))}
            </div>
            <div className="dashboard-schedule-calendar-cells dashboard-schedule-calendar-cells--month">
              {monthDays.map((d) => {
                const inMonth = d.getMonth() === focusDate.getMonth();
                return renderDayCell(d, { muted: !inMonth });
              })}
            </div>
          </div>
        ) : view === "week" ? (
          <div className="dashboard-schedule-calendar-grid">
            <div className="dashboard-schedule-calendar-week-header">
              {weekDays.map((d) => (
                <span key={localDateKey(d)} className="dashboard-schedule-calendar-day-label">
                  {formatDayLabel(d)} {d.getDate()}
                </span>
              ))}
            </div>
            <div className="dashboard-schedule-calendar-cells">
              {weekDays.map((d) => renderDayCell(d, { tall: true }))}
            </div>
          </div>
        ) : (
          <div className="dashboard-schedule-day-view">
            {dayEvents.length === 0 ? (
              <div className="dashboard-schedule-day-view-empty">
                <MaterialIcon name="event_available" />
                <p>No interviews scheduled for this day.</p>
              </div>
            ) : (
              <ul className="dashboard-schedule-day-view-list">
                {dayEvents.map((e) => (
                  <li key={e.id}>
                    <div className="dashboard-schedule-day-view-time">{e.time}</div>
                    <div className="dashboard-schedule-day-view-card">
                      <div className="dashboard-schedule-day-view-card-head">
                        <strong>{e.candidate}</strong>
                        <StatusBadge status={e.status} />
                      </div>
                      <p>{e.interviewType}</p>
                      <p className="dashboard-schedule-day-view-meta">
                        {e.role} · {e.interviewer}
                        {e.source === "campaign" && e.campaignName ? ` · ${e.campaignName}` : ""}
                      </p>
                      <button
                        type="button"
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                        onClick={() => onSelectEvent(e.id)}
                      >
                        View details
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
