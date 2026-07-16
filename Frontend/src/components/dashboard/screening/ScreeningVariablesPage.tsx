"use client";

import { useCallback, useEffect, useState } from "react";

import type { ScreeningRow } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchScreeningResultVariables,
  type ScreeningVariablesRow,
} from "@/lib/screeningApi";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

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
  screeningId: string;
  onBack: () => void;
  onToast: (message: string) => void;
};

export function ScreeningVariablesPage({ screeningId, onBack, onToast }: Props) {
  const [screening, setScreening] = useState<ScreeningRow | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ScreeningVariablesRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchScreeningResultVariables(auth.token, screeningId);
      setScreening(data.screening);
      setColumns(data.columns);
      setRows(data.rows);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not load screening details");
    } finally {
      setLoading(false);
    }
  }, [onToast, screeningId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="dashboard-screening-results">
      <header className="dashboard-screening-results-header">
        <button type="button" className="dashboard-screening-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to results
        </button>
        <div className="dashboard-screening-results-title-row">
          <div>
            <h1 className="dashboard-section-title">
              {screening ? `${screening.name} — all details` : "All details"}
            </h1>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="dashboard-screening-empty-state">
          <p>Loading candidate details…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="dashboard-screening-empty-state">
          <p>No candidates in this screening yet.</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onBack}>
            Back to results
          </button>
        </div>
      ) : (
        <div className="dashboard-screening-table-wrap dashboard-screening-variables-wrap">
          <table className="dashboard-screening-table dashboard-screening-variables-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Status</th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className={
                      column === "Summary" ? "dashboard-screening-variables-summary" : undefined
                    }
                  >
                    {column}
                  </th>
                ))}
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
                  <td>
                    <span
                      className={`dashboard-screening-status dashboard-screening-status--${row.status}`}
                    >
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  {columns.map((column) =>
                    column === "Summary" ? (
                      <td
                        key={column}
                        className="dashboard-screening-variables-summary"
                        title={row.variables[column] || undefined}
                      >
                        <span className="dashboard-screening-variables-clamp">
                          {row.variables[column] || "—"}
                        </span>
                      </td>
                    ) : (
                      <td key={column}>{row.variables[column] || "—"}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
