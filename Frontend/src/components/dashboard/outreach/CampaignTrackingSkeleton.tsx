"use client";

const TABLE_COLUMNS = 9;

function StatCardSkeleton() {
  return (
    <div className="dashboard-outreach-stat-card dashboard-shimmer-block" aria-hidden>
      <div className="dashboard-shimmer h-6 w-6 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="dashboard-shimmer h-5 w-10 rounded" />
        <div className="dashboard-shimmer h-3 w-20 rounded" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ index }: { index: number }) {
  const nameWidth = `${52 + (index % 3) * 10}%`;

  return (
    <tr aria-hidden>
      <td>
        <div className="dashboard-outreach-table-candidate">
          <div className="dashboard-shimmer h-4 rounded" style={{ width: nameWidth, maxWidth: "10rem" }} />
          <div className="dashboard-shimmer mt-1.5 h-3 w-24 rounded" />
        </div>
      </td>
      <td>
        <div className="dashboard-outreach-table-contact">
          <div className="dashboard-shimmer h-3 w-28 rounded" />
          <div className="dashboard-shimmer mt-1 h-3 w-20 rounded" />
        </div>
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-12 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-16 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-5 w-20 rounded-full" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-10 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-32 max-w-full rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-24 rounded" />
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

export function CampaignTrackingSkeleton({ rowCount = 5 }: Props) {
  return (
    <div
      className="dashboard-outreach-tracking dashboard-outreach-tracking-skeleton"
      aria-busy="true"
      aria-label="Loading campaign tracking"
    >
      <header className="dashboard-outreach-tracking-header">
        <div className="dashboard-shimmer h-8 w-36 rounded-full" aria-hidden />
        <div className="dashboard-outreach-tracking-title-row">
          <div>
            <div className="dashboard-shimmer h-7 w-56 max-w-full rounded" aria-hidden />
            <div className="dashboard-outreach-tracking-meta">
              <div className="dashboard-shimmer h-5 w-14 rounded-full" aria-hidden />
              <div className="dashboard-shimmer h-4 w-24 rounded" aria-hidden />
              <div className="dashboard-shimmer h-4 w-28 rounded" aria-hidden />
            </div>
          </div>
          <div className="dashboard-outreach-tracking-actions">
            <div className="dashboard-shimmer h-9 w-32 rounded-full" aria-hidden />
            <div className="dashboard-shimmer h-9 w-20 rounded-full" aria-hidden />
          </div>
        </div>
      </header>

      <section
        className="dashboard-outreach-stats-grid dashboard-outreach-stats-grid--dense"
        aria-hidden
      >
        {Array.from({ length: 7 }).map((_, idx) => (
          <StatCardSkeleton key={`tracking-stat-skel-${idx}`} />
        ))}
      </section>

      <section className="dashboard-outreach-tracking-table-section">
        <div className="dashboard-outreach-tracking-section-head">
          <div className="dashboard-shimmer h-5 w-28 rounded" aria-hidden />
        </div>
        <div className="dashboard-outreach-table-wrap" aria-hidden>
          <table className="dashboard-outreach-table">
            <thead>
              <tr>
                {Array.from({ length: TABLE_COLUMNS }).map((_, idx) => (
                  <th key={`tracking-th-skel-${idx}`}>
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
                <TableRowSkeleton key={`tracking-row-skel-${idx}`} index={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
