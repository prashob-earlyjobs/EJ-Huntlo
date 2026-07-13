"use client";

const TABLE_COLUMNS = 9;

function StatCardSkeleton() {
  return (
    <div className="dashboard-screening-stat-card pointer-events-none" aria-hidden>
      <div className="dashboard-shimmer h-6 w-6 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="dashboard-shimmer h-5 w-10 rounded" />
        <div className="dashboard-shimmer h-3 w-20 rounded" />
      </div>
    </div>
  );
}

function FunnelStageSkeleton({ showConnector }: { showConnector: boolean }) {
  return (
    <div className="dashboard-screening-funnel-step" aria-hidden>
      {showConnector ? (
        <div className="dashboard-screening-funnel-connector">
          <div className="dashboard-shimmer h-4 w-4 shrink-0 rounded" />
        </div>
      ) : null}
      <div className="dashboard-screening-funnel-card">
        <div className="dashboard-shimmer h-5 w-8 rounded" />
        <div className="dashboard-shimmer mt-1.5 h-3 w-16 rounded" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ index }: { index: number }) {
  const nameWidth = `${52 + (index % 3) * 10}%`;

  return (
    <tr aria-hidden>
      <td>
        <div className="dashboard-screening-table-candidate">
          <div className="dashboard-shimmer h-4 rounded" style={{ width: nameWidth, maxWidth: "10rem" }} />
          <div className="dashboard-shimmer mt-1.5 h-3 w-24 rounded" />
        </div>
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-12 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-5 w-20 rounded-full" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-10 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-5 w-24 rounded-full" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-28 max-w-full rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-24 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-20 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-7 w-14 rounded-full" />
      </td>
    </tr>
  );
}

type Props = {
  rowCount?: number;
};

export function ScreeningResultsSkeleton({ rowCount = 5 }: Props) {
  return (
    <div
      className="dashboard-screening-results dashboard-screening-results-skeleton"
      aria-busy="true"
      aria-label="Loading screening results"
    >
      <header className="dashboard-screening-results-header">
        <div className="dashboard-shimmer h-4 w-32 rounded" aria-hidden />
        <div className="dashboard-screening-results-title-row">
          <div>
            <div className="dashboard-shimmer h-7 w-56 max-w-full rounded" aria-hidden />
            <div className="dashboard-screening-results-meta">
              <div className="dashboard-shimmer h-5 w-14 rounded-full" aria-hidden />
              <div className="dashboard-shimmer h-5 w-16 rounded-full" aria-hidden />
            </div>
          </div>
          <div className="dashboard-screening-results-actions">
            <div className="dashboard-shimmer h-9 w-32 rounded-full" aria-hidden />
            <div className="dashboard-shimmer h-9 w-28 rounded-full" aria-hidden />
          </div>
        </div>
      </header>

      <section
        className="dashboard-screening-stats-grid dashboard-screening-stats-grid--dense"
        aria-hidden
      >
        {Array.from({ length: 7 }).map((_, idx) => (
          <StatCardSkeleton key={`screening-stat-skel-${idx}`} />
        ))}
      </section>

      <section className="dashboard-screening-funnel" aria-hidden>
        <div className="dashboard-shimmer h-5 w-36 rounded" />
        <div className="dashboard-screening-funnel-track">
          {Array.from({ length: 4 }).map((_, idx) => (
            <FunnelStageSkeleton key={`screening-funnel-skel-${idx}`} showConnector={idx > 0} />
          ))}
        </div>
      </section>

      <section aria-hidden>
        <div className="dashboard-shimmer mb-3 h-5 w-40 rounded" />
        <div className="dashboard-screening-table-wrap">
          <table className="dashboard-screening-table">
            <thead>
              <tr>
                {Array.from({ length: TABLE_COLUMNS }).map((_, idx) => (
                  <th key={`screening-th-skel-${idx}`}>
                    <div
                      className="dashboard-shimmer h-3 rounded"
                      style={{ width: `${2.5 + (idx % 4) * 0.5}rem` }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, idx) => (
                <TableRowSkeleton key={`screening-row-skel-${idx}`} index={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
