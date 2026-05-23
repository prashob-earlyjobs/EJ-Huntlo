import { MaterialIcon } from "./MaterialIcon";

export function LandingPeopleScoutPanel() {
  return (
    <div className="landing-sourcing-panel landing-scout-panel landing-ambient-shadow relative overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff]/50">
      <div className="landing-matching-decor" aria-hidden>
        <div className="landing-matching-orb landing-matching-orb--b" />
        <div className="landing-matching-grid" />
      </div>

      <div className="relative border-b border-[#c3c6d6]/20 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MaterialIcon name="person_search" className="text-lg text-[#0050cb]" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[#434654]">
            People Scout
          </p>
        </div>
        <div className="landing-scout-input mt-2 flex items-center gap-2 rounded-lg border border-[#c3c6d6]/35 bg-[#f8f9ff] px-3 py-2">
          <MaterialIcon name="mail" className="text-base text-[#434654]/60" />
          <span className="truncate text-xs text-[#434654]/80">james.chen@company.com</span>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div className="landing-scout-profile flex gap-3 rounded-xl border border-[#c3c6d6]/30 bg-white/90 p-3 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dae1ff] text-sm font-bold text-[#0050cb]">
            JC
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#141b2b]">James Chen</p>
            <p className="text-xs text-[#434654]">Staff Frontend Dev · San Francisco</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="landing-scout-pill rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200/80">
                Email verified
              </span>
              <span className="landing-scout-pill rounded-full bg-[#f1f3ff] px-2 py-0.5 text-[10px] font-medium text-[#0050cb] ring-1 ring-[#0050cb]/20">
                LinkedIn
              </span>
            </div>
          </div>
        </div>

        <div className="landing-scout-enrich mt-3 rounded-lg border border-dashed border-[#0050cb]/25 bg-[#0050cb]/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0050cb]">
            Enriched in 1.2s
          </p>
          <p className="mt-1 text-[10px] text-[#434654]">Mobile · Work history · Company</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-2 border-t border-[#c3c6d6]/20 bg-white/85 px-4 py-2.5 backdrop-blur-sm">
        <span className="text-[10px] font-medium text-[#434654]">Single-profile lookup</span>
        <span className="landing-matching-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}
