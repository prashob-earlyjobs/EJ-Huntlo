"use client";

function TableRowSkeleton({ index }: { index: number }) {
  const nameWidth = `${48 + (index % 4) * 8}%`;

  return (
    <tr aria-hidden>
      <td>
        <div className="dashboard-shimmer h-4 w-4 rounded-sm" />
      </td>
      <td>
        <div
          className="dashboard-shimmer h-4 rounded"
          style={{ width: nameWidth, maxWidth: "8.5rem" }}
        />
      </td>
      <td>
        <div className="dashboard-outreach-table-contact">
          <div className="dashboard-shimmer h-3 w-36 max-w-full rounded" />
          <div className="dashboard-shimmer mt-1.5 h-3 w-24 rounded" />
        </div>
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-28 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-16 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-10 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-9 rounded" />
      </td>
      <td>
        <div className="dashboard-shimmer h-4 w-20 rounded" />
      </td>
    </tr>
  );
}

type Props = {
  rowCount?: number;
};

export function CandidateSelectionTableSkeleton({ rowCount = 6 }: Props) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, idx) => (
        <TableRowSkeleton key={`candidate-select-row-skel-${idx}`} index={idx} />
      ))}
    </>
  );
}
