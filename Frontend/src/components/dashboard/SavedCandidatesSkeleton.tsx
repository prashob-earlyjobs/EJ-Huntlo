"use client";

export function SavedCandidatesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="dashboard-results-grid dashboard-results-grid--saved mt-6"
      aria-busy="true"
      aria-label="Loading saved candidates"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`saved-skeleton-${idx}`}
          className="dashboard-candidate-card dashboard-candidate-card--compact dashboard-candidate-card--static"
        >
          <div className="flex items-start gap-3">
            <div className="dashboard-shimmer h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="dashboard-shimmer h-3.5 w-[72%] max-w-40 rounded" />
              <div className="dashboard-shimmer h-3 w-[55%] max-w-32 rounded" />
            </div>
            <div className="dashboard-shimmer h-5 w-10 shrink-0 rounded-full" />
          </div>

          <div className="dashboard-shimmer mt-2 h-3 w-36 max-w-[85%] rounded" />

          <div className="mt-2.5 flex gap-1.5">
            <div className="dashboard-shimmer h-5 w-16 rounded-full" />
            <div className="dashboard-shimmer h-5 w-20 rounded-full" />
          </div>

          <div className="dashboard-candidate-actions dashboard-candidate-actions--compact">
            <div className="dashboard-saved-card-footer">
              <div className="dashboard-shimmer h-8 min-w-0 flex-1 max-w-[9.5rem] rounded-md" />
              <div className="dashboard-saved-card-actions">
                <div className="dashboard-shimmer h-7 w-7 rounded-md" />
                <div className="dashboard-shimmer h-7 w-7 rounded-md" />
                <div className="dashboard-shimmer h-7 w-7 rounded-md" />
                <div className="dashboard-shimmer h-7 w-7 rounded-md" />
                <div className="dashboard-shimmer h-7 w-7 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
