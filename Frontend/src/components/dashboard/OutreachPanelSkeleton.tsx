"use client";

export function OutreachPanelSkeleton() {
  return (
    <div
      className="dashboard-card-body-scroll dashboard-outreach-panel-body flex flex-1 flex-col gap-3 p-1"
      aria-busy="true"
      aria-label="Loading outreaches"
    >
      <div className="dashboard-shimmer h-16 w-full max-w-xl rounded-lg" />
      <div className="dashboard-shimmer h-4 w-full max-w-md rounded" />
      <div className="dashboard-shimmer h-4 w-[80%] max-w-sm rounded" />
    </div>
  );
}
