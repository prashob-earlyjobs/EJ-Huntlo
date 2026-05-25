"use client";

export function CampaignWorkspaceSkeleton() {
  return (
    <section
      className="dashboard-campaign-workspace flex h-full min-h-0 min-w-0 w-full flex-col"
      aria-busy="true"
      aria-label="Loading campaign"
    >
      <header className="dashboard-campaign-workspace-header shrink-0">
        <div className="dashboard-campaign-workspace-title-row">
          <div className="dashboard-shimmer h-9 w-9 shrink-0 rounded-lg" />
          <div className="dashboard-shimmer h-7 min-w-0 flex-1 max-w-xs rounded" />
          <div className="dashboard-shimmer h-8 w-8 shrink-0 rounded-full" />
        </div>
        <div className="dashboard-campaign-workspace-tabs mt-3 flex gap-4 border-b border-white/20 pb-2">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={`campaign-tab-skeleton-${idx}`}
              className="dashboard-shimmer h-4 rounded"
              style={{ width: `${3.5 + (idx % 2) * 0.75}rem` }}
            />
          ))}
        </div>
      </header>
      <div className="dashboard-campaign-workspace-body flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="dashboard-shimmer h-32 w-full max-w-2xl rounded-xl" />
        <div className="dashboard-shimmer h-4 w-full max-w-lg rounded" />
        <div className="dashboard-shimmer h-4 w-[85%] max-w-md rounded" />
        <div className="dashboard-shimmer h-4 w-[70%] max-w-sm rounded" />
      </div>
    </section>
  );
}
