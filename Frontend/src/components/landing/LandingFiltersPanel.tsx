import { MaterialIcon } from "./MaterialIcon";

const FILTER_CHIPS = ["Skills", "Location", "Experience", "Company"] as const;

const SCORED = [
  { label: "Role fit", pct: 92 },
  { label: "Skills overlap", pct: 88 },
  { label: "Location match", pct: 95 },
] as const;

export function LandingFiltersPanel() {
  return (
    <div className="landing-sourcing-panel landing-filters-panel landing-ambient-shadow relative overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff]/50">
      <div className="landing-matching-decor" aria-hidden>
        <div className="landing-matching-orb landing-matching-orb--a" />
        <div className="landing-matching-grid" />
      </div>

      <div className="relative border-b border-[#c3c6d6]/20 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MaterialIcon name="filter_alt" className="text-lg text-[#0050cb]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[#434654]">
              Smart filters
            </p>
          </div>
          <span className="rounded-full bg-[#0050cb]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0050cb]">
            Live scoring
          </span>
        </div>
      </div>

      <div className="relative space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip, i) => (
            <span
              key={chip}
              className={`landing-filters-chip rounded-full px-3 py-1 text-xs font-medium ${
                i === 0
                  ? "bg-[#0050cb] text-white"
                  : "bg-white text-[#434654] ring-1 ring-[#c3c6d6]/40"
              }`}
              style={{ animationDelay: `${0.08 + i * 0.08}s` }}
            >
              {chip}
            </span>
          ))}
        </div>

        {SCORED.map((row, i) => (
          <div
            key={row.label}
            className="landing-filters-score-row rounded-xl border border-[#c3c6d6]/25 bg-white/80 px-3 py-2.5"
            style={{ animationDelay: `${0.2 + i * 0.12}s` }}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#434654]">{row.label}</span>
              <span className="font-semibold tabular-nums text-[#0050cb]">{row.pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0050cb]/10">
              <div
                className="landing-filters-bar-fill h-full rounded-full bg-[#0050cb]"
                style={{ ["--filter-pct" as string]: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-between gap-2 border-t border-[#c3c6d6]/20 bg-white/85 px-4 py-2.5 backdrop-blur-sm">
        <span className="text-[10px] font-medium text-[#434654]">Ranked by match score</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#0050cb]">
          <MaterialIcon name="tune" className="text-sm" />
          12 filters applied
        </span>
      </div>
    </div>
  );
}
