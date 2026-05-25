"use client";

export function CampaignsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul
      className="flex flex-col gap-2 p-1"
      aria-busy="true"
      aria-label="Loading campaigns"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <li key={`campaign-skeleton-${idx}`}>
          <div className="flex w-full items-center gap-3 rounded-lg border border-[#e8eaed] bg-white px-4 py-3">
            <div className="dashboard-shimmer h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div
                className="dashboard-shimmer h-4 rounded"
                style={{ width: `${58 + (idx % 3) * 12}%`, maxWidth: "14rem" }}
              />
              <div className="dashboard-shimmer h-3 w-24 rounded" />
            </div>
            <div className="dashboard-shimmer h-5 w-5 shrink-0 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}
