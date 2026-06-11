import Link from "next/link";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { SolutionIntroSection } from "@/components/landing/SolutionIntroSection";
import type { SolutionPageData } from "@/lib/solutionPages";
import { listSolutionPages } from "@/lib/solutionPages";

type Props = {
  page: SolutionPageData;
};

export function SolutionPageContent({ page }: Props) {
  const related = listSolutionPages().filter((item) => item.id !== page.id).slice(0, 3);

  return (
    <>
      <SolutionIntroSection page={page} />

      <section className="px-4 py-16 md:px-8 md:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              Pain points
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#141b2b] md:text-3xl">
              Challenges we solve
            </h2>
            <p className="mt-3 text-base text-[#434654]">
              What slows teams down today — and where Huntlo removes friction.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {page.challenges.map((item) => (
              <div
                key={item}
                className="flex gap-4 rounded-2xl border border-[#c3c6d6]/40 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7ed] text-[#c2410c]">
                  <MaterialIcon name="report" className="text-[22px]" />
                </div>
                <p className="text-sm leading-relaxed text-[#434654] md:text-base">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#c3c6d6]/20 bg-[#faf9ff] px-4 py-16 md:px-8 md:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              Platform
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#141b2b] md:text-3xl">
              How Huntlo helps
            </h2>
            <p className="mt-3 text-base text-[#434654]">
              Purpose-built workflows for sourcing, outreach, and hiring operations.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {page.capabilities.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#c3c6d6]/35 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9edff] text-[#0050cb]">
                  <MaterialIcon name="check_circle" className="text-[22px]" />
                </div>
                <p className="text-sm leading-relaxed text-[#434654] md:text-base">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 md:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              Outcomes
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#141b2b] md:text-3xl">
              What you can expect
            </h2>
            <p className="mt-3 text-base text-[#434654]">
              Measurable impact on speed, quality, and recruiter productivity.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {page.outcomes.map((item, index) => (
              <div
                key={item}
                className="flex gap-4 rounded-2xl border border-[#c3c6d6]/40 bg-white p-6 shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0050cb] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-[#434654] md:text-base">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-[#c3c6d6]/20 bg-[#faf9ff] px-4 py-16 md:px-8 md:py-20 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-[#141b2b] md:text-3xl">
                More solutions
              </h2>
              <p className="mt-2 text-[#434654]">Explore how Huntlo fits other hiring models.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group rounded-2xl border border-[#c3c6d6]/40 bg-white p-6 shadow-sm transition-all hover:border-[#0050cb]/35 hover:shadow-md"
                >
                  <h3 className="text-lg font-bold text-[#141b2b] transition-colors group-hover:text-[#0050cb]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#434654]">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0050cb]">
                    Learn more
                    <MaterialIcon name="arrow_forward" className="text-[18px]" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
