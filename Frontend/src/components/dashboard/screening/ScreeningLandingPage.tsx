"use client";

import { ScreeningStatsCard } from "@/components/dashboard/screening/ScreeningStatsCard";
import { ScreeningTypeCard } from "@/components/dashboard/screening/ScreeningTypeCard";
import { mockScreenings, mockScreeningStats } from "@/components/dashboard/screening/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";

type Props = {
  onNewScreening: () => void;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onViewScreening: (id: string) => void;
};

export function ScreeningLandingPage({
  onNewScreening,
  onStartVoice,
  onStartVideo,
  onViewScreening,
}: Props) {
  return (
    <div className="dashboard-screening-landing">
      <header className="dashboard-screening-landing-header">
        <div>
          <h1 className="dashboard-section-title">Screening</h1>
          <p className="dashboard-text-body">
            Run AI-powered voice and video screening to evaluate candidates faster.
          </p>
        </div>
        <button type="button" className={dashboardBtnPrimaryClass} onClick={onNewScreening}>
          <MaterialIcon name="add" className="text-sm" />
          New screening
        </button>
      </header>

      <section className="dashboard-screening-type-grid">
        <ScreeningTypeCard
          variant="voice"
          title="AI Voice Screening"
          description="Let AI call candidates, ask screening questions, capture answers, and generate scorecards."
          bestFor={[
            "High-volume hiring",
            "Fast interest and qualification checks",
            "Candidates who may not complete video screening",
          ]}
          ctaLabel="Start voice screening"
          onClick={onStartVoice}
        />
        <ScreeningTypeCard
          variant="video"
          title="AI Video Screening"
          description="Let candidates answer structured questions on video and get AI-generated evaluation."
          bestFor={[
            "Communication-heavy roles",
            "Client-facing jobs",
            "Detailed candidate evaluation",
          ]}
          ctaLabel="Start video screening"
          onClick={onStartVideo}
          locked
        />
      </section>

      <section className="dashboard-screening-stats-grid">
        <ScreeningStatsCard label="Total screenings" value={mockScreeningStats.totalScreenings} icon="fact_check" />
        <ScreeningStatsCard label="Completed" value={mockScreeningStats.completed} icon="task_alt" />
        <ScreeningStatsCard label="Shortlisted" value={mockScreeningStats.shortlisted} icon="thumb_up" />
        <ScreeningStatsCard label="Avg score" value={mockScreeningStats.avgScore} icon="analytics" />
      </section>

      <section>
        <h2 className="dashboard-screening-subsection-title">Recent screenings</h2>
        {mockScreenings.length === 0 ? (
          <div className="dashboard-screening-empty-state">
            <MaterialIcon name="inbox" />
            <p>No screenings yet.</p>
          </div>
        ) : (
          <div className="dashboard-screening-table-wrap">
            <table className="dashboard-screening-table">
              <thead>
                <tr>
                  <th>Screening</th>
                  <th>Type</th>
                  <th>Candidates</th>
                  <th>Completed</th>
                  <th>Shortlisted</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mockScreenings.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.type === "voice" ? "Voice" : "Video"}</td>
                    <td>{row.candidates}</td>
                    <td>{row.completed}</td>
                    <td>{row.shortlisted}</td>
                    <td>
                      <span className={`dashboard-screening-table-status dashboard-screening-table-status--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.createdDate}</td>
                    <td>
                      <button
                        type="button"
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                        onClick={() => onViewScreening(row.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
