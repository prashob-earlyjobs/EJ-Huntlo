"use client";

import type { ScreeningType } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  name: string;
  type: ScreeningType;
  candidateCount: number;
  questionsCount: number;
  extras: { label: string; value: string }[];
  onSaveDraft: () => void;
  onLaunch: () => void;
  launchLabel: string;
};

export function ScreeningReviewSummary({
  name,
  type,
  candidateCount,
  questionsCount,
  extras,
  onSaveDraft,
  onLaunch,
  launchLabel,
}: Props) {
  return (
    <div className="dashboard-screening-review">
      <h3 className="dashboard-section-title">Review & launch</h3>
      <dl className="dashboard-screening-review-dl">
        <div><dt>Screening name</dt><dd>{name || "Untitled"}</dd></div>
        <div><dt>Type</dt><dd>{type === "voice" ? "AI Voice" : "AI Video"}</dd></div>
        <div><dt>Candidates</dt><dd>{candidateCount}</dd></div>
        <div><dt>Questions</dt><dd>{questionsCount}</dd></div>
        {extras.map((e) => (
          <div key={e.label}><dt>{e.label}</dt><dd>{e.value}</dd></div>
        ))}
      </dl>
      <p className="dashboard-screening-review-warning">
        <MaterialIcon name="info" className="text-sm" />
        UI preview only — launch will not run real screenings.
      </p>
      <div className="dashboard-screening-review-actions">
        <button type="button" className="dashboard-btn-secondary" onClick={onSaveDraft}>Save draft</button>
        <button type="button" className="dashboard-btn-primary" onClick={onLaunch}>{launchLabel}</button>
      </div>
    </div>
  );
}
