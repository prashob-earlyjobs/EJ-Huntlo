"use client";

export function PlansPricingSkeleton() {
  return (
    <div className="dashboard-pricing-body" aria-busy="true" aria-label="Loading plans and pricing">
      <div className="dashboard-pricing-intro-skeleton dashboard-shimmer h-4 max-w-xl rounded" />
      <div className="dashboard-pricing-grid">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`pricing-skeleton-${idx}`}
            className="dashboard-pricing-card dashboard-pricing-card--static dashboard-shimmer-block dashboard-shimmer"
          />
        ))}
      </div>
      <div className="dashboard-pricing-util-skeleton">
        <div className="dashboard-shimmer h-4 w-40 rounded" />
        <div className="dashboard-pricing-meters-skeleton">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={`meter-skeleton-${idx}`} className="dashboard-shimmer h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
