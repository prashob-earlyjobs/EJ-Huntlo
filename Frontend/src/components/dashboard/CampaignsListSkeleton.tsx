"use client";

const TABLE_HEADER_SHIMMERS = [
  "w-20",
  "w-14",
  "w-16",
  "w-24",
  "w-16",
  "w-20",
  "w-12",
  "w-5",
] as const;

export function CampaignsSummarySkeleton() {
  return (
    <div className="dashboard-campaigns-summary" aria-hidden>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={`summary-${idx}`} className="dashboard-campaigns-summary-card">
          <div className="dashboard-shimmer h-9 w-9 shrink-0 rounded-[0.625rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="dashboard-shimmer h-5 rounded"
              style={{ width: idx === 2 ? "3.5rem" : "2.25rem" }}
            />
            <div
              className="dashboard-shimmer h-3 rounded"
              style={{ width: idx === 0 ? "4.5rem" : idx === 1 ? "3rem" : "3.75rem" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CampaignsTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="dashboard-campaigns-table-shell" aria-hidden>
      <p className="dashboard-campaigns-table-scroll-hint" aria-hidden="true">
        Swipe sideways to see all columns
      </p>
      <div className="dashboard-thin-scrollbar dashboard-campaigns-table-scroll">
        <div className="dashboard-table-wrap dashboard-table-wrap--scroll-x">
          <table className="dashboard-table dashboard-table--campaigns">
            <thead>
              <tr>
                {TABLE_HEADER_SHIMMERS.map((widthClass, idx) => (
                  <th key={`th-skel-${idx}`} scope="col">
                    <div className={`dashboard-shimmer h-3 ${widthClass} rounded`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: count }).map((_, idx) => (
                <tr key={`campaign-skeleton-${idx}`}>
                  <td>
                    <div className="dashboard-campaigns-name-cell">
                      <div className="dashboard-shimmer dashboard-campaigns-avatar" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div
                          className="dashboard-shimmer h-4 rounded"
                          style={{ width: `${58 + (idx % 3) * 12}%`, maxWidth: "14rem" }}
                        />
                        <div className="dashboard-shimmer h-3 w-24 rounded" />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-5 w-16 rounded-full" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-4 w-10 rounded" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-4 w-20 rounded" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-4 w-8 rounded" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-4 w-14 rounded" />
                  </td>
                  <td>
                    <div className="dashboard-shimmer h-6 w-16 rounded-full" />
                  </td>
                  <td className="dashboard-campaigns-table-action-col">
                    <div className="dashboard-shimmer ml-auto h-5 w-5 rounded" />
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

export function CampaignsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="dashboard-campaigns-list-loading" aria-busy="true" aria-label="Loading campaigns">
      <CampaignsSummarySkeleton />
      <CampaignsTableSkeleton count={count} />
    </div>
  );
}
