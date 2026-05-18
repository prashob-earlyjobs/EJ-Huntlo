"use client";

export function DashboardOverviewSkeleton() {
  return (
    <div className="dashboard-overview-body" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-overview-stats">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`dash-stat-skel-${idx}`}
            className="dashboard-overview-stat-card dashboard-shimmer-block dashboard-shimmer"
          />
        ))}
      </div>
      <div className="dashboard-overview-grid">
        <div className="dashboard-overview-panel dashboard-shimmer-block dashboard-shimmer dashboard-overview-panel--tall" />
        <div className="dashboard-overview-panel dashboard-shimmer-block dashboard-shimmer dashboard-overview-panel--tall" />
      </div>
    </div>
  );
}
