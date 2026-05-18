"use client";

export function SessionResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="dashboard-results-grid mt-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`session-skeleton-${idx}`}
          className="dashboard-candidate-card dashboard-candidate-card--static"
        >
          <div className="flex items-start gap-3">
            <div className="dashboard-shimmer h-14 w-14 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="dashboard-shimmer h-4 w-40" />
              <div className="dashboard-shimmer h-3 w-28" />
            </div>
            <div className="dashboard-shimmer h-6 w-12 rounded-full" />
          </div>
          <div className="dashboard-shimmer mt-3 h-3 w-36" />
          <div className="mt-3 flex gap-1.5">
            <div className="dashboard-shimmer h-6 w-20 rounded-full" />
            <div className="dashboard-shimmer h-6 w-24 rounded-full" />
          </div>
          <div className="dashboard-shimmer mt-4 h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
