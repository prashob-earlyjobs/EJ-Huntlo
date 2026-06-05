import type { Metadata } from "next";
import Link from "next/link";

import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { COMPETITOR_COMPARISONS } from "@/lib/comparisons";

export const metadata: Metadata = {
  title: "Huntlo vs Competitors | AI Recruiting Comparison",
  description:
    "Compare Huntlo with LinkedIn Recruiter, HireEZ, SeekOut, and Gem. See how Huntlo's AI sourcing, outreach, and hiring OS stack up for outbound recruiting teams.",
};

export default function ComparePage() {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      <main className="px-4 py-10 md:px-8 md:py-14 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <header className="landing-compare-header">
            <p className="landing-blog-eyebrow">Comparison</p>
            <h1 className="landing-blog-title">Huntlo vs competitors</h1>
            <p className="landing-blog-subtitle">
              Recruiting is outbound. See how Huntlo&apos;s AI sourcing, contact reveal, and
              multi-channel campaigns compare to tools your team may already use.
            </p>
          </header>

          <nav className="landing-compare-nav" aria-label="Jump to comparison">
            {COMPETITOR_COMPARISONS.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                className="landing-compare-nav-card"
              >
                <span className="landing-compare-nav-vs">Huntlo vs</span>
                <span className="landing-compare-nav-name">{c.name}</span>
                <MaterialIcon name="arrow_downward" className="text-base text-[#0050cb]" />
              </a>
            ))}
          </nav>

          <div className="landing-compare-sections">
            {COMPETITOR_COMPARISONS.map((comparison) => (
              <ComparisonTable key={comparison.slug} comparison={comparison} />
            ))}
          </div>

          <section className="landing-blog-cta mt-16 rounded-2xl border border-[#c3c6d6]/35 bg-white p-8 text-center shadow-sm md:p-10">
            <h2 className="text-xl font-semibold text-[#141b2b] md:text-2xl">
              See Huntlo in action
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#434654] md:text-base">
              Run an AI search from the homepage, preview candidates, and carry the session into
              your account after signup.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="dashboard-btn-primary text-sm">
                Try AI search
              </Link>
              <Link href="/signup" className="dashboard-btn-secondary text-sm">
                Create account
              </Link>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
