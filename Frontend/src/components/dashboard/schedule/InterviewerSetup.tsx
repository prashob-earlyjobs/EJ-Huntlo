"use client";

import type { CalendarStatus, Interviewer } from "@/components/dashboard/schedule/types";
import { mockCalendarSync } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass, dashboardLabelClass, dashboardSelectClass } from "@/lib/dashboardStyles";

const STATUS_LABEL: Record<CalendarStatus, string> = {
  connected: "Connected",
  not_connected: "Not Connected",
  sync_required: "Sync Required",
};

type InterviewerCardProps = {
  interviewer: Interviewer;
  selected?: boolean;
  onSelect?: () => void;
};

export function InterviewerCard({ interviewer, selected, onSelect }: InterviewerCardProps) {
  return (
    <button
      type="button"
      className={`dashboard-schedule-interviewer-card${selected ? " dashboard-schedule-interviewer-card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="dashboard-schedule-interviewer-card-head">
        <strong>{interviewer.name}</strong>
        <span className={`dashboard-schedule-cal-badge dashboard-schedule-cal-badge--${interviewer.calendarStatus}`}>
          {interviewer.calendarStatus === "connected" ? (
            <><MaterialIcon name="sync" className="text-sm" /> Calendar Synced</>
          ) : (
            STATUS_LABEL[interviewer.calendarStatus]
          )}
        </span>
      </div>
      <p>{interviewer.role}</p>
      <p className="dashboard-schedule-interviewer-tz">{interviewer.timezone}</p>
    </button>
  );
}

type CalendarSyncProps = {
  onConnect: (provider: "google" | "outlook") => void;
};

export function CalendarSyncCard({ onConnect }: CalendarSyncProps) {
  return (
    <div className="dashboard-schedule-calendar-sync">
      <h4 className="dashboard-schedule-subsection-title">Calendar sync</h4>
      <div className="dashboard-schedule-calendar-sync-grid">
        <div className="dashboard-schedule-calendar-provider">
          <MaterialIcon name="event" />
          <div>
            <strong>Google Calendar</strong>
            <p>{mockCalendarSync.google.connected ? `Last synced ${mockCalendarSync.google.lastSynced}` : "Not connected"}</p>
          </div>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onConnect("google")}>
            {mockCalendarSync.google.connected ? "Manage" : "Connect"}
          </button>
        </div>
        <div className="dashboard-schedule-calendar-provider">
          <MaterialIcon name="event" />
          <div>
            <strong>Outlook Calendar</strong>
            <p>{mockCalendarSync.outlook.connected ? `Last synced ${mockCalendarSync.outlook.lastSynced}` : "Not connected"}</p>
          </div>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onConnect("outlook")}>Connect</button>
        </div>
      </div>
      {!mockCalendarSync.outlook.connected ? (
        <p className="dashboard-schedule-calendar-warning">
          <MaterialIcon name="warning" className="text-sm" />
          Calendar is not connected. AI slot finding will use manual availability.
        </p>
      ) : null}
    </div>
  );
}

type InterviewerSetupProps = {
  interviewers: Interviewer[];
  selectedId: string;
  onSelect: (id: string) => void;
  workingDays: string[];
  onWorkingDaysChange: (days: string[]) => void;
  startTime: string;
  endTime: string;
  onStartTimeChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  buffer: string;
  onBufferChange: (v: string) => void;
  maxPerDay: number;
  onMaxPerDayChange: (n: number) => void;
  onConnectCalendar: (provider: "google" | "outlook") => void;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function InterviewerSetup({
  interviewers,
  selectedId,
  onSelect,
  workingDays,
  onWorkingDaysChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  buffer,
  onBufferChange,
  maxPerDay,
  onMaxPerDayChange,
  onConnectCalendar,
}: InterviewerSetupProps) {
  const toggleDay = (day: string) => {
    onWorkingDaysChange(
      workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day]
    );
  };

  return (
    <div className="dashboard-schedule-interviewer-setup">
      <div className="dashboard-schedule-field">
        <label className={dashboardLabelClass} htmlFor="sched-interviewer">Select interviewer</label>
        <select id="sched-interviewer" className={dashboardSelectClass} value={selectedId} onChange={(e) => onSelect(e.target.value)}>
          {interviewers.map((i) => (
            <option key={i.id} value={i.id}>{i.name} — {i.role}</option>
          ))}
        </select>
      </div>

      <div className="dashboard-schedule-interviewer-grid">
        {interviewers.map((i) => (
          <InterviewerCard key={i.id} interviewer={i} selected={selectedId === i.id} onSelect={() => onSelect(i.id)} />
        ))}
      </div>

      <CalendarSyncCard onConnect={onConnectCalendar} />

      <div className="dashboard-schedule-availability">
        <h4 className="dashboard-schedule-subsection-title">Availability preferences</h4>
        <div className="dashboard-schedule-weekdays">
          {WEEKDAYS.map((day) => (
            <label key={day} className="dashboard-schedule-weekday">
              <input type="checkbox" checked={workingDays.includes(day)} onChange={() => toggleDay(day)} />
              {day.slice(0, 3)}
            </label>
          ))}
        </div>
        <div className="dashboard-schedule-time-row">
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>Start time</label>
            <input type="time" className="dashboard-input" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} />
          </div>
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>End time</label>
            <input type="time" className="dashboard-input" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} />
          </div>
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>Buffer</label>
            <select className={dashboardSelectClass} value={buffer} onChange={(e) => onBufferChange(e.target.value)}>
              <option value="0">0 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>Max/day</label>
            <input type="number" min={1} max={10} className="dashboard-input" value={maxPerDay} onChange={(e) => onMaxPerDayChange(Number(e.target.value))} />
          </div>
        </div>
      </div>
    </div>
  );
}
