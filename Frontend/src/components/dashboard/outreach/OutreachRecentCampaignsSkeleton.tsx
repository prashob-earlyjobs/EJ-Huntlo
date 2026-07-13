"use client";

function TableRowSkeleton({ index }: { index: number }) {
  const nameWidth = `${48 + (index % 4) * 12}%`;

  return (
    <tr aria-hidden>
      <td>
        <div className="dashboard-outreach-table-campaign">
          <div
            className="dashboard-shimmer h-4 rounded"
            style={{ width: nameWidth, maxWidth: "11rem" }}
          />
        </div>
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-24 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-32 max-w-full rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-8 rounded" />
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
        <div className="dashboard-shimmer h-8 w-[4.5rem] rounded-full" />
      </td>
    </tr>
  );
}

type Props = {
  rowCount?: number;
};

export function OutreachRecentCampaignsSkeleton({ rowCount = 6 }: Props) {
  return (
    <div
      className="dashboard-outreach-recent-panel-skeleton"
      aria-busy="true"
      aria-label="Loading recent campaigns"
    >
      <div className="dashboard-outreach-table-wrap dashboard-outreach-table-wrap--skeleton">
        <table className="dashboard-outreach-table">
          <thead>
            <tr>
              {[
                "Campaign",
                "Mode",
                "Channels",
                "Candidates",
                "Status",
                "Response",
                "Created",
                "Actions",
              ].map((col) => (
                <th key={col}>
                  <div className="dashboard-shimmer h-3 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, idx) => (
              <TableRowSkeleton key={`outreach-recent-skel-${idx}`} index={idx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
