import Link from "next/link";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { COMPARISON_HUB_ENTRIES } from "@/lib/comparisons";

const sortedEntries = [...COMPARISON_HUB_ENTRIES].sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function ComparisonHubPage() {
  return (
    <div className="landing-compare-page">
      <div className="landing-compare-hero">
        <div className="landing-compare-hero-glow" aria-hidden />

        <nav className="landing-compare-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <MaterialIcon name="chevron_right" className="landing-compare-breadcrumb-sep" />
          <span>Compare</span>
        </nav>

        <h1 className="landing-compare-hero-title">
          Huntlo vs competitors: AI recruiting platform comparisons
        </h1>

        <div className="landing-compare-hero-intro">
          <p>
            Compare Huntlo with leading AI recruiting, sourcing, interview automation, and talent
            intelligence platforms. Each guide covers features, workflows, AI capabilities, and
            best-fit use cases for modern hiring teams.
          </p>
        </div>
      </div>

      <section className="landing-compare-related landing-compare-hub-list">
        <h2 className="landing-compare-related-title">All platform comparisons</h2>
        <div className="landing-compare-related-grid">
          {sortedEntries.map((entry) => (
            <Link key={entry.slug} href={entry.href} className="landing-compare-related-card group">
              <p className="landing-compare-nav-vs">Huntlo vs</p>
              <p className="landing-compare-related-name">{entry.name}</p>
              <p className="landing-compare-related-summary">{entry.summary}</p>
              <span className="landing-compare-related-cta">
                Read comparison
                <MaterialIcon name="arrow_forward" className="text-sm" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-compare-cta">
        <div className="landing-compare-cta-glow" aria-hidden />
        <h2>Try Huntlo for your team</h2>
        <p>
          Source talent, run multi-channel outreach, and manage hiring workflows in one recruiting
          OS.
        </p>
        <div className="landing-compare-cta-actions">
          <Link href="/" className="dashboard-btn-primary text-sm">
            Try AI search
          </Link>
          <Link href="/signup" className="landing-compare-cta-secondary text-sm">
            Create account
          </Link>
        </div>
      </section>
    </div>
  );
}
