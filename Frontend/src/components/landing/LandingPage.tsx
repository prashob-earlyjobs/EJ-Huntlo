import Link from "next/link";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

import { BookDemoLink } from "./BookDemoLink";
import { LandingDemoVideo } from "./LandingDemoVideo";
import { LandingProductSourcingSection } from "./LandingProductSourcingSection";
import { LandingWorkflowSteps } from "./LandingWorkflowSteps";
import { HeroSearchTyping } from "./HeroSearchTyping";
import { LandingLogo } from "./LandingLogo";
import { LandingNav } from "./LandingNav";
import { LandingPricingSection } from "./LandingPricingSection";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "./MaterialIcon";

const ENGAGE_CHANNEL_LOGOS: Array<
  | { label: string; provider: "gmail" | "whatsapp" }
  | { label: string; icon: string }
> = [
  { label: "Email", provider: "gmail" },
  { label: "WhatsApp", provider: "whatsapp" },
  { label: "AI voice", icon: "graphic_eq" },
  { label: "Workflows", icon: "account_tree" },
];

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

const bookDemoButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-full border border-[#c3c6d6]/50 bg-white px-8 py-3.5 text-sm font-semibold text-[#141b2b] transition-all hover:border-[#0050cb]/30 hover:bg-[#f1f3ff] sm:w-auto";

export function LandingPage({ pricingPlans = null }: LandingPageProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-x-clip px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16 lg:px-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[520px] w-[min(900px,100vw)] max-w-full -translate-x-1/2 rounded-full bg-[#dae1ff]/60 blur-[100px]" />
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
                  className="aspect-video w-full object-cover object-top"
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
                  className="aspect-video w-full object-cover object-top"
                  src="/video_4.mp4"
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
                  className="aspect-video w-full object-cover object-top"
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
              <p className="mt-3 text-base leading-relaxed text-[#434654] md:text-lg">
                Reach talent through Email, WhatsApp, AI voice, and workflows from one system.
              </p>
              <div className="landing-channel-strip" aria-label="Outreach channels">
                {ENGAGE_CHANNEL_LOGOS.map((channel) => (
                  <div key={channel.label} className="landing-channel-strip__item">
                    <span className="landing-channel-strip__icon">
                      {"provider" in channel ? (
                        <IntegrationBrandLogo
                          provider={channel.provider}
                          title={channel.label}
                        />
                      ) : (
                        <MaterialIcon name={channel.icon} />
                      )}
                    </span>
                    <span className="landing-channel-strip__label">{channel.label}</span>
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
          <LandingDemoVideo />
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
