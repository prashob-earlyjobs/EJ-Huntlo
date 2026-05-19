import Link from "next/link";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

import { LandingLogo } from "./LandingLogo";
import { LandingNav } from "./LandingNav";
import { LandingPricingSection } from "./LandingPricingSection";
import { MaterialIcon } from "./MaterialIcon";

const HERO_SEARCH_PLACEHOLDER =
  "Find software engineers in San Francisco with 5+ years of React experience...";

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

const SOURCING_FEATURES = [
  {
    icon: "search",
    title: "AI-powered candidate search",
    description:
      "Describe your ideal hire in plain English. Huntlo maps intent to talent across millions of profiles.",
  },
  {
    icon: "filter_alt",
    title: "Smart filters & scoring",
    description:
      "Refine by skills, location, experience, and company signals—with match scores you can trust.",
  },
  {
    icon: "person_search",
    title: "People Scout lookups",
    description:
      "Find a single profile by email or LinkedIn when you already know who you want to reach.",
  },
];

const MOCK_CANDIDATES = [
  { name: "Priya Sharma", role: "Senior React Engineer", location: "Bangalore", score: 94 },
  { name: "James Chen", role: "Staff Frontend Dev", location: "San Francisco", score: 91 },
  { name: "Anika Patel", role: "Full Stack Engineer", location: "Remote", score: 88 },
  { name: "Marcus Webb", role: "Engineering Lead", location: "Austin", score: 86 },
];

const WORKFLOW_STEPS = [
  { icon: "description", label: "Post job description" },
  { icon: "manage_search", label: "AI sources candidates" },
  { icon: "forward_to_inbox", label: "Automated outreach" },
  { icon: "event", label: "Schedule interviews" },
  { icon: "handshake", label: "Make an offer" },
];

const SUITE_COLUMNS = [
  {
    title: "Source",
    icon: "travel_explore",
    items: [
      "AI semantic search",
      "LinkedIn & profile enrichment",
      "Candidate pool & history",
      "Session-based sourcing",
    ],
  },
  {
    title: "Engage",
    icon: "campaign",
    items: [
      "Automated email sequences",
      "WhatsApp-ready workflows",
      "Hyper-personalized messaging",
      "Multi-touch follow-ups",
    ],
  },
  {
    title: "Analyze",
    icon: "insights",
    items: [
      "Pipeline performance reports",
      "Reply & conversion tracking",
      "Team utilisation analytics",
      "ROI dashboards",
    ],
  },
];

const IMPACT_STATS = [
  { value: "5X", label: "Faster hire" },
  { value: "75%", label: "More candidates" },
  { value: "30%", label: "Lower cost" },
];

const ENTERPRISE_BADGES = [
  { icon: "verified_user", label: "SOC2 Type II" },
  { icon: "gpp_good", label: "GDPR Compliant" },
  { icon: "key", label: "SSO Integration" },
  { icon: "support_agent", label: "24/7 Support" },
];

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Search Candidates", "People Scout", "Candidate Pool", "Integrations"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Blog"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Help Center", "API", "Status"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Cookies"],
  },
];

type LandingPageProps = {
  pricingPlans?: PricingPlansPayload | null;
};

