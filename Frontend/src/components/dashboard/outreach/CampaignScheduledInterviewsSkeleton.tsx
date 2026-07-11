"use client";

function TableRowSkeleton({ index }: { index: number }) {
  const nameWidth = `${52 + (index % 3) * 10}%`;

  return (
    <tr aria-hidden>
      <td>
        <div className="dashboard-shimmer h-4 rounded" style={{ width: nameWidth, maxWidth: "9rem" }} />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-36 max-w-full rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-28 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-40 max-w-full rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-5 w-20 rounded-full" />
      </td>
      <td>
        <div className="dashboard-shimmer h-7 w-14 rounded-md" />
      </td>
    </tr>
  );
}

type Props = {
  rowCount?: number;
};

export function CampaignScheduledInterviewsSkeleton({ rowCount = 4 }: Props) {
  const headers = ["Candidate", "Email", "Meeting", "Date & time", "Status", ""];

  return (
    <div
      className="dashboard-schedule-table-wrap dashboard-schedule-table-wrap--skeleton"
      aria-busy="true"
      aria-label="Loading scheduled interviews"
    >
      <table className="dashboard-schedule-table">
        <thead>
          <tr>
            {headers.map((label, idx) => (
              <th key={`campaign-interviews-th-skel-${idx}`} aria-hidden={!label}>
                {label ? (
                  <span className="dashboard-schedule-table-th-label">{label}</span>
                ) : (
                  <span className="dashboard-shimmer dashboard-schedule-table-th-shimmer" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, idx) => (
            <TableRowSkeleton key={`campaign-interviews-row-skel-${idx}`} index={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
