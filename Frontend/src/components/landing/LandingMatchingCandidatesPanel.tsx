import { MaterialIcon } from "./MaterialIcon";

const MOCK_CANDIDATES = [
  { name: "Priya Sharma", role: "Senior React Engineer", location: "Bangalore", score: 94 },
  { name: "James Chen", role: "Staff Frontend Dev", location: "San Francisco", score: 91 },
  { name: "Anika Patel", role: "Full Stack Engineer", location: "Remote", score: 88 },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

function CandidateRow({
  name,
  role,
  location,
  score,
  index,
}: {
  name: string;
  role: string;
  location: string;
  score: number;
  index: number;
}) {
  const delay = `${0.12 + index * 0.14}s`;

  return (
    <div
      className="landing-matching-row"
      style={{ animationDelay: delay, ["--match-pct" as string]: `${score}%` }}
    >
      <div className="landing-matching-avatar">
        <span className="landing-matching-avatar-ring" aria-hidden />
        <span className="landing-matching-avatar-inner">{initials(name)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#141b2b]">{name}</p>
        <p className="truncate text-xs text-[#434654]">
          {role} · {location}
        </p>
        <div className="landing-matching-bar mt-2 h-1 overflow-hidden rounded-full bg-[#0050cb]/10">
          <div
            className="landing-matching-bar-fill h-full rounded-full bg-gradient-to-r from-[#0050cb] to-[#3d7cf5]"
            style={{ animationDelay: delay }}
          />
        </div>
      </div>
      <span className="landing-matching-score shrink-0" style={{ animationDelay: delay }}>
        {score}%
      </span>
      <span className="landing-matching-view hidden shrink-0 sm:inline-flex">View</span>
    </div>
  );
}

export function LandingMatchingCandidatesPanel() {
  return (
    <div className="landing-matching-panel landing-ambient-shadow relative overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff]/50">
      <div className="landing-matching-decor" aria-hidden>
        <div className="landing-matching-orb landing-matching-orb--a" />
        <div className="landing-matching-orb landing-matching-orb--b" />
        <svg className="landing-matching-lines" viewBox="0 0 400 280" fill="none">
          <path
            className="landing-matching-line landing-matching-line--1"
            d="M40 60 C120 40, 200 100, 280 70"
            stroke="url(#matchLineGrad)"
            strokeWidth="1.5"
          />
          <path
            className="landing-matching-line landing-matching-line--2"
            d="M60 200 C140 160, 220 220, 340 180"
            stroke="url(#matchLineGrad)"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient id="matchLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0050cb" stopOpacity="0" />
              <stop offset="50%" stopColor="#0050cb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0050cb" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="landing-matching-grid" />
        <div className="landing-matching-scanline" />
      </div>

      <div className="relative border-b border-[#c3c6d6]/20 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="landing-matching-live" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-[#434654]">
              Matching candidates
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[#0050cb]">
            <MaterialIcon
              name="auto_awesome"
              className="landing-matching-spark text-base"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              AI ranked
            </span>
          </div>
        </div>
        <p className="landing-matching-subline mt-1 text-[10px] font-medium text-[#434654]/70">
          <span className="landing-matching-count">3</span> profiles matched to your search
        </p>
      </div>

      <div className="relative divide-y divide-[#c3c6d6]/15 bg-white/75 backdrop-blur-[2px]">
        {MOCK_CANDIDATES.map((c, index) => (
          <CandidateRow key={c.name} {...c} index={index} />
        ))}
      </div>

      <div className="relative flex items-center justify-between gap-2 border-t border-[#c3c6d6]/20 bg-white/85 px-4 py-2.5 backdrop-blur-sm">
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#434654]">
          <MaterialIcon name="search" className="text-sm text-[#0050cb]" />
          Semantic match active
        </span>
        <span className="landing-matching-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}
