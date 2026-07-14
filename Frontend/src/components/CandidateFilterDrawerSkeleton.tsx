"use client";

function ShimmerBar({ className = "" }: { className?: string }) {
  return <div className={`dashboard-shimmer rounded ${className}`} />;
}

function FilterFieldShimmer({ wideHint = false }: { wideHint?: boolean }) {
  return (
    <div className="space-y-2">
      <ShimmerBar className={`h-3 ${wideHint ? "w-36" : "w-24"}`} />
      <ShimmerBar className="h-11 w-full rounded-xl" />
    </div>
  );
}

function FilterSectionShimmer({
  fields = 3,
  withRange = false,
}: {
  fields?: number;
  withRange?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <ShimmerBar className="h-3 w-20" />
      </div>
      <div className="space-y-4 px-4 py-4">
        {Array.from({ length: fields }).map((_, i) => (
          <FilterFieldShimmer key={i} wideHint={i % 2 === 0} />
        ))}
        {withRange ? (
          <div className="space-y-2">
            <ShimmerBar className="h-3 w-28" />
            <div className="flex items-center gap-2">
              <ShimmerBar className="h-9 w-24 rounded-lg" />
              <ShimmerBar className="h-2 w-4 rounded-full" />
              <ShimmerBar className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** High-quality shimmer placeholder while AI annotates / restores filter form. */
export function CandidateFilterDrawerSkeleton() {
  return (
    <div
      className="dashboard-filter-drawer-skeleton space-y-4"
      aria-busy="true"
      aria-live="polite"
      aria-label="Analyzing prompt and prefilling filters"
    >
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <ShimmerBar className="h-2.5 w-16" />
        <div className="mt-3 space-y-2">
          <ShimmerBar className="h-3.5 w-full max-w-[22rem]" />
          <ShimmerBar className="h-3.5 w-[80%] max-w-[18rem]" />
        </div>
      </section>

      <div className="rounded-xl border border-[#c2c6d8]/45 bg-[#f7f8fc] px-3.5 py-3">
        <div className="flex items-center gap-3">
          <ShimmerBar className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerBar className="h-3 w-48 max-w-full" />
            <ShimmerBar className="h-2.5 w-36 max-w-full" />
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-full bg-white/70">
          <div className="dashboard-filter-drawer-skeleton-progress h-1.5 w-2/3 rounded-full" />
        </div>
      </div>

      <FilterSectionShimmer fields={4} withRange />
      <FilterSectionShimmer fields={3} />
      <FilterSectionShimmer fields={2} />
      <FilterSectionShimmer fields={3} withRange />
      <FilterSectionShimmer fields={2} />
      <FilterSectionShimmer fields={1} />
    </div>
  );
}
