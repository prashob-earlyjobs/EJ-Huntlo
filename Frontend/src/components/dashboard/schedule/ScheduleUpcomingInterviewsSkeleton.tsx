"use client";

function TableRowSkeleton({ index }: { index: number }) {
  const nameWidth = `${48 + (index % 4) * 8}%`;

  return (
    <tr aria-hidden>
      <td>
        <div className="dashboard-shimmer h-4 rounded" style={{ width: nameWidth, maxWidth: "9rem" }} />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-24 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-20 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-28 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-36 max-w-full rounded" />
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

export function ScheduleUpcomingInterviewsSkeleton({ rowCount = 5 }: Props) {
  const headers = ["Candidate", "Role", "Source", "Meeting", "Date & time", "Status", ""];

  return (
    <div
      className="dashboard-schedule-table-wrap dashboard-schedule-table-wrap--skeleton"
      aria-busy="true"
      aria-label="Loading upcoming interviews"
    >
      <table className="dashboard-schedule-table">
        <thead>
          <tr>
            {headers.map((label, idx) => (
              <th key={`schedule-upcoming-th-skel-${idx}`} aria-hidden={!label}>
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
            <TableRowSkeleton key={`schedule-upcoming-row-skel-${idx}`} index={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
