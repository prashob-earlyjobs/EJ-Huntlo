"use client";

import { useMemo, useState } from "react";

import { CandidateScreeningResultDrawer } from "@/components/dashboard/screening/CandidateScreeningResultDrawer";
import { ScreeningResultsTable } from "@/components/dashboard/screening/ScreeningResultsTable";
import { ScreeningStatsCard } from "@/components/dashboard/screening/ScreeningStatsCard";
import {
  mockFunnelStages,
  mockResultDetail,
  mockScreeningDetailStats,
  mockScreenings,
  mockScreeningResults,
} from "@/components/dashboard/screening/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  screeningId: string;
  onBack: () => void;
  onToast: (message: string) => void;
};

export function ScreeningResultsPage({ screeningId, onBack, onToast }: Props) {
  const screening = useMemo(
    () => mockScreenings.find((s) => s.id === screeningId) ?? mockScreenings[0],
    [screeningId]
  );
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const detail = drawerId === "r1" || !drawerId ? mockResultDetail : mockResultDetail;

  return (
    <div className="dashboard-screening-results">
      <header className="dashboard-screening-results-header">
        <button type="button" className="dashboard-screening-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to screening
        </button>
        <div className="dashboard-screening-results-title-row">
          <div>
            <h1 className="dashboard-section-title">{screening.name}</h1>
            <div className="dashboard-screening-results-meta">
              <span className={`dashboard-screening-table-status dashboard-screening-table-status--${screening.status}`}>
                {screening.status}
              </span>
              <span className="dashboard-screening-type-badge">
                {screening.type === "voice" ? "AI Voice" : "AI Video"}
              </span>
            </div>
          </div>
          <div className="dashboard-screening-results-actions">
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={() => {
                console.log("pause", screeningId);
                onToast("Screening paused (UI preview)");
              }}
            >
              Pause screening
            </button>
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={() => {
                console.log("export", screeningId);
                onToast("Export started (UI preview)");
              }}
            >
              Export results
            </button>
          </div>
        </div>
      </header>

      <section className="dashboard-screening-stats-grid dashboard-screening-stats-grid--dense">
        <ScreeningStatsCard label="Total candidates" value={mockScreeningDetailStats.total} icon="groups" />
        <ScreeningStatsCard label="Invited / called" value={mockScreeningDetailStats.invited} icon="call" />
        <ScreeningStatsCard label="Completed" value={mockScreeningDetailStats.completed} icon="task_alt" />
        <ScreeningStatsCard label="Shortlisted" value={mockScreeningDetailStats.shortlisted} icon="thumb_up" />
        <ScreeningStatsCard label="Rejected" value={mockScreeningDetailStats.rejected} icon="thumb_down" />
        <ScreeningStatsCard label="Pending" value={mockScreeningDetailStats.pending} icon="hourglass_empty" />
        <ScreeningStatsCard label="Avg score" value={`${mockScreeningDetailStats.avgScore}%`} icon="analytics" />
      </section>

      <section className="dashboard-screening-funnel">
        <h2 className="dashboard-screening-subsection-title">Screening funnel</h2>
        <div className="dashboard-screening-funnel-row">
          {mockFunnelStages.map((stage, i) => (
            <div key={stage.label} className="dashboard-screening-funnel-stage">
              {i > 0 ? <MaterialIcon name="arrow_forward" className="dashboard-screening-funnel-arrow" /> : null}
              <div className="dashboard-screening-funnel-card">
                <span className="dashboard-screening-funnel-count">{stage.count}</span>
                <span className="dashboard-screening-funnel-label">{stage.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="dashboard-screening-subsection-title">Candidate results</h2>
        <ScreeningResultsTable rows={mockScreeningResults} onView={setDrawerId} />
      </section>

      <CandidateScreeningResultDrawer
        detail={drawerId ? detail : null}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onAction={(action) => {
          console.log("recruiter decision", action, drawerId);
          onToast(`Action: ${action.replace(/_/g, " ")} (UI preview)`);
        }}
      />
    </div>
  );
}
