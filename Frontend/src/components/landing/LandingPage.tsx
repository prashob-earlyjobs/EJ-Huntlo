import Link from "next/link";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

import { LandingLogo } from "./LandingLogo";
import { LandingNav } from "./LandingNav";
import { LandingPricingSection } from "./LandingPricingSection";
import { MaterialIcon } from "./MaterialIcon";
import { WorkflowVisualization } from "./WorkflowVisualization";

const PIPELINE_STAGES = [
  { icon: "search", label: "SEARCH", detail: "AI scanning 800M+ nodes", border: "border-[#0050cb]/20" },
  { icon: "verified", label: "ENRICH", detail: "Validating career intent", border: "border-[#0050cb]/40" },
  { icon: "forward_to_inbox", label: "OUTREACH", detail: "Hyper-personalized sends", border: "border-[#0050cb]/60" },
  { icon: "how_to_reg", label: "REPLY", detail: "High-intent conversation", border: "border-[#0050cb]" },
] as const;

const AGENT_CARDS = [
  {
    icon: "search_insights",
    title: "Semantic Orchestrator",
    description:
      "Maps complex job requirements to latent talent patterns across multiple data siloes.",
    iconBg: "bg-[#0050cb]/20 text-[#0050cb]",
  },
  {
    icon: "forum",
    title: "Cognitive Engagement",
    description:
      "Personalizes every touchpoint based on the candidate's career trajectory and interests.",
    iconBg: "bg-[#d4e3ff]/80 text-[#505f76]",
  },
  {
    icon: "auto_graph",
    title: "Continuous Learning",
    description:
      "The system gets smarter with every hire, refining search parameters automatically.",
    iconBg: "bg-[#555a5d]/20 text-[#3e4346]",
  },
] as const;

const METRICS = [
  { value: "3X", title: "Faster Discovery", description: "Reduce time-to-source from days to minutes." },
  { value: "45%", title: "Lower Cost/Hire", description: "Cut agency fees and manual labor overhead." },
  { value: "82%", title: "Reply Rate", description: "Engineered outreach that actually converts." },
] as const;

const ENTERPRISE = [
  {
    icon: "security",
    title: "SOC2 Type II",
    description:
      "Bank-level data protection and rigorous compliance standards for your talent data.",
  },
  {
    icon: "database",
    title: "Elastic Scalability",
    description:
      "Scale from 1 to 100,000+ hires per year without hitting architectural bottlenecks.",
  },
  {
    icon: "api",
    title: "Custom AI Infra",
    description:
      "Deploy proprietary models or integrate existing enterprise tech stacks via robust APIs.",
  },
] as const;

type LandingPageProps = {
  pricingPlans?: PricingPlansPayload | null;
};

