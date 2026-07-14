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
        <div className="dashboard-shimmer h-4 w-28 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-32 max-w-full rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-16 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-20 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-5 w-20 rounded-full" />
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

export function InterviewCalendarTableSkeleton({ rowCount = 6 }: Props) {
  return (
    <div
      className="dashboard-schedule-table-wrap dashboard-schedule-table-wrap--skeleton"
      aria-busy="true"
      aria-label="Loading interviews"
    >
      <table className="dashboard-schedule-table">
        <thead>
          <tr>
            {["Candidate", "Role", "Date & time", "Meeting", "Source", "Host", "Status", ""].map(
              (label, idx) => (
                <th key={`schedule-th-skel-${idx}`} aria-hidden={!label}>
                  {label ? (
                    <span className="dashboard-schedule-table-th-label">{label}</span>
                  ) : (
                    <span className="dashboard-shimmer dashboard-schedule-table-th-shimmer" />
                  )}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, idx) => (
            <TableRowSkeleton key={`schedule-row-skel-${idx}`} index={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
