"use client";

function QuotaMeterSkeleton() {
  return (
    <div className="dashboard-overview-quota">
      <div className="dashboard-overview-quota-head">
        <div className="dashboard-shimmer h-3.5 w-28 rounded" />
        <div className="dashboard-shimmer h-3.5 w-16 rounded" />
      </div>
      <div className="dashboard-overview-quota-track">
        <div className="dashboard-shimmer h-full w-[45%] rounded-full" />
      </div>
    </div>
  );
}

function PanelHeaderSkeleton() {
  return (
    <header className="dashboard-overview-panel-head">
      <div className="dashboard-shimmer h-4 w-32 rounded" />
      <div className="dashboard-shimmer h-3.5 w-20 rounded" />
    </header>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="dashboard-overview-body" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-overview-stats">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`dash-stat-skel-${idx}`}
            className="dashboard-overview-stat-card dashboard-shimmer-block dashboard-shimmer pointer-events-none"
            aria-hidden
          />
        ))}
      </div>

      <div className="dashboard-overview-actions">
        <div className="dashboard-shimmer h-3 w-28 rounded" />
        <div className="dashboard-overview-actions-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`dash-action-skel-${idx}`}
              className="dashboard-overview-action-card pointer-events-none"
            >
              <div className="dashboard-shimmer dashboard-overview-action-icon h-10 w-10 rounded-lg" />
              <div className="dashboard-shimmer mt-3 h-4 w-24 rounded" />
              <div className="dashboard-shimmer mt-2 h-3 w-full max-w-[8.5rem] rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-overview-grid">
        <div className="dashboard-overview-panel dashboard-overview-panel--tall">
          <PanelHeaderSkeleton />
          <div className="dashboard-overview-quota-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <QuotaMeterSkeleton key={`dash-quota-skel-${idx}`} />
            ))}
          </div>
        </div>

        <div className="dashboard-overview-panel dashboard-overview-panel--tall">
          <PanelHeaderSkeleton />
          <ul className="dashboard-overview-activity-list">
            {Array.from({ length: 5 }).map((_, idx) => (
              <li key={`dash-activity-skel-${idx}`} className="dashboard-overview-activity-item">
                <span className="min-w-0 flex-1 space-y-2">
                  <div className="dashboard-shimmer h-3.5 w-[70%] max-w-44 rounded" />
                  <div className="dashboard-shimmer h-3 w-24 rounded" />
                </span>
                <div className="dashboard-shimmer h-4 w-8 shrink-0 rounded" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dashboard-overview-panel">
        <PanelHeaderSkeleton />
        <div className="dashboard-table-wrap mt-1">
          <table className="dashboard-table">
            <thead>
              <tr>
                {["Search", "Candidates", "When"].map((col) => (
                  <th key={col}>
                    <div className="dashboard-shimmer h-3 w-16 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`dash-session-skel-${idx}`}>
                  <td>
                    <div className="dashboard-shimmer h-4 w-full max-w-xs rounded" />
                    <div className="dashboard-shimmer mt-1.5 h-3 w-32 rounded" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-4 w-10 rounded" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-3 w-20 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
