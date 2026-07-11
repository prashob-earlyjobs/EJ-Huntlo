"use client";

import type { CampaignCalendlyConfig, CampaignScheduledInterview } from "@/components/dashboard/outreach/types";
import { CampaignScheduledInterviewsSkeleton } from "@/components/dashboard/outreach/CampaignScheduledInterviewsSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

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
  interviews: CampaignScheduledInterview[];
  calendly: CampaignCalendlyConfig;
  loading?: boolean;
  syncing?: boolean;
  onSync: () => void;
  onViewCandidate?: (candidateId: string) => void;
};

export function CampaignScheduledInterviewsSection({
  interviews,
  calendly,
  loading = false,
  syncing = false,
  onSync,
  onViewCandidate,
}: Props) {
  return (
    <section className="dashboard-outreach-tracking-table-section">
      <div className="dashboard-outreach-tracking-section-head">
        <div>
          <h2 className="dashboard-outreach-subsection-title">Scheduled interviews</h2>
          <p className="dashboard-text-body dashboard-outreach-scheduled-hint">
            {calendly.enabled
              ? calendly.meetingName
                ? `Calendly: ${calendly.meetingName}`
                : "Calendly enabled for this campaign"
              : "Enable Calendly in the campaign email reply setup to schedule interviews."}
          </p>
        </div>
        <button
          type="button"
          className={dashboardBtnSecondaryClass}
          onClick={onSync}
          disabled={!calendly.enabled || syncing}
        >
          {syncing ? "Syncing…" : "Sync from Calendly"}
        </button>
      </div>

      {loading ? (
        <CampaignScheduledInterviewsSkeleton />
      ) : interviews.length === 0 ? (
        <div className="dashboard-outreach-empty-state dashboard-outreach-empty-state--compact">
          <MaterialIcon name="event_busy" />
          <p>
            {calendly.enabled
              ? "No Calendly bookings linked to this campaign yet."
              : "Connect Calendly on the campaign and send scheduling links to candidates."}
          </p>
        </div>
      ) : (
        <div className="dashboard-schedule-table-wrap">
          <table className="dashboard-schedule-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Meeting</th>
                <th>Date & time</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {interviews.map((row) => (
                <tr key={row.id}>
                  <td>{row.inviteeName || row.candidateName || "—"}</td>
                  <td>{row.inviteeEmail || "—"}</td>
                  <td>{row.eventName || calendly.meetingName || "Interview"}</td>
                  <td>{formatInterviewTime(row.startTime, row.timezone)}</td>
                  <td>
                    <span
                      className={`dashboard-outreach-table-status dashboard-outreach-table-status--${
                        row.status === "active" ? "active" : "paused"
                      }`}
                    >
                      {row.status === "active" ? "Scheduled" : "Canceled"}
                    </span>
                  </td>
                  <td>
                    {row.candidateId && onViewCandidate ? (
                      <button
                        type="button"
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                        onClick={() => onViewCandidate(row.candidateId)}
                      >
                        View
                      </button>
                    ) : row.rescheduleUrl ? (
                      <a
                        href={row.rescheduleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                      >
                        Open
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
