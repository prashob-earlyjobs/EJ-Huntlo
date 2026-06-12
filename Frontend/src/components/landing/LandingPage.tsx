import Link from "next/link";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

import { BookDemoLink } from "./BookDemoLink";
import { LandingHashScroll } from "./LandingHashScroll";
import { LandingProductSourcingSection } from "./LandingProductSourcingSection";
import { LandingWorkflowSteps } from "./LandingWorkflowSteps";
import { HeroSearchTyping } from "./HeroSearchTyping";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";
import { LandingHomeFaqSection } from "./LandingHomeFaqSection";
import { LandingPricingSection } from "./LandingPricingSection";
import { MaterialIcon } from "./MaterialIcon";

const ADVANTAGE_METRICS = [
  {
    variant: "dark" as const,
    stat: "72%",
    title: "Response Rate",
    description:
      "Our AI-powered outreach ensures your messages get seen and replied to.",
  },
  {
    variant: "light" as const,
    stat: "200+",
    title: "Teams",
    description: "From high-growth startups to enterprise leaders.",
  },
  {
    variant: "chart" as const,
    title: "Time to Hire",
    description: "Dramatically reduced hiring cycles.",
  },
  {
    variant: "blue" as const,
    stat: "30%",
    title: "Cost per hire reduction",
    description: "Stop wasting budget on job boards that don't deliver.",
  },
];

const SUITE_COLUMNS = [
  {
    title: "Source",
    icon: "travel_explore",
    description: "Discover high-intent talent faster.",
    items: [
      "AI-powered candidate discovery",
      "Deep profile enrichment and signals",
      "Unified sourcing workflows",
      "Natural-language talent search",
    ],
  },
  {
    title: "Engage",
    icon: "campaign",
    description: "Run recruiting workflows across every channel.",
    items: [
      "Email and WhatsApp automation",
      "AI-generated personalization",
      "Multi-touch outreach sequences",
      "Candidate engagement tracking",
    ],
  },
  {
    title: "Analyze",
    icon: "insights",
    description: "Optimize hiring with real operational insights.",
    items: [
      "Pipeline and reply analytics",
      "Conversion and performance tracking",
      "Recruiter productivity insights",
      "AI-powered hiring intelligence",
    ],
  },
];

const IMPACT_STATS = [
  { value: "10x", label: "Faster hire" },
  { value: "75%", label: "More candidates" },
  { value: "30%", label: "Lower cost" },
];

type LandingPageProps = {
  pricingPlans?: PricingPlansPayload | null;
};

const startTrialButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-full border border-[#c3c6d6]/50 bg-white px-8 py-3.5 text-sm font-semibold text-[#141b2b] transition-all hover:border-[#0050cb]/30 hover:bg-[#f1f3ff] sm:w-auto";

const bookDemoButtonClass =
  "w-full rounded-full bg-[#0050cb] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/25 transition-all hover:bg-[#003fa4] sm:w-auto";

export function LandingPage({ pricingPlans = null }: LandingPageProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingHashScroll />
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-x-clip px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16 lg:px-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[520px] w-[min(900px,100vw)] max-w-full -translate-x-1/2 rounded-full bg-[#dae1ff]/60 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-[#141b2b] md:text-5xl lg:text-[56px]">
            Stop Posting Jobs.
            <br />
            <span className="text-[#0050cb]">
              Start Getting Candidates Who Actually Reply.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#434654] md:text-lg">
            Huntlo helps recruiters source, engage, and schedule interviews with qualified
            candidates in days not weeks.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BookDemoLink className={bookDemoButtonClass}>Book Demo</BookDemoLink>
            <Link href="/signup" className={startTrialButtonClass}>
              Start Free Trial
            </Link>
          </div>

          <HeroSearchTyping />
        </div>
      </section>

      {/* Huntlo Advantage */}
      <section className="px-4 py-16 md:px-8 lg:px-12" id="solutions">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
              Why 200+ Recruiting Teams Run Their Hiring on Huntlo
            </h2>
            <p className="mt-2 text-[#434654]">
              Based on aggregate Huntlo customer data across 200+ recruiting teams, 2025.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGE_METRICS.map((card) => {
              if (card.variant === "chart") {
                return (
                  <div
                    key={card.title}
                    className="flex flex-col justify-between rounded-2xl border border-[#c3c6d6]/30 bg-white p-6"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-[#141b2b]">{card.title}</h3>
                      <p className="mt-1 text-sm text-[#434654]">{card.description}</p>
                    </div>
                    <div className="mt-6 flex h-24 items-end justify-center gap-2">
                      {[48, 72, 88, 96].map((h, i) => (
                        <div
                          key={i}
                          className="flex w-8 flex-col justify-end rounded-t-md bg-[#0050cb]/15"
                          style={{ height: `${h}px` }}
                        >
                          <div
                            className="w-full rounded-t-md bg-[#0050cb]"
                            style={{ height: `${Math.round(h * 0.72)}px` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              const isDark = card.variant === "dark";
              const isBlue = card.variant === "blue";
              return (
                <div
                  key={card.title}
                  className={`flex flex-col justify-between rounded-2xl p-6 ${
                    isDark
                      ? "bg-[#141b2b] text-white"
                      : isBlue
                        ? "bg-[#0050cb] text-white"
                        : "border border-[#c3c6d6]/30 bg-white"
                  }`}
                >
                  <div>
                    <p
                      className={`text-3xl font-bold md:text-4xl ${
                        isDark || isBlue ? "text-white" : "text-[#0050cb]"
                      }`}
                    >
                      {card.stat}
                    </p>
                    <h3
                      className={`mt-2 text-lg font-bold ${
                        isDark || isBlue ? "text-white" : "text-[#141b2b]"
                      }`}
                    >
                      {card.title}
                    </h3>
                  </div>
                  <p
                    className={`mt-4 text-sm leading-relaxed ${
                      isDark || isBlue ? "text-white/80" : "text-[#434654]"
                    }`}
                  >
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <LandingProductSourcingSection />

      {/* Workflow */}
      <section className="bg-[#faf9ff] px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            From First Sourcing Signal to Scheduled Interview — Without the Manual Work
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-[#434654]">
            The 4-step agentic AI workflow that powers high-growth hiring teams.
          </p>
          <LandingWorkflowSteps />
        </div>
      </section>

      {/* Bento — high volume hiring */}
      <section className="scroll-mt-24 px-4 py-20 md:px-8 lg:px-12" id="resources">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Built for Staffing Agencies, Enterprises, GCCs &amp; High-Growth Teams
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff] p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0050cb]/10 text-[#0050cb]">
                <MaterialIcon name="manage_search" />
              </div>
              <h3 className="text-xl font-bold text-[#141b2b]">Candidate Search</h3>
              <p className="mt-2 text-sm text-[#434654]">
                Natural-language sourcing with AI filters, session results, and a unified candidate
                pool.
              </p>
              <div className="mt-6 overflow-hidden rounded-xl border border-[#c3c6d6]/25 bg-white shadow-sm">
                <video
                  className="aspect-video w-full object-cover object-center"
                  src="/vi%202.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Candidate search demo"
                />
              </div>
            </div>
            <div className="rounded-2xl bg-[#0050cb] p-8 text-white">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <MaterialIcon name="campaign" />
              </div>
              <h3 className="text-xl font-bold">Autonomous Outreach Across Email &amp; WhatsApp</h3>
              <p className="mt-2 text-sm text-white/85">
                Agentic outreach sequences that feel personal — no manual follow-up required.
              </p>
              <div className="mt-6 overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm">
                <video
                  className="aspect-[16/9.9] w-full object-cover object-center"
                  src="/1_1.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Automated outreach demo"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[#c3c6d6]/30 bg-white p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4e3ff] text-[#0050cb]">
                <MaterialIcon name="folder_shared" />
              </div>
              <h3 className="text-xl font-bold text-[#141b2b]">Candidate Management</h3>
              <p className="mt-2 text-sm text-[#434654]">
                Save lists, track unveils, and keep your pipeline organized.
              </p>
              <div className="mt-6 overflow-hidden rounded-xl border border-[#c3c6d6]/25 bg-[#f1f3ff] shadow-sm">
                <video
                  className="aspect-[16/9.9] w-full object-cover object-center"
                  src="/vi%203.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Candidate management demo"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[#c3c6d6]/30 bg-white p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f3ff] text-[#0050cb]">
                <MaterialIcon name="hub" />
              </div>
              <h3 className="text-xl font-bold text-[#141b2b]">Engage Across Every Channel</h3>
              <p className="mt-2 text-sm text-[#434654]">
                Reach talent through Email, WhatsApp, AI voice, and workflows from one system.
              </p>
              <div className="mt-6 overflow-hidden rounded-xl border border-[#c3c6d6]/25 bg-white shadow-sm">
                <video
                  className="aspect-video w-full object-cover object-center"
                  src="/video_5.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Multi-channel outreach demo"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recruiting suite */}
      <section className="px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
              Agentic AI Recruiting Infrastructure — Built for the Modern Hiring Team
            </h2>
            <p className="mt-2 text-[#434654]">
              Source, engage, screen, and hire from one autonomous recruiting platform.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {SUITE_COLUMNS.map((col) => (
              <div
                key={col.title}
                className="rounded-2xl border border-[#c3c6d6]/30 bg-white p-8"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0050cb]/10 text-[#0050cb]">
                  <MaterialIcon name={col.icon} className="text-[28px]" />
                </div>
                <h3 className="text-xl font-bold text-[#141b2b]">{col.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#434654]">{col.description}</p>
                <ul className="mt-6 space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#434654]">
                      <MaterialIcon
                        name="check_circle"
                        className="mt-0.5 shrink-0 text-base text-[#0050cb]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="bg-[#f1f3ff] px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Autonomous Candidate Sourcing, Outreach &amp; Screening at Scale
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {IMPACT_STATS.map((s) => (
              <div key={s.label}>
                <p className="text-5xl font-bold text-[#0050cb] md:text-6xl">{s.value}</p>
                <p className="mt-2 text-lg font-medium text-[#141b2b]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingPricingSection pricingPlans={pricingPlans} />

      <LandingHomeFaqSection />

      {/* Final CTA */}
      <section className="relative overflow-x-clip bg-[#141b2b] px-4 py-24 text-center text-white md:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute left-1/2 top-0 h-[400px] w-[min(600px,100vw)] max-w-full -translate-x-1/2 rounded-full bg-[#0050cb] blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
            The Best Talent Is Already Out There.
            <br />
            Huntlo Helps You Reach Them First.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/75">
            Join hundreds of companies using Huntlo to hire top talent faster.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <BookDemoLink className="w-full rounded-full bg-white px-10 py-4 text-sm font-bold text-[#0050cb] shadow-xl transition-all hover:bg-[#f1f3ff] sm:w-auto">
              Book a Demo
            </BookDemoLink>
            <Link
              href="/signup"
              className="w-full rounded-full border border-white/30 px-10 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
