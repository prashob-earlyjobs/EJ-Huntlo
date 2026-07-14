"use client";

import { ScheduleDirectCandidatesSection } from "@/components/dashboard/schedule/ScheduleDirectCandidatesSection";
import { ScheduleStatsCard } from "@/components/dashboard/schedule/ScheduleStatsCard";
import { ScheduleUpcomingInterviewsSkeleton } from "@/components/dashboard/schedule/ScheduleUpcomingInterviewsSkeleton";
import { StatusBadge } from "@/components/dashboard/schedule/StatusBadge";
import type { ScheduleStats, ScheduleUpcomingInterview } from "@/lib/scheduleApi";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

function formatInterviewTime(startTime: string | null, timezone: string) {
  if (!startTime) return "—";
  try {
    const label = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(startTime));
    return timezone ? `${label} (${timezone})` : label;
  } catch {
    return startTime;
  }
}

type Props = {
  stats: ScheduleStats;
  upcoming: ScheduleUpcomingInterview[];
  loading?: boolean;
  syncing?: boolean;
  calendlyConnected?: boolean;
  onScheduleInterview: () => void;
  onAddCandidate: () => void;
  onConnectCalendar: () => void;
  onViewCalendar: () => void;
  onOpenReminders: () => void;
  onViewInterview: (id: string) => void;
  onSync: () => void;
  onToast?: (message: string) => void;
};

export function ScheduleLandingPage({
  stats,
  upcoming,
  loading = false,
  syncing = false,
  calendlyConnected = false,
  onScheduleInterview,
  onAddCandidate,
  onConnectCalendar,
  onViewCalendar,
  onOpenReminders,
  onViewInterview,
  onSync,
  onToast,
}: Props) {
  return (
    <div className="dashboard-schedule-landing">
      <header className="dashboard-schedule-landing-header">
        <div>
          <h1 className="dashboard-section-title">Schedule</h1>
          <p className="dashboard-text-body">
            Add candidates directly or view interviews booked from outreach campaigns. Calendly syncs
            bookings by candidate email.
          </p>
        </div>
        <div className="dashboard-schedule-landing-actions">
          <button type="button" className={dashboardBtnPrimaryClass} onClick={onAddCandidate}>
            <MaterialIcon name="upload_file" className="text-sm" />
            Import CSV
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onOpenReminders}>
            <MaterialIcon name="notifications" className="text-sm" />
            Reminders
          </button>
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={onSync}
            disabled={syncing || !calendlyConnected}
          >
            {syncing ? "Syncing…" : "Sync Calendly"}
          </button>
          {!calendlyConnected ? (
            <button type="button" className={dashboardBtnSecondaryClass} onClick={onConnectCalendar}>
              Connect Calendly
            </button>
          ) : null}
        </div>
      </header>

      <section className="dashboard-schedule-action-grid dashboard-schedule-action-grid--compact">
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="upload_file" className="dashboard-schedule-action-icon" />
          <h3>Direct scheduling</h3>
          <p>Import CSV and send Calendly links.</p>
          <button type="button" className={dashboardBtnPrimaryClass} onClick={onAddCandidate}>
            Import CSV
          </button>
        </article>
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="campaign" className="dashboard-schedule-action-icon" />
          <h3>From outreach</h3>
          <p>Bookings from outreach or screening campaigns.</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onViewCalendar}>
            View calendar
          </button>
        </article>
        <article className="dashboard-schedule-action-card">
          <MaterialIcon name="calendar_month" className="dashboard-schedule-action-icon" />
          <h3>Upcoming interviews</h3>
          <p>All confirmed Calendly bookings in one place.</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onViewCalendar}>
            View calendar
          </button>
        </article>
      </section>

      <section className="dashboard-schedule-stats-grid">
        <ScheduleStatsCard label="Interviews scheduled" value={stats.interviewsScheduled} icon="event" />
        <ScheduleStatsCard label="Confirmed" value={stats.confirmed} icon="check_circle" />
        <ScheduleStatsCard label="Awaiting booking" value={stats.pendingConfirmation} icon="schedule" />
        <ScheduleStatsCard label="Reschedule requests" value={stats.rescheduleRequests} icon="event_repeat" />
        <ScheduleStatsCard label="Canceled" value={stats.canceled} icon="event_busy" />
      </section>

      <section>
        <div className="dashboard-outreach-tracking-section-head">
          <h2 className="dashboard-schedule-subsection-title">Upcoming interviews</h2>
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={onScheduleInterview}
          >
            Import CSV
          </button>
        </div>
        {loading ? (
          <ScheduleUpcomingInterviewsSkeleton />
        ) : upcoming.length === 0 ? (
          <div className="dashboard-schedule-empty-state">
            <MaterialIcon name="event_busy" />
            <p>No upcoming interviews yet. Import candidates via CSV or enable Calendly on an outreach campaign.</p>
            <button type="button" className={dashboardBtnPrimaryClass} onClick={onAddCandidate}>
              Import CSV
            </button>
          </div>
        ) : (
          <div className="dashboard-schedule-table-wrap">
            <table className="dashboard-schedule-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Source</th>
                  <th>Meeting</th>
                  <th>Date & time</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {upcoming.map((row) => (
                  <tr key={row.id}>
                    <td>{row.inviteeName || row.candidateName || row.inviteeEmail || "—"}</td>
                    <td>{row.role || "—"}</td>
                    <td>
                      {row.source === "direct"
                        ? "Direct"
                        : row.source === "campaign"
                          ? row.campaignName || "Campaign"
                          : "Calendly"}
                    </td>
                    <td>{row.eventName || "Interview"}</td>
                    <td>{formatInterviewTime(row.startTime, row.timezone)}</td>
                    <td>
                      <StatusBadge status={row.status === "confirmed" ? "confirmed" : "cancelled"} />
                    </td>
                    <td>
                      {row.rescheduleUrl ? (
                        <a
                          href={row.rescheduleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                        >
                          Open
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                          onClick={() => onViewInterview(row.id)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ScheduleDirectCandidatesSection onToast={onToast} />
    </div>
  );
}
