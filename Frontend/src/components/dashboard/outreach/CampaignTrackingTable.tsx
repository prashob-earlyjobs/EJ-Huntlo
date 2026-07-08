"use client";

import type { CampaignTrackingCandidate } from "@/components/dashboard/outreach/types";

type Props = {
  rows: CampaignTrackingCandidate[];
  onView: (id: string) => void;
};

const STATUS_LABELS: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not Interested",
  no_response: "No Response",
  follow_up_scheduled: "Follow-up Scheduled",
  call_completed: "Call Completed",
  failed_delivery: "Failed Delivery",
};

export function CampaignTrackingTable({ rows, onView }: Props) {
  if (rows.length === 0) {
    return (
      <div className="dashboard-outreach-empty-state">
        <p>No candidates in this campaign yet.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-outreach-table-wrap">
      <table className="dashboard-outreach-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Contact</th>
            <th>Channel</th>
            <th>Last step</th>
            <th>Status</th>
            <th>Interest</th>
            <th>Last response</th>
            <th>Next action</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="dashboard-outreach-table-candidate">
                  <strong>{row.name}</strong>
                  <span>{row.role}</span>
                </div>
              </td>
              <td>
                <div className="dashboard-outreach-table-contact">
                  <span>{row.email && row.email !== "-" ? row.email : "—"}</span>
                  <span>{row.phone && row.phone !== "-" ? row.phone : "—"}</span>
                </div>
              </td>
              <td>{row.channel || "—"}</td>
              <td>{row.lastStep || "—"}</td>
              <td>
                <span className={`dashboard-outreach-status dashboard-outreach-status--${row.status}`}>
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
              </td>
              <td>{row.interest}</td>
              <td>{row.lastResponse}</td>
              <td>{row.nextAction}</td>
              <td>
                <button
                  type="button"
                  className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                  onClick={() => onView(row.id)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