export function LandingPage({ pricingPlans = null }: LandingPageProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      {/* Hero */}
      <section className="relative flex min-h-[95vh] flex-col items-center overflow-hidden px-4 pb-48 pt-24 md:px-16">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
          <div className="absolute right-[-5%] top-[-10%] h-[800px] w-[800px] rounded-full bg-[#dae1ff] blur-[160px] mix-blend-multiply" />
          <div className="absolute bottom-[10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[#d4e3ff] blur-[140px] mix-blend-multiply" />
        </div>

        <div className="relative z-10 mx-auto mb-24 max-w-5xl text-center">
          <div className="landing-subtle-border mb-8 inline-flex items-center gap-2 rounded-full bg-[#0050cb]/5 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#0050cb]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0050cb]">
              Huntlo Infrastructure 3.0
            </span>
          </div>
          <h1 className="mb-8 text-[48px] font-bold leading-[1.05] tracking-tight text-[#141b2b] md:text-[76px]">
            The AI{" "}
            <span className="bg-gradient-to-r from-[#0050cb] to-[#0054d6] bg-clip-text text-transparent">
              Neural Layer
            </span>
            <br />
            for Global Recruiting
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-[#434654] opacity-80">
            Orchestrate entire talent pipelines with autonomous agents. The infrastructure that
            powers the world&apos;s highest-performing engineering teams.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-[#0050cb] px-10 py-4 text-sm font-medium text-white shadow-2xl shadow-[#0050cb]/30 transition-all hover:-translate-y-1 hover:bg-[#003fa4] sm:w-auto"
            >
              Deploy AI Workforce
            </Link>
            <button
              type="button"
              className="landing-glass-panel flex w-full items-center justify-center gap-2 rounded-full px-10 py-4 text-sm font-medium text-[#141b2b] transition-all hover:bg-[#f1f3ff] sm:w-auto"
            >
              <MaterialIcon name="play_circle" className="text-[20px]" />
              Watch Architecture
            </button>
          </div>
        </div>

        <div className="group relative mx-auto mt-12 w-full max-w-6xl">
          <div className="absolute -inset-10 rounded-[40px] bg-gradient-to-b from-[#0050cb]/10 to-transparent opacity-50 blur-3xl" />
          <div className="landing-glass-panel landing-ambient-shadow relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-[32px] p-8">
            <WorkflowVisualization />
            <div className="landing-glass-panel absolute left-10 top-10 flex items-center gap-2 rounded-xl border border-[#0050cb]/20 px-4 py-2 font-mono text-xs text-[#0050cb]">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              AGENT_RUNNING: sourcing_engine_v4
            </div>
            <div className="landing-glass-panel absolute bottom-10 right-10 rounded-xl border border-[#0050cb]/20 px-4 py-2 font-mono text-xs text-[#0050cb]">
              PIPELINE_EFFICIENCY: 98.4%
            </div>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="bg-white px-4 py-32 md:px-16" id="solutions">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <div className="mb-20 max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
              Autonomous Recruiter Agents
            </h2>
            <p className="text-lg text-[#434654]">
              Don&apos;t just use tools. Deploy agents that think, search, and engage just like your
              best recruiters.
            </p>
          </div>
          <div className="landing-glass-panel landing-ambient-shadow relative w-full max-w-4xl rounded-[32px] p-8">
            <div className="mb-12 flex items-center gap-4 rounded-2xl border border-[#0050cb]/10 bg-[#f1f3ff] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0050cb] text-white">
                <MaterialIcon name="smart_toy" className="text-[20px]" />
              </div>
              <div className="min-w-0 flex-grow">
                <div className="mb-1 text-sm font-semibold text-[#0050cb]">Huntlo Agent Beta</div>
                <div className="landing-typing-effect max-w-fit font-mono text-sm text-[#434654]">
                  Find senior backend engineers in Bangalore with Fintech experience...
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-[#0050cb] px-4 py-2 text-xs font-bold text-white"
              >
                EXECUTE
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {AGENT_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="group cursor-default rounded-2xl border border-[#c3c6d6]/30 bg-white/50 p-6 transition-all hover:border-[#0050cb]/40"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${card.iconBg}`}
                  >
                    <MaterialIcon name={card.icon} />
                  </div>
                  <h4 className="mb-2 text-base font-semibold">{card.title}</h4>
                  <p className="text-sm text-[#434654] opacity-70">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bento features */}
      <section className="bg-[#faf9ff] px-4 py-32 md:px-16" id="product">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
              Precision Engineered Features
            </h2>
            <p className="max-w-2xl text-lg text-[#434654]">
              A modular ecosystem for the modern hiring architecture.
            </p>
          </div>
          <div className="grid auto-rows-[280px] grid-cols-1 gap-6 md:grid-cols-12">
            <div className="landing-ambient-shadow group relative overflow-hidden rounded-[32px] border border-[#c3c6d6]/30 bg-white p-10 md:col-span-8">
              <div className="relative z-10 max-w-md">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0050cb]/10 text-[#0050cb]">
                  <MaterialIcon name="psychology" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-[#141b2b]">AI Semantic Search</h3>
                <p className="text-[#434654] opacity-80">
                  Our proprietary LLM understands intent, not just keywords. Search across 800M+
                  profiles using natural language descriptions of your ideal candidate.
                </p>
              </div>
              <div className="absolute bottom-0 right-0 h-full w-1/2 translate-y-10 opacity-20 transition-all duration-500 group-hover:translate-y-4 group-hover:opacity-100">
                <div className="h-full rounded-tl-[40px] border-l border-t border-[#0050cb]/20 bg-gradient-to-tl from-[#0050cb]/20 to-transparent p-8">
                  <div className="space-y-4">
                    <div className="h-4 w-full rounded bg-[#0050cb]/30" />
                    <div className="h-4 w-5/6 rounded bg-[#0050cb]/20" />
                    <div className="h-4 w-4/6 rounded bg-[#0050cb]/10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[32px] bg-[#0050cb] p-10 text-white shadow-xl shadow-[#0050cb]/20 md:col-span-4">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                  <MaterialIcon name="chat_bubble" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold">WhatsApp Workflows</h3>
                <p className="text-[#c3c7ca]">
                  Reach talent where they respond. 3x higher response rates than email sequences.
                </p>
              </div>
              <div className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
                92% Open Rate
              </div>
            </div>

            <div className="group flex flex-col items-center justify-center rounded-[32px] border border-[#c3c6d6]/30 bg-white p-8 text-center transition-colors hover:bg-[#f1f3ff] md:col-span-4">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4e3ff]/50 text-[#505f76] transition-transform group-hover:rotate-12">
                <MaterialIcon name="auto_awesome" className="text-[32px]" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Hyper-Personalization</h3>
              <p className="text-sm text-[#434654]">
                Automated outreach that reads like it was written by a human expert.
              </p>
            </div>

            <div className="group flex flex-col items-center justify-center rounded-[32px] border border-[#c3c6d6]/30 bg-white p-8 text-center transition-colors hover:bg-[#f1f3ff] md:col-span-4">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#555a5d]/30 text-[#3e4346] transition-transform group-hover:-rotate-12">
                <MaterialIcon name="analytics" className="text-[32px]" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Real-time Insights</h3>
              <p className="text-sm text-[#434654]">
                Track every conversion and funnel drop-off with pixel-perfect precision.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-[32px] border border-[#c3c6d6]/30 bg-[#f1f3ff] p-10 md:col-span-4">
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#141b2b]/5 text-[#141b2b]">
                  <MaterialIcon name="reorder" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold">Multi-touch Sequences</h3>
                <p className="text-[#434654]">
                  Coordinate email, WhatsApp, and LinkedIn touchpoints in a single flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="overflow-hidden bg-white px-4 py-32 md:px-16" id="company">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="w-full rounded-[40px] bg-[#f1f3ff] p-12 opacity-60 md:w-1/2">
              <h4 className="mb-8 text-xs font-semibold uppercase tracking-widest text-[#434654]">
                Traditional Recruiting
              </h4>
              <div className="space-y-6">
                {[
                  ["grid_on", "Static Spreadsheets & Notes"],
                  ["schedule", "4-6 Hours Manual Sourcing / Day"],
                  ["mail_outline", "Generic Templates & Low Replies"],
                  ["warning", "Fragmented Data & Missed Talent"],
                ].map(([icon, text]) => (
                  <div
                    key={text}
                    className="flex items-center gap-4 italic text-[#434654]/70"
                  >
                    <MaterialIcon name={icon} />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative w-full overflow-hidden rounded-[40px] bg-[#0050cb] p-12 text-white shadow-2xl shadow-[#0050cb]/40 md:w-1/2">
              <div className="absolute right-0 top-0 p-8 opacity-20">
                <MaterialIcon name="bolt" className="text-[120px]" />
              </div>
              <h4 className="mb-8 text-xs font-semibold uppercase tracking-widest text-[#dae1ff]">
                The Huntlo Way
              </h4>
              <div className="space-y-6">
                {[
                  ["auto_fix_high", "Unified AI Infrastructure"],
                  ["speed", "Instant Sourcing & Automation"],
                  ["star", "Personalized High-Intent Outreach"],
                  ["hub", "Global Talent Node Connectivity"],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-4 font-semibold">
                    <MaterialIcon name={icon} className="text-[#dae1ff]" />
                    {text}
                  </div>
                ))}
              </div>
              <div className="mt-12 rounded-2xl bg-white/10 p-6 backdrop-blur-md">
                <div className="text-3xl font-bold">+300%</div>
                <div className="text-sm opacity-80">Productivity Uplift</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="bg-[#faf9ff] px-4 py-32 md:px-16">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
            Live Pipeline Visualization
          </h2>
          <p className="text-[#434654]">The engine behind 10,000+ monthly hires.</p>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          {PIPELINE_STAGES.map((stage, idx) => (
            <div key={stage.label} className="contents">
              <div
                className={`landing-glass-panel flex w-full flex-col items-center gap-4 rounded-2xl border-b-4 p-6 text-center md:w-1/5 ${stage.border}`}
              >
                <MaterialIcon name={stage.icon} className="text-[#0050cb]" />
                <div className="text-sm font-bold">{stage.label}</div>
                <div className="text-[10px] text-[#434654] opacity-60">{stage.detail}</div>
              </div>
              {idx < PIPELINE_STAGES.length - 1 ? (
                <div className="relative hidden h-[2px] flex-grow overflow-hidden bg-gradient-to-r from-[#0050cb]/20 to-[#0050cb]/40 md:block">
                  <div
                    className="landing-pipeline-dash absolute inset-0 w-1/4 bg-[#0050cb]"
                    style={{ animationDelay: `${idx * 0.5}s` }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="bg-[#f1f3ff] px-4 py-32 md:px-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-16 text-center text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
            Unprecedented Efficiency
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {METRICS.map((metric, idx) => (
              <div
                key={metric.title}
                className="landing-ambient-shadow rounded-[40px] bg-white p-10 text-center transition-transform duration-500 hover:-translate-y-2"
                style={{ transitionDelay: `${idx * 75}ms` }}
              >
                <div className="landing-metric-counter mb-4 text-5xl font-bold text-[#0050cb]">
                  {metric.value}
                </div>
                <h4 className="mb-2 text-base font-semibold">{metric.title}</h4>
                <p className="text-sm text-[#434654]">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section className="relative overflow-hidden bg-[#faf9ff] px-4 py-32 md:px-16">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
              Enterprise-Grade Infrastructure
            </h2>
            <p className="text-[#434654]">
              Built for the security and scale of global corporations.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {ENTERPRISE.map((item, idx) => (
              <div
                key={item.title}
                className="landing-glass-panel landing-animate-float rounded-3xl p-8"
                style={{ animationDelay: `${idx}s` }}
              >
                <MaterialIcon name={item.icon} className="mb-6 text-[40px] text-[#0050cb]" />
                <h4 className="mb-4 text-base font-semibold">{item.title}</h4>
                <p className="text-sm text-[#434654]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingPricingSection pricingPlans={pricingPlans} />


      {/* CTA */}
      <section className="relative overflow-hidden bg-[#0050cb] px-4 py-48 text-center text-white md:px-16">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute left-1/2 top-1/2 h-[1200px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-[200px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl">
          <h2 className="mb-8 text-[40px] font-bold leading-tight md:text-[64px]">
            Ready to build the future of your talent team?
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg opacity-80">
            Join 500+ high-growth companies deploying AI infrastructure for recruiting.
          </p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-white px-12 py-5 font-bold text-[#0050cb] shadow-2xl transition-all hover:scale-105 hover:bg-[#faf9ff] sm:w-auto"
            >
              Deploy Now - Free Trial
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-full border border-white/20 bg-white/10 px-12 py-5 font-bold transition-all hover:bg-white/20 sm:w-auto"
            >
              Book Technical Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#c3c6d6]/30 bg-white py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 md:grid-cols-4 md:px-16">
          <div>
            <Link href="/" className="mb-6 inline-block">
              <LandingLogo className="h-12 w-auto opacity-80 grayscale md:h-14" />
            </Link>
            <p className="text-xs leading-relaxed text-[#434654]">
              The operating layer for modern recruiting. High-performance infrastructure for global
              talent acquisition.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">
              Infrastructure
            </h4>
            {["Huntlo Source", "Huntlo Agent", "API Docs"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-[#434654] transition-colors hover:text-[#0050cb]"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">Company</h4>
            {["Architecture", "Security", "Status"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-[#434654] transition-colors hover:text-[#0050cb]"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">Support</h4>
            {["Help Center", "Contact Sales", "Privacy"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-[#434654] transition-colors hover:text-[#0050cb]"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-20 max-w-7xl border-t border-[#c3c6d6]/10 px-4 pt-8 text-center text-[10px] uppercase tracking-[0.2em] text-[#434654] opacity-60 md:px-16">
          © {new Date().getFullYear()} Huntlo AI Infrastructure. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
