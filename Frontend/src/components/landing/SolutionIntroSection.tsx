import Link from "next/link";

import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { SolutionPageData } from "@/lib/solutionPages";

const HIGHLIGHT_ICONS = [
  "travel_explore",
  "campaign",
  "groups",
  "insights",
] as const;

type Props = {
  page: SolutionPageData;
};

export function SolutionIntroSection({ page }: Props) {
  const segmentLabel = page.title.replace(/^For /, "");

  return (
    <section className="relative overflow-x-clip border-b border-[#c3c6d6]/20 bg-white px-4 py-16 md:px-8 md:py-20 lg:px-12">
      <div className="pointer-events-none absolute right-0 top-0 h-[320px] w-[min(480px,70vw)] rounded-full bg-[#dae1ff]/40 blur-[80px]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              Built for {segmentLabel}
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-[#141b2b] md:text-3xl lg:text-[2rem]">
              {page.overviewTitle}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#434654] md:text-lg">
              {page.intro}
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {page.highlights.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-[#c3c6d6]/35 bg-[#faf9ff] p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e9edff] text-[#0050cb]">
                    <MaterialIcon
                      name={HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length]}
                      className="text-[20px]"
                    />
                  </div>
                  <span className="text-sm leading-snug text-[#434654] md:text-[0.9375rem]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-[#0050cb] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#0050cb]/20 transition-colors hover:bg-[#003fa4]"
              >
                Start Free Trial
              </Link>
              <BookDemoLink className="inline-flex items-center justify-center rounded-full border border-[#c3c6d6]/50 bg-white px-6 py-3 text-sm font-semibold text-[#141b2b] transition-colors hover:border-[#0050cb]/30 hover:bg-[#f1f3ff]">
                Book Demo
              </BookDemoLink>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {page.metrics.map((metric, index) => {
                const isAccent = index === 1;
                return (
                  <div
                    key={metric.label}
                    className={`rounded-2xl p-4 text-center ${
                      isAccent
                        ? "bg-[#0050cb] text-white shadow-lg shadow-[#0050cb]/20"
                        : "border border-[#c3c6d6]/40 bg-[#faf9ff]"
                    }`}
                  >
                    <p
                      className={`text-2xl font-bold md:text-3xl ${
                        isAccent ? "text-white" : "text-[#0050cb]"
                      }`}
                    >
                      {metric.value}
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium leading-snug ${
                        isAccent ? "text-white/85" : "text-[#434654]"
                      }`}
                    >
                      {metric.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#c3c6d6]/40 bg-[#f1f3ff]/50 p-6 shadow-sm md:p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
                How it works
              </p>
              <h3 className="mt-2 text-lg font-bold text-[#141b2b]">
                Your hiring workflow, simplified
              </h3>
              <ol className="mt-6 space-y-0">
                {page.workflowSteps.map((step, index) => (
                  <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < page.workflowSteps.length - 1 ? (
                      <span
                        className="absolute left-[15px] top-9 h-[calc(100%-1.25rem)] w-px bg-[#c3c6d6]/60"
                        aria-hidden
                      />
                    ) : null}
                    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0050cb] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-semibold text-[#141b2b]">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#434654]">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#c3c6d6]/30 bg-white px-5 py-4">
              <div className="flex -space-x-2">
                {["S", "A", "R"].map((initial) => (
                  <span
                    key={initial}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#e9edff] text-xs font-bold text-[#0050cb]"
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <p className="text-sm text-[#434654]">
                <span className="font-semibold text-[#141b2b]">200+ recruiting teams</span>{" "}
                use Huntlo for outbound hiring
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
