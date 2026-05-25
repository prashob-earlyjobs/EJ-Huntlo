"use client";

export function CampaignContactsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul
      className="dashboard-campaign-emails-list"
      aria-busy="true"
      aria-label="Loading contacts"
    >
      {Array.from({ length: rows }).map((_, idx) => (
        <li key={`contact-skeleton-${idx}`} className="dashboard-campaign-emails-row">
          <div className="dashboard-shimmer dashboard-campaign-emails-avatar h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <div
              className="dashboard-shimmer h-4 rounded"
              style={{ width: `${45 + (idx % 4) * 10}%`, maxWidth: "12rem" }}
            />
            <div className="dashboard-shimmer h-3 w-32 max-w-[85%] rounded" />
            <div className="dashboard-shimmer h-3 w-48 max-w-full rounded" />
          </div>
          <div className="dashboard-shimmer hidden h-3 w-16 shrink-0 rounded sm:block" />
        </li>
      ))}
    </ul>
  );
}
