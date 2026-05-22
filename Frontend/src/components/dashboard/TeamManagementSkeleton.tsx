"use client";

export function TeamManagementSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading team">
      <section className="dashboard-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="dashboard-shimmer h-3 w-24 rounded" />
            <div className="dashboard-shimmer h-7 w-48 max-w-full rounded" />
            <div className="dashboard-shimmer h-4 w-full max-w-md rounded" />
            <div className="dashboard-shimmer h-4 w-[85%] max-w-sm rounded" />
          </div>
          <div className="dashboard-shimmer h-10 w-32 shrink-0 rounded-lg" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`team-stat-skel-${idx}`}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
            >
              <div className="dashboard-shimmer h-3 w-20 rounded" />
              <div className="dashboard-shimmer mt-2 h-5 w-24 rounded" />
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card p-6">
        <div className="dashboard-shimmer h-6 w-36 rounded" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {["Name", "Email", "Role", "Status", "Usage", "Actions"].map((col) => (
                  <th key={col} className="py-2 pr-4">
                    <div className="dashboard-shimmer h-3 w-14 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`team-row-skel-${idx}`} className="border-b border-slate-100">
                  <td className="py-3 pr-4">
                    <div className="dashboard-shimmer h-4 w-28 rounded" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="dashboard-shimmer h-4 w-40 rounded" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="dashboard-shimmer h-4 w-16 rounded" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="dashboard-shimmer h-4 w-14 rounded" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="dashboard-shimmer h-3 w-48 max-w-full rounded" />
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <div className="dashboard-shimmer h-9 w-28 rounded-lg" />
                      <div className="dashboard-shimmer h-9 w-16 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {["utilisation", "activity"].map((panel) => (
          <section key={panel} className="dashboard-card p-6">
            <div className="dashboard-shimmer h-6 w-40 rounded" />
            <ul className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <li
                  key={`team-${panel}-skel-${idx}`}
                  className="flex justify-between gap-2 border-b border-slate-100 pb-3"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="dashboard-shimmer h-4 w-[75%] max-w-xs rounded" />
                    <div className="dashboard-shimmer h-3 w-24 rounded" />
                  </div>
                  <div className="dashboard-shimmer h-3 w-28 shrink-0 rounded" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