function CandidateRow({
  name,
  role,
  location,
  score,
}: {
  name: string;
  role: string;
  location: string;
  score: number;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex items-center gap-3 border-b border-[#c3c6d6]/20 px-4 py-3 last:border-b-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0050cb]/15 text-xs font-bold text-[#0050cb]">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#141b2b]">{name}</p>
        <p className="truncate text-xs text-[#434654]">
          {role} · {location}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-[#0050cb]/10 px-2 py-0.5 text-xs font-semibold text-[#0050cb]">
        {score}%
      </span>
      <button
        type="button"
        className="hidden shrink-0 rounded-lg bg-[#0050cb] px-3 py-1.5 text-xs font-medium text-white sm:block"
      >
        View
      </button>
    </div>
  );
}


export function LandingPage({ pricingPlans = null }: LandingPageProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16 lg:px-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#dae1ff]/60 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-[#141b2b] md:text-5xl lg:text-[56px]">
            Stop Posting Jobs.
            <br />
            Start Getting Candidates Who Actually Reply.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#434654] md:text-lg">
            The world&apos;s first AI-powered outbound recruiting platform. Reach top talent in
            seconds, not weeks.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-[#0050cb] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/25 transition-all hover:bg-[#003fa4] sm:w-auto"
            >
              Get Started
            </Link>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#c3c6d6]/50 bg-white px-8 py-3.5 text-sm font-semibold text-[#141b2b] transition-all hover:border-[#0050cb]/30 hover:bg-[#f1f3ff] sm:w-auto"
            >
              <MaterialIcon name="play_circle" className="text-[20px] text-[#0050cb]" />
              Watch Demo
            </button>
          </div>

          <div className="landing-ambient-shadow mx-auto mt-12 max-w-3xl rounded-2xl border border-[#c3c6d6]/30 bg-white p-2 shadow-xl">
            <div className="flex items-center gap-2 rounded-xl bg-[#f1f3ff]/80 px-4 py-3">
              <MaterialIcon name="search" className="shrink-0 text-[#0050cb]" />
              <span className="flex-1 truncate text-left text-sm text-[#434654]/80">
                {HERO_SEARCH_PLACEHOLDER}
              </span>
              <span className="shrink-0 rounded-lg bg-[#0050cb] px-4 py-2 text-xs font-semibold text-white">
                Search
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Huntlo Advantage */}
      <section className="px-4 py-16 md:px-8 lg:px-12" id="solutions">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
              The Huntlo Advantage
            </h2>
            <p className="mt-2 text-[#434654]">Results that speak for themselves.</p>
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

      {/* AI Sourcing */}
      <section className="bg-white px-4 py-20 md:px-8 lg:px-12" id="product">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
              Find the Right Candidates for Your Role—in Minutes
            </h2>
            <ul className="mt-8 space-y-6">
              {SOURCING_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0050cb]/10 text-[#0050cb]">
                    <MaterialIcon name={f.icon} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#141b2b]">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#434654]">{f.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="landing-ambient-shadow overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff]/50">
            <div className="border-b border-[#c3c6d6]/20 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#434654]">
                Matching candidates
              </p>
            </div>
            {MOCK_CANDIDATES.map((c) => (
              <CandidateRow key={c.name} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-[#faf9ff] px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            From Description to Offer
          </h2>
          <p className="mt-2 text-[#434654]">The fastest way to hire top talent.</p>
          <div className="mt-14 flex flex-col items-stretch gap-8 md:flex-row md:items-start md:justify-between">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.label} className="relative flex flex-1 flex-col items-center">
                {idx < WORKFLOW_STEPS.length - 1 ? (
                  <div
                    className="absolute left-[calc(50%+28px)] top-7 hidden h-0.5 w-[calc(100%-56px)] bg-[#0050cb]/20 md:block"
                    aria-hidden
                  />
                ) : null}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0050cb]/30 bg-white text-[#0050cb] shadow-sm">
                  <MaterialIcon name={step.icon} />
                </div>
                <p className="mt-4 max-w-[140px] text-center text-sm font-medium text-[#141b2b]">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento — high volume hiring */}
      <section className="px-4 py-20 md:px-8 lg:px-12" id="resources">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Built for High-Volume Hiring Teams
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff] p-8 md:row-span-2">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0050cb]/10 text-[#0050cb]">
                <MaterialIcon name="manage_search" />
              </div>
              <h3 className="text-xl font-bold text-[#141b2b]">Candidate Search</h3>
              <p className="mt-2 text-sm text-[#434654]">
                Natural-language sourcing with AI filters, session results, and a unified candidate
                pool.
              </p>
              <div className="mt-6 rounded-xl border border-[#c3c6d6]/25 bg-white p-4">
                <div className="mb-2 h-3 w-3/4 rounded bg-[#0050cb]/20" />
                <div className="space-y-2">
                  <div className="h-2 w-full rounded bg-[#0050cb]/10" />
                  <div className="h-2 w-5/6 rounded bg-[#0050cb]/10" />
                  <div className="h-2 w-4/6 rounded bg-[#0050cb]/10" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-[#0050cb] p-8 text-white">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <MaterialIcon name="campaign" />
              </div>
              <h3 className="text-xl font-bold">Automated Outreach</h3>
              <p className="mt-2 text-sm text-white/85">
                Sequences that feel personal—email, WhatsApp, and LinkedIn in one flow.
              </p>
            </div>
            <div className="rounded-2xl border border-[#c3c6d6]/30 bg-white p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4e3ff] text-[#0050cb]">
                <MaterialIcon name="folder_shared" />
              </div>
              <h3 className="text-xl font-bold text-[#141b2b]">Candidate Management</h3>
              <p className="mt-2 text-sm text-[#434654]">
                Save lists, track unveils, and keep your pipeline organized.
              </p>
            </div>
            <div className="rounded-2xl border border-[#c3c6d6]/30 bg-white p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f3ff] text-[#0050cb]">
                <MaterialIcon name="groups" />
              </div>
              <h3 className="text-xl font-bold text-[#141b2b]">Collaborative Hiring</h3>
              <p className="mt-2 text-sm text-[#434654]">
                Share pools and insights across your recruiting team.
              </p>
              <div className="mt-4 flex -space-x-2">
                {["PS", "JC", "AP"].map((initials) => (
                  <div
                    key={initials}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#0050cb]/15 text-xs font-bold text-[#0050cb]"
                  >
                    {initials}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video placeholder */}
      <section className="bg-[#faf9ff] px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Experience The Huntlo Advantage
          </h2>
          <p className="mt-2 text-[#434654]">
            See how Huntlo transforms your hiring process in under two minutes.
          </p>
          <button
            type="button"
            className="landing-ambient-shadow group relative mx-auto mt-10 flex aspect-video w-full max-w-3xl items-center justify-center overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-white transition-shadow hover:shadow-xl"
            aria-label="Play product demo video"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#f1f3ff] to-[#dae1ff]/40" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0050cb] text-white shadow-lg transition-transform group-hover:scale-105">
              <MaterialIcon name="play_arrow" className="text-[36px]" />
            </span>
          </button>
        </div>
      </section>

      {/* Recruiting suite */}
      <section className="px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
              The Complete Recruiting Suite
            </h2>
            <p className="mt-2 text-[#434654]">Everything you need to hire at scale.</p>
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
            Measurable Impact from Day One
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

      {/* Enterprise */}
      <section className="px-4 py-20 md:px-8 lg:px-12" id="company">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Enterprise-Grade by Design
          </h2>
          <p className="mt-2 text-[#434654]">Built with security and compliance in mind.</p>
          <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
            {ENTERPRISE_BADGES.map((b) => (
              <div
                key={b.label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[#c3c6d6]/30 bg-white p-6"
              >
                <MaterialIcon name={b.icon} className="text-[40px] text-[#0050cb]" />
                <span className="text-sm font-semibold text-[#141b2b]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingPricingSection pricingPlans={pricingPlans} />

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[#141b2b] px-4 py-24 text-center text-white md:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#0050cb] blur-[120px]" />
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
            <Link
              href="/signup"
              className="w-full rounded-full bg-white px-10 py-4 text-sm font-bold text-[#0050cb] shadow-xl transition-all hover:bg-[#f1f3ff] sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-full border border-white/30 px-10 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#c3c6d6]/25 bg-white py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 md:grid-cols-5 md:px-8 lg:px-12">
          <div className="md:col-span-1">
            <Link href="/" className="inline-block">
              <LandingLogo className="h-10 w-auto" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#434654]">
              AI-powered outbound recruiting. Find, engage, and hire top talent—faster.
            </p>
            <p className="mt-2 text-xs text-[#434654]/70">by EarlyJobs</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2">
                {col.links.map((label) => (
                  <li key={label}>
                    <a
                      href="#"
                      className="text-sm text-[#434654] transition-colors hover:text-[#0050cb]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-[#c3c6d6]/20 px-4 pt-8 text-center text-xs text-[#434654] md:px-8 lg:px-12">
          © {new Date().getFullYear()} Huntlo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
