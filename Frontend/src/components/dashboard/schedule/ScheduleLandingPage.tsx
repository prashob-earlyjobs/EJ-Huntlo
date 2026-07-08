"use client";

import { ScheduleStatsCard } from "@/components/dashboard/schedule/ScheduleStatsCard";
import { StatusBadge } from "@/components/dashboard/schedule/StatusBadge";
import { mockScheduleStats, mockUpcomingInterviews } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  onScheduleInterview: () => void;
  onConnectCalendar: () => void;
  onFindSlots: () => void;
  onViewCalendar: () => void;
  onManageReschedule: () => void;
  onViewInterview: (id: string) => void;
};

export function ScheduleLandingPage({
  onScheduleInterview,
  onConnectCalendar,
  onFindSlots,
  onViewCalendar,
  onManageReschedule,
  onViewInterview,
}: Props) {
  return (
    <div className="dashboard-schedule-landing">
      <header className="dashboard-schedule-landing-header">
        <div>
          <h1 className="dashboard-section-title">Schedule</h1>
          <p className="dashboard-text-body">
            Schedule interviews faster with AI slot finding, calendar sync, reminders, and rescheduling.
          </p>
        </div>
        <div className="dashboard-schedule-landing-actions">
          <button type="button" className={dashboardBtnPrimaryClass} onClick={onScheduleInterview}>
            <MaterialIcon name="add" className="text-sm" />
            Schedule interview
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onConnectCalendar}>
            Connect calendar
          </button>
        </div>
      </header>

      <section className="dashboard-schedule-action-grid">
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="auto_awesome" className="dashboard-schedule-action-icon" />
          <h3>AI Slot Finder</h3>
          <p>Let AI find the best available interview slots across recruiters, interviewers, and candidates.</p>
          <button type="button" className={dashboardBtnPrimaryClass} onClick={onFindSlots}>Find slots</button>
        </article>
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="calendar_month" className="dashboard-schedule-action-icon" />
          <h3>Upcoming interviews</h3>
          <p>View and manage all scheduled interviews.</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onViewCalendar}>View calendar</button>
        </article>
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="event_repeat" className="dashboard-schedule-action-icon" />
          <h3>Reschedule requests</h3>
          <p>Track candidate or interviewer reschedule requests.</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onManageReschedule}>Manage requests</button>
        </article>
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="sync" className="dashboard-schedule-action-icon" />
          <h3>Calendar sync</h3>
          <p>Connect Google Calendar or Outlook Calendar to avoid conflicts.</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onConnectCalendar}>Connect calendar</button>
        </article>
      </section>

      <section className="dashboard-schedule-stats-grid">
        <ScheduleStatsCard label="Interviews scheduled" value={mockScheduleStats.interviewsScheduled} icon="event" />
        <ScheduleStatsCard label="Confirmed" value={mockScheduleStats.confirmed} icon="check_circle" />
        <ScheduleStatsCard label="Pending confirmation" value={mockScheduleStats.pendingConfirmation} icon="schedule" />
        <ScheduleStatsCard label="Reschedule requests" value={mockScheduleStats.rescheduleRequests} icon="event_repeat" />
        <ScheduleStatsCard label="No-shows" value={mockScheduleStats.noShows} icon="person_off" />
      </section>

      <section>
        <h2 className="dashboard-schedule-subsection-title">Upcoming interviews</h2>
        {mockUpcomingInterviews.length === 0 ? (
          <div className="dashboard-schedule-empty-state">
            <MaterialIcon name="event_busy" />
            <p>No interviews scheduled yet.</p>
            <button type="button" className={dashboardBtnPrimaryClass} onClick={onScheduleInterview}>Schedule interview</button>
          </div>
        ) : (
          <div className="dashboard-schedule-table-wrap">
            <table className="dashboard-schedule-table">
              <thead>
                <tr>
                  <th>Candidate</th><th>Role</th><th>Type</th><th>Interviewer</th><th>Date & time</th><th>Status</th><th>Reminder</th><th />
                </tr>
              </thead>
              <tbody>
                {mockUpcomingInterviews.map((row) => (
                  <tr key={row.id}>
                    <td>{row.candidate}</td>
                    <td>{row.role}</td>
                    <td>{row.interviewType}</td>
                    <td>{row.interviewer}</td>
                    <td>{row.dateTime}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>{row.reminder}</td>
                    <td>
                      <button type="button" className="dashboard-btn-secondary dashboard-btn-secondary--sm" onClick={() => onViewInterview(row.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
