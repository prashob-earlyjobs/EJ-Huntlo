import Link from "next/link";

import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { LandingBreadcrumb } from "@/components/landing/LandingBreadcrumb";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { listSolutionPages } from "@/lib/solutionPages";

const bookDemoClass =
  "flex w-full items-center justify-center rounded-full border border-[#c3c6d6]/50 bg-white px-8 py-3.5 text-sm font-semibold text-[#141b2b] transition-all hover:border-[#0050cb]/30 hover:bg-[#f1f3ff] sm:w-auto";

const HERO_PILLS = [
  "Staffing & search firms",
  "Startups & enterprises",
  "GCC high-volume hiring",
  "AI sourcing + outreach",
];

const PREVIEW_ITEMS = [
  { icon: "travel_explore", text: "AI candidate discovery across every hiring model" },
  { icon: "campaign", text: "Email and WhatsApp sequences with automated follow-ups" },
  { icon: "insights", text: "Campaign visibility, replies, and pipeline in one view" },
];

type Props = {
  breadcrumbItems?: { label: string; href?: string }[];
};

export function SolutionsIndexHero({ breadcrumbItems }: Props) {
  const segmentCount = listSolutionPages().length;

  return (
    <section className="relative overflow-x-clip border-b border-[#c3c6d6]/25 bg-[#faf9ff] px-4 pb-16 pt-24 md:px-8 md:pb-24 md:pt-28 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[480px] w-[min(900px,100vw)] max-w-full -translate-x-1/2 rounded-full bg-[#dae1ff]/50 blur-[100px]" />
        <div className="absolute -left-20 top-40 h-[260px] w-[260px] rounded-full bg-[#c1cfff]/30 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {breadcrumbItems && breadcrumbItems.length > 0 ? (
          <LandingBreadcrumb items={breadcrumbItems} className="mb-8" />
        ) : null}

        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              Solutions
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-[#141b2b] md:text-4xl lg:text-5xl">
              Recruiting solutions for every hiring model
            </h1>
            <p className="mt-3 text-xl font-bold leading-snug text-[#0050cb] md:text-2xl">
              One platform for sourcing, outreach, and pipeline—no matter how you hire.
            </p>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#434654] md:text-lg">
              Huntlo adapts to staffing agencies, recruitment firms, executive search, startups,
              enterprise TA teams, and GCCs running high-volume programs. Replace fragmented tools
              with AI-powered discovery, multi-channel engagement, and campaign operations built for
              outbound recruiting.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#434654]/90">
              Pick the solution that matches your team—or explore how Huntlo unifies sourcing,
              WhatsApp and email outreach, contact reveal, and pipeline tracking across your entire
              hiring motion.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2">
              {HERO_PILLS.map((pill) => (
                <li
                  key={pill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#c3c6d6]/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#141b2b] shadow-sm md:text-sm"
                >
                  <MaterialIcon name="check_circle" className="text-[16px] text-[#0050cb]" filled />
                  {pill}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="flex w-full items-center justify-center rounded-full bg-[#0050cb] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/25 transition-all hover:bg-[#003fa4] sm:w-auto"
              >
                Start Free Trial
              </Link>
              <BookDemoLink className={bookDemoClass}>Book Demo</BookDemoLink>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#c3c6d6]/25 pt-6">
              <div className="flex -space-x-2">
                {["S", "A", "R", "M"].map((initial) => (
                  <span
                    key={initial}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#faf9ff] bg-[#e9edff] text-[10px] font-bold text-[#0050cb]"
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <p className="text-sm text-[#434654]">
                <span className="font-semibold text-[#141b2b]">200+ recruiting teams</span> across{" "}
                {segmentCount} solution tracks
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-3xl border border-dashed border-[#c3c6d6]/40" />
            <div className="relative rounded-3xl border border-[#c3c6d6]/40 bg-white p-6 shadow-[0_24px_48px_-20px_rgba(20,27,43,0.15)] md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9edff] text-[#0050cb]">
                    <MaterialIcon name="hub" className="text-[24px]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
                      Huntlo platform
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#141b2b]">
                      Outbound recruiting OS
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#e8f5e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2e7d32]">
                  All segments
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { value: "6", label: "Solution tracks" },
                  { value: "72%", label: "Avg. reply rate" },
                  { value: "3x", label: "Faster pipelines" },
                ].map((metric, index) => (
                  <div
                    key={metric.label}
                    className={`rounded-xl p-3 text-center ${
                      index === 1
                        ? "bg-[#0050cb] text-white"
                        : "bg-[#faf9ff] border border-[#c3c6d6]/30"
                    }`}
                  >
                    <p
                      className={`text-lg font-bold md:text-xl ${
                        index === 1 ? "text-white" : "text-[#0050cb]"
                      }`}
                    >
                      {metric.value}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-medium leading-tight ${
                        index === 1 ? "text-white/85" : "text-[#434654]"
                      }`}
                    >
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>

              <ul className="mt-6 space-y-3">
                {PREVIEW_ITEMS.map((item) => (
                  <li
                    key={item.text}
                    className="flex items-start gap-3 rounded-xl border border-[#c3c6d6]/25 bg-[#faf9ff] px-4 py-3"
                  >
                    <MaterialIcon
                      name={item.icon}
                      className="mt-0.5 shrink-0 text-[20px] text-[#0050cb]"
                    />
                    <span className="text-sm leading-snug text-[#434654]">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between rounded-xl bg-[#f1f3ff] px-4 py-3">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="category" className="text-[20px] text-[#0050cb]" />
                  <span className="text-sm font-semibold text-[#141b2b]">Segments covered</span>
                </div>
                <span className="text-sm font-bold text-[#0050cb]">{segmentCount} models</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
