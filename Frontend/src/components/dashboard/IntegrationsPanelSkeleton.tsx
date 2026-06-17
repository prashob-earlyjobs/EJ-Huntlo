"use client";

export function IntegrationsPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading integrations">
      <div className="dashboard-integration-connect-section">
        <div className="dashboard-shimmer mb-3 h-3 w-36 rounded" />
        <div className="dashboard-integration-grid dashboard-integration-grid--connect">
          {[0, 1].map((idx) => (
            <div
              key={`integration-card-skeleton-${idx}`}
              className="dashboard-integration-card dashboard-integration-card--compact flex flex-col"
            >
              <div className="dashboard-integration-card-top">
                <div className="dashboard-shimmer h-11 w-11 shrink-0 rounded-xl" />
                <div className="dashboard-shimmer h-6 w-24 rounded-full" />
              </div>
              <div className="dashboard-shimmer mt-3 h-4 w-20 rounded" />
              <div className="dashboard-shimmer mt-2 h-3 w-full max-w-[16rem] rounded" />
              <div className="dashboard-shimmer mt-1.5 h-3 w-12 rounded" />
              <div className="dashboard-shimmer mt-auto h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-integration-summary space-y-2">
        <div className="dashboard-shimmer h-4 w-40 rounded" />
        <div className="dashboard-shimmer h-3 w-full max-w-md rounded" />
      </div>

      <div>
        <div className="dashboard-shimmer mb-3 h-3 w-32 rounded" />
        <div className="dashboard-thin-scrollbar dashboard-campaigns-table-scroll mt-3">
          <div className="dashboard-table-wrap dashboard-table-wrap--scroll-x">
          <div className="space-y-2 p-1">
            {[0, 1, 2].map((idx) => (
              <div
                key={`integration-row-skeleton-${idx}`}
                className="flex items-center gap-4 rounded-lg border border-[#e8eaed] bg-white px-4 py-3"
              >
                <div className="dashboard-shimmer h-8 w-8 shrink-0 rounded" />
                <div className="dashboard-shimmer h-4 min-w-0 flex-1 max-w-[6rem] rounded" />
                <div className="dashboard-shimmer hidden h-4 w-16 rounded sm:block" />
                <div className="dashboard-shimmer hidden h-4 w-24 rounded md:block" />
                <div className="dashboard-shimmer hidden h-4 w-32 rounded lg:block" />
                <div className="dashboard-shimmer h-6 w-20 shrink-0 rounded-full" />
                <div className="dashboard-shimmer ml-auto h-9 w-[17.5rem] shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
