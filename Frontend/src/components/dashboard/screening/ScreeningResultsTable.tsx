"use client";

import type { ScreeningResultRow } from "@/components/dashboard/screening/types";
import { recommendationLabel } from "@/components/dashboard/screening/RecommendationBadge";

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  in_progress: "In Progress",
  call_failed: "Call Failed",
  no_response: "No Response",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
};

type Props = {
  rows: ScreeningResultRow[];
  onView: (id: string) => void;
};

export function ScreeningResultsTable({ rows, onView }: Props) {
  if (rows.length === 0) {
    return (
      <div className="dashboard-screening-empty-state">
        <p>No completed screenings yet.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-screening-table-wrap">
      <table className="dashboard-screening-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Type</th>
            <th>Status</th>
            <th>Score</th>
            <th>Recommendation</th>
            <th>Key strength</th>
            <th>Concern</th>
            <th>Completed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="dashboard-screening-table-candidate">
                  <strong>{row.name}</strong>
                  <span>{row.role}</span>
                </div>
              </td>
              <td>{row.type === "voice" ? "Voice" : "Video"}</td>
              <td>
                <span className={`dashboard-screening-status dashboard-screening-status--${row.status}`}>
                  {STATUS_LABELS[row.status]}
                </span>
              </td>
              <td>{row.score ?? "-"}</td>
              <td>{recommendationLabel(row.recommendation)}</td>
              <td>{row.keyStrength}</td>
              <td>{row.concern}</td>
              <td>{row.completedAt}</td>
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
