"use client";

import { ScreeningTypeCard } from "@/components/dashboard/screening/ScreeningTypeCard";
import type { ScreeningRow } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";

const RECENT_TABLE_COLUMNS = 8;

function RecentScreeningsSkeleton({ rowCount = 4 }: { rowCount?: number }) {
  return (
    <div
      className="dashboard-screening-table-wrap"
      aria-busy="true"
      aria-label="Loading screenings"
    >
      <table className="dashboard-screening-table">
        <thead>
          <tr>
            {Array.from({ length: RECENT_TABLE_COLUMNS }).map((_, idx) => (
              <th key={`recent-th-skel-${idx}`}>
                <div
                  className="dashboard-shimmer h-3 rounded"
                  style={{ width: `${2.5 + (idx % 4) * 0.75}rem` }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, idx) => (
            <tr key={`recent-row-skel-${idx}`} aria-hidden>
              <td>
                <div
                  className="dashboard-shimmer h-4 rounded"
                  style={{ width: `${55 + (idx % 3) * 12}%`, maxWidth: "12rem" }}
                />
              </td>
              <td>
                <div className="dashboard-shimmer h-4 w-12 rounded" />
              </td>
              <td>
                <div className="dashboard-shimmer h-4 w-8 rounded" />
              </td>
              <td>
                <div className="dashboard-shimmer h-4 w-8 rounded" />
              </td>
              <td>
                <div className="dashboard-shimmer h-4 w-8 rounded" />
              </td>
              <td>
                <div className="dashboard-shimmer h-5 w-16 rounded-full" />
              </td>
              <td>
                <div className="dashboard-shimmer h-4 w-20 rounded" />
              </td>
              <td>
                <div className="dashboard-shimmer h-7 w-14 rounded-full" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  screenings: ScreeningRow[];
  loading?: boolean;
  onNewScreening: () => void;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onViewScreening: (id: string) => void;
};

export function ScreeningLandingPage({
  screenings,
  loading = false,
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

      <section>
        <h2 className="dashboard-screening-subsection-title">Recent screenings</h2>
        {loading ? (
          <RecentScreeningsSkeleton />
        ) : screenings.length === 0 ? (
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
                {screenings.map((row) => (
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
