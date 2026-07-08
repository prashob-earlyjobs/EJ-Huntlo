"use client";

import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/dashboard/schedule/StatusBadge";
import type { CalendarEvent, InterviewStatus } from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type ViewMode = "month" | "week" | "day" | "list";

type Props = {
  events: CalendarEvent[];
  onScheduleInterview: () => void;
  onExport: () => void;
  onConnectCalendar: () => void;
  onSelectEvent: (id: string) => void;
};

export function InterviewCalendar({
  events,
  onScheduleInterview,
  onExport,
  onConnectCalendar,
  onSelectEvent,
}: Props) {
  const [view, setView] = useState<ViewMode>("week");
  const [interviewerFilter, setInterviewerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | "">("");

  const interviewers = useMemo(() => [...new Set(events.map((e) => e.interviewer))], [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (interviewerFilter && e.interviewer !== interviewerFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [events, interviewerFilter, statusFilter]);

  return (
    <div className="dashboard-schedule-calendar-layout">
      <aside className="dashboard-schedule-calendar-sidebar">
        <h4>Filters</h4>
        <div className="dashboard-schedule-field">
          <label className="dashboard-label">Interviewer</label>
          <select className="dashboard-select" value={interviewerFilter} onChange={(e) => setInterviewerFilter(e.target.value)}>
            <option value="">All</option>
            {interviewers.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="dashboard-schedule-field">
          <label className="dashboard-label">Status</label>
          <select className="dashboard-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | "")}>
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="reschedule_requested">Reschedule Requested</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </div>
      </aside>

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
            <button type="button" className={dashboardBtnSecondaryClass} onClick={onConnectCalendar}>Connect calendar</button>
            <button type="button" className={dashboardBtnSecondaryClass} onClick={onExport}>Export</button>
            <button type="button" className={dashboardBtnPrimaryClass} onClick={onScheduleInterview}>Schedule interview</button>
          </div>
        </header>

        {view === "list" ? (
          <div className="dashboard-schedule-table-wrap">
            <table className="dashboard-schedule-table">
              <thead>
                <tr><th>Candidate</th><th>Role</th><th>Time</th><th>Type</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>{e.candidate}</td>
                    <td>{e.role}</td>
                    <td>{e.date} {e.time}</td>
                    <td>{e.interviewType}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>
                      <button type="button" className="dashboard-btn-secondary dashboard-btn-secondary--sm" onClick={() => onSelectEvent(e.id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-schedule-calendar-grid">
            <div className="dashboard-schedule-calendar-week-header">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="dashboard-schedule-calendar-day-label">{d}</span>
              ))}
            </div>
            <div className="dashboard-schedule-calendar-cells">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="dashboard-schedule-calendar-cell">
                  <span className="dashboard-schedule-calendar-date">{i + 3}</span>
                  {filtered
                    .filter((_, idx) => idx % 7 === i % 7)
                    .slice(0, 2)
                    .map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className={`dashboard-schedule-event-card dashboard-schedule-event-card--${e.status}`}
                        onClick={() => onSelectEvent(e.id)}
                      >
                        <strong>{e.candidate}</strong>
                        <span>{e.time} · {e.interviewType}</span>
                        <StatusBadge status={e.status} />
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
