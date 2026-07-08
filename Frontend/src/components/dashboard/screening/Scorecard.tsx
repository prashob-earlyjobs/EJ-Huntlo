"use client";

import type { ScorecardEntry } from "@/components/dashboard/screening/types";

type Props = {
  entries: ScorecardEntry[];
  overallScore?: number;
};

export function Scorecard({ entries, overallScore }: Props) {
  return (
    <div className="dashboard-screening-scorecard">
      {overallScore !== undefined ? (
        <div className="dashboard-screening-scorecard-overall">
          <span className="dashboard-screening-scorecard-overall-value">{overallScore}</span>
          <span className="dashboard-screening-scorecard-overall-label">Overall score</span>
        </div>
      ) : null}
      <div className="dashboard-screening-scorecard-grid">
        {entries.map((e) => (
          <div key={e.label} className="dashboard-screening-scorecard-item">
            <div className="dashboard-screening-scorecard-item-head">
              <span>{e.label}</span>
              <strong>{e.score}/100</strong>
            </div>
            <div className="dashboard-screening-scorecard-bar">
              <span style={{ width: `${e.score}%` }} />
            </div>
          </div>
        ))}
      </div>
      <span className="dashboard-screening-badge dashboard-screening-badge--ai">Smart Scorecard</span>
    </div>
  );
}
