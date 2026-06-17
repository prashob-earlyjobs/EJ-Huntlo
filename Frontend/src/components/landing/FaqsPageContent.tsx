"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { FAQ_SECTIONS, type FaqItem, type FaqSection } from "@/lib/faqsContent";

function faqMatchesQuery(item: FaqItem, query: string): boolean {
  const haystack = [
    item.question,
    item.answer,
    ...(item.bullets ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function FaqAnswer({ item }: { item: FaqItem }) {
  return (
    <div className="mt-3 text-sm leading-relaxed text-[#434654]">
      <p>{item.answer}</p>
      {item.bullets?.length ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FaqSectionBlock({ section }: { section: FaqSection }) {
  return (
    <section id={section.id} className="scroll-mt-28">
      <h2 className="text-2xl font-bold tracking-tight text-[#141b2b] md:text-[1.75rem]">
        {section.title}
      </h2>
      <div className="mt-6 space-y-3">
        {section.items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-[#c3c6d6]/30 bg-white p-5 shadow-sm open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-[#141b2b] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start gap-2">
                <MaterialIcon
                  name="quiz"
                  className="mt-0.5 shrink-0 text-[18px] text-[#0050cb]"
                />
                {item.question}
              </span>
              <MaterialIcon
                name="expand_more"
                className="shrink-0 text-[22px] text-[#434654] transition-transform group-open:rotate-180"
              />
            </summary>
            <FaqAnswer item={item} />
          </details>
        ))}
      </div>
    </section>
  );
}

export function FaqsPageContent() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => faqMatchesQuery(item, normalizedQuery)),
    })).filter((section) => section.items.length > 0);
  }, [normalizedQuery]);

  const resultCount = filteredSections.reduce(
    (count, section) => count + section.items.length,
    0
  );

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      <main>
        <section className="border-b border-[#c3c6d6]/25 bg-[#faf9ff] px-4 py-14 md:px-8 md:py-20 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              Support
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
              Agentic AI Recruiting FAQ — Everything About Huntlo&apos;s Hiring Infrastructure
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-[#434654] md:text-lg">
              Everything you need to know about Huntlo&apos;s agentic AI recruiting
              infrastructure — autonomous sourcing, outreach, screening, and hiring workflows.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#c3c6d6]/30 bg-white p-6 text-left shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-[#141b2b] md:text-2xl">
              Questions About Huntlo?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#434654] md:text-base">
              Learn how Huntlo helps recruiters, staffing agencies, startups, enterprises,
              and GCCs automate sourcing, outreach, screening, and hiring workflows using AI.
            </p>
            <p className="mt-2 text-sm text-[#434654]">
              Search through our most frequently asked questions below.
            </p>
            <label className="mt-5 block">
              <span className="sr-only">Search FAQs</span>
              <div className="relative">
                <MaterialIcon
                  name="search"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#434654]"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search questions about sourcing, outreach, screening..."
                  className="w-full rounded-full border border-[#c3c6d6]/40 bg-[#faf9ff] py-3 pl-12 pr-4 text-sm text-[#141b2b] outline-none transition-colors placeholder:text-[#434654]/70 focus:border-[#0050cb]/40 focus:bg-white"
                />
              </div>
            </label>
            {normalizedQuery ? (
              <p className="mt-3 text-xs text-[#434654]">
                {resultCount === 0
                  ? "No matching questions found."
                  : `${resultCount} matching question${resultCount === 1 ? "" : "s"} found.`}
              </p>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
            <aside className="hidden lg:block">
              <nav
                className="sticky top-28 space-y-1"
                aria-label="FAQ sections"
              >
                {FAQ_SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-lg px-3 py-2 text-sm text-[#434654] transition-colors hover:bg-[#f1f3ff] hover:text-[#0050cb]"
                  >
                    {section.navLabel}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="space-y-14">
              {filteredSections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#c3c6d6]/40 bg-[#faf9ff] p-10 text-center">
                  <MaterialIcon name="search_off" className="mx-auto text-3xl text-[#434654]" />
                  <p className="mt-3 text-sm text-[#434654]">
                    Try a different search term or browse all sections.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="mt-4 text-sm font-semibold text-[#0050cb] hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <FaqSectionBlock key={section.id} section={section} />
                ))
              )}
            </div>
          </div>
        </div>

        <section className="border-t border-[#c3c6d6]/25 bg-[#141b2b] px-4 py-16 md:px-8 md:py-20 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ready to Build a Faster Hiring Process?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/80">
              See how Huntlo helps recruiting teams automate sourcing, outreach, screening,
              and hiring workflows while improving recruiter productivity.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <BookDemoLink className="w-full rounded-full bg-[#0050cb] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/30 transition-colors hover:bg-[#003fa4] sm:w-auto">
                Book a Demo
              </BookDemoLink>
              <Link
                href="/signup"
                className="w-full rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 sm:w-auto"
              >
                Start Hiring with Huntlo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
