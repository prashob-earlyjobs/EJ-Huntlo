"use client";

import { useState } from "react";

import type { RescheduleRequest } from "@/components/dashboard/schedule/types";
import { mockAvailableSlots } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type TableProps = {
  rows: RescheduleRequest[];
  onManage: (id: string) => void;
};

export function RescheduleRequestTable({ rows, onManage }: TableProps) {
  if (rows.length === 0) {
    return (
      <div className="dashboard-schedule-empty-state">
        <p>No reschedule requests.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-schedule-table-wrap">
      <table className="dashboard-schedule-table">
        <thead>
          <tr>
            <th>Candidate</th><th>Role</th><th>Original</th><th>Requested</th><th>Reason</th><th>By</th><th>Status</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.candidate}</td>
              <td>{row.role}</td>
              <td>{row.originalSlot}</td>
              <td>{row.requestedSlots.join(" / ")}</td>
              <td>{row.reason}</td>
              <td>{row.requestedBy}</td>
              <td><span className="dashboard-schedule-badge dashboard-schedule-badge--muted">{row.status}</span></td>
              <td>
                <button type="button" className="dashboard-btn-secondary dashboard-btn-secondary--sm" onClick={() => onManage(row.id)}>
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DrawerProps = {
  request: RescheduleRequest | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSuggest: () => void;
};

export function RescheduleDrawer({
  request,
  open,
  onClose,
  onApprove,
  onReject,
  onSuggest,
}: DrawerProps) {
  if (!open || !request) return null;

  return (
    <>
      <button type="button" className="dashboard-schedule-drawer-backdrop" onClick={onClose} aria-label="Close" />
      <aside className="dashboard-schedule-drawer dashboard-schedule-drawer--reschedule" role="dialog">
        <header className="dashboard-schedule-drawer-header">
          <div>
            <h3>{request.candidate}</h3>
            <p>{request.role} — Reschedule request</p>
          </div>
          <button type="button" className="dashboard-schedule-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>
        <div className="dashboard-schedule-drawer-body">
          <section>
            <h4>Original slot</h4>
            <p>{request.originalSlot}</p>
          </section>
          <section>
            <h4>Requested slots</h4>
            <ul>{request.requestedSlots.map((s) => <li key={s}>{s}</li>)}</ul>
            <p><strong>Reason:</strong> {request.reason}</p>
            <p><strong>Requested by:</strong> {request.requestedBy}</p>
          </section>
          <section>
            <h4>
              AI replacement slots
              <span className="dashboard-schedule-badge dashboard-schedule-badge--ai">Reschedule Suggested</span>
            </h4>
            <ul className="dashboard-schedule-reschedule-slots">
              {mockAvailableSlots.slice(0, 3).map((s) => (
                <li key={s.id}>{s.date}, {s.time} – {s.endTime} ({s.confidence}% match)</li>
              ))}
            </ul>
          </section>
        </div>
        <footer className="dashboard-schedule-drawer-footer">
          <button type="button" className={dashboardBtnPrimaryClass} onClick={onApprove}>Approve</button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onReject}>Reject</button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onSuggest}>Suggest another slot</button>
        </footer>
      </aside>
    </>
  );
}

type ReportProps = {
  title: string;
  description: string;
  onExport: (format: "csv" | "pdf") => void;
};

export function ReportExportCard({ title, description, onExport }: ReportProps) {
  const [range, setRange] = useState("30");

  return (
    <div className="dashboard-schedule-report-card">
      <h4>{title}</h4>
      <p>{description}</p>
      <div className="dashboard-schedule-field">
        <label className="dashboard-label">Date range</label>
        <select className="dashboard-select" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>
      <div className="dashboard-schedule-report-actions">
        <button type="button" className="dashboard-btn-secondary" onClick={() => onExport("csv")}>Export CSV</button>
        <button type="button" className="dashboard-btn-secondary" onClick={() => onExport("pdf")}>Export PDF</button>
      </div>
    </div>
  );
}
