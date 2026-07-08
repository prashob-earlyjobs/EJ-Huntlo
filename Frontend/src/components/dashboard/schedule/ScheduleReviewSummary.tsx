"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  extras: { label: string; value: string }[];
  onSaveDraft: () => void;
  onSchedule: () => void;
};

export function ScheduleReviewSummary({ extras, onSaveDraft, onSchedule }: Props) {
  return (
    <div className="dashboard-schedule-review">
      <h3 className="dashboard-section-title">Review & schedule</h3>
      <dl className="dashboard-schedule-review-dl">
        {extras.map((e) => (
          <div key={e.label}><dt>{e.label}</dt><dd>{e.value}</dd></div>
        ))}
      </dl>
      <p className="dashboard-schedule-review-warning">
        <MaterialIcon name="info" className="text-sm" />
        UI preview only — scheduling will not send real invites or calendar events.
      </p>
      <div className="dashboard-schedule-review-actions">
        <button type="button" className="dashboard-btn-secondary" onClick={onSaveDraft}>Save draft</button>
        <button type="button" className="dashboard-btn-primary" onClick={onSchedule}>Schedule interview</button>
      </div>
    </div>
  );
}
