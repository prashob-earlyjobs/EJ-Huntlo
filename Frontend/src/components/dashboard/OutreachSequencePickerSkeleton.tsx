"use client";

function TemplateRowSkeleton() {
  return (
    <div
      className="dashboard-create-outreach-template-row pointer-events-none"
      aria-hidden
    >
      <div className="dashboard-shimmer dashboard-create-outreach-template-icon h-[2.75rem] w-[2.75rem] shrink-0 rounded-[0.5rem] border border-[#e8eaed]" />
      <div className="dashboard-create-outreach-template-text min-w-0 flex-1 space-y-1.5">
        <div className="dashboard-shimmer h-3.5 w-[55%] max-w-[10rem] rounded" />
        <div className="dashboard-shimmer h-3 w-[80%] max-w-[14rem] rounded" />
      </div>
      <div className="dashboard-shimmer h-4 w-4 shrink-0 rounded" />
    </div>
  );
}

export function OutreachSequencePickerSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="dashboard-create-outreach-templates"
      aria-busy="true"
      aria-label="Loading templates and outreaches"
    >
      <div className="dashboard-shimmer mx-1 mb-1 mt-1 h-2.5 w-12 rounded" />
      {Array.from({ length: rows }).map((_, idx) => (
        <TemplateRowSkeleton key={`outreach-template-skeleton-${idx}`} />
      ))}
      <div className="dashboard-shimmer mx-1 mb-1 mt-2 h-2.5 w-28 rounded" />
      {Array.from({ length: Math.max(2, rows - 2) }).map((_, idx) => (
        <TemplateRowSkeleton key={`outreach-plan-skeleton-${idx}`} />
      ))}
    </div>
  );
}
