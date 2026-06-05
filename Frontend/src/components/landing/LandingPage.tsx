import Link from "next/link";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

import { BookDemoLink } from "./BookDemoLink";
import { LandingProductSourcingSection } from "./LandingProductSourcingSection";
import { LandingWorkflowSteps } from "./LandingWorkflowSteps";
import { HeroSearchTyping } from "./HeroSearchTyping";
import { LandingLogo } from "./LandingLogo";
import { LandingNav } from "./LandingNav";
import { LandingPricingSection } from "./LandingPricingSection";
import { FOOTER_PLATFORM_PARTNERS } from "@/lib/footerPlatformPartners";
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
    title: "Hiring OS",
    links: ["Sourcing", "Screening", "Assessments", "Interview"],
  },
  {
    title: "Product",
    links: ["Source Candidates", "People Scout", "Candidate Pool", "Integrations"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Blog"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Help Center", "API", "Status"],
  },
];

const FOOTER_LEGAL_LINKS = ["Privacy", "Terms", "Security", "Cookies"] as const;

type LandingPageProps = {
  pricingPlans?: PricingPlansPayload | null;
};

const bookDemoButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-full border border-[#c3c6d6]/50 bg-white px-8 py-3.5 text-sm font-semibold text-[#141b2b] transition-all hover:border-[#0050cb]/30 hover:bg-[#f1f3ff] sm:w-auto";

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
            Stop Posting and waiting.
            <br />
            <span className="text-[#0050cb]">
              Huntlo finds and engages talent with AI.
            </span>
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
            <BookDemoLink className={bookDemoButtonClass}>Book Demo</BookDemoLink>
          </div>

          <HeroSearchTyping />
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

      <LandingProductSourcingSection />

      {/* Workflow */}
      <section className="bg-[#faf9ff] px-4 py-20 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            From Description to Offer
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-[#434654]">
            The 4-step workflow that powers high-growth teams.
          </p>
          <LandingWorkflowSteps />
        </div>
      </section>

      {/* Bento — high volume hiring */}
      <section className="px-4 py-20 md:px-8 lg:px-12" id="resources">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Built for High-Volume Hiring Teams
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
              <h3 className="text-xl font-bold">Automated Outreach</h3>
              <p className="mt-2 text-sm text-white/85">
                Sequences that feel personal—email, WhatsApp, and LinkedIn in one flow.
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
            <BookDemoLink className="w-full rounded-full border border-white/30 px-10 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto">
              Book a Demo
            </BookDemoLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#c3c6d6]/25 bg-white">
        <div className="relative overflow-hidden bg-[#141b2b] px-4 py-10 md:px-8 lg:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute right-0 top-1/2 h-[280px] w-[420px] -translate-y-1/2 rounded-full bg-[#0050cb] blur-[100px]" />
          </div>
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="inline-block shrink-0">
              <LandingLogo className="h-10 w-auto" />
            </Link>
            <div
              className="flex flex-wrap items-center gap-5 sm:justify-end"
              aria-label="Supported AI platforms"
            >
              {FOOTER_PLATFORM_PARTNERS.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={partner.description}
                  className="rounded-md opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                >
                  <img
                    src={partner.logoSrc}
                    alt={partner.name}
                    className="h-8 w-auto max-w-[5.5rem] object-contain brightness-0 invert"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-14 lg:px-12">
          <nav
            className="grid w-full grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-10 md:grid-cols-4 md:gap-x-8 md:gap-y-0 lg:gap-x-12"
            aria-label="Footer"
          >
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">
                  {col.title}
                </h4>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((label) => (
                    <li key={label}>
                      <a
                        href="#"
                        className="text-sm leading-snug text-[#434654] transition-colors hover:text-[#0050cb]"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mx-auto max-w-7xl border-t border-[#c3c6d6]/20 px-4 pb-10 pt-8 md:px-8 lg:px-12">
          <div className="flex flex-col items-center justify-center gap-3 text-center text-xs text-[#434654] md:flex-row md:flex-wrap md:gap-x-6 md:gap-y-2">
            <p>© {new Date().getFullYear()} Huntlo. All rights reserved.</p>
            <nav
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
              aria-label="Legal"
            >
              {FOOTER_LEGAL_LINKS.map((label) => (
                <a
                  key={label}
                  href="#"
                  className="text-[#434654] transition-colors hover:text-[#0050cb]"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
