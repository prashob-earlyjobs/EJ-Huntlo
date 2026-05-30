"use client";

export function CampaignsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading campaigns">
      <div className="dashboard-campaigns-summary">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={`summary-${idx}`} className="dashboard-campaigns-summary-card dashboard-shimmer-block" />
        ))}
      </div>
      <div className="dashboard-table-wrap dashboard-campaigns-table-scroll">
        <table className="dashboard-table dashboard-table--campaigns">
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col">Channel</th>
              <th scope="col">Contacts</th>
              <th scope="col">Status</th>
              <th scope="col" />
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
                  <div className="dashboard-shimmer h-5 w-24 rounded-full" />
                </td>
                <td>
                  <div className="dashboard-shimmer h-4 w-10 rounded" />
                </td>
                <td>
                  <div className="dashboard-shimmer h-6 w-16 rounded-full" />
                </td>
                <td>
                  <div className="dashboard-shimmer h-5 w-5 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
