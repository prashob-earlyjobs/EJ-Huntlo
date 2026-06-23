import Link from "next/link";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { COMPARISON_HUB_ENTRIES } from "@/lib/comparisons";
import type { ComparisonFeatureValue, DetailedComparisonPage } from "@/lib/comparisonDetailed";

function FeatureBadge({ value }: { value: ComparisonFeatureValue }) {
  const normalized = String(value).toLowerCase();

  if (normalized === "yes") {
    return (
      <span className="landing-compare-badge landing-compare-badge--yes">
        <MaterialIcon name="check" className="text-sm" />
        Yes
      </span>
    );
  }
  if (normalized === "no") {
    return (
      <span className="landing-compare-badge landing-compare-badge--no">
        <MaterialIcon name="close" className="text-sm" />
        No
      </span>
    );
  }
  if (normalized === "partial" || normalized === "limited") {
    return (
      <span className="landing-compare-badge landing-compare-badge--partial">
        {value}
      </span>
    );
  }
  return <span className="landing-compare-text-value">{value}</span>;
}

function SectionCard({
  id,
  icon,
  title,
  children,
  className = "",
}: {
  id?: string;
  icon: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`landing-compare-section ${className}`.trim()}>
      <div className="landing-compare-section-head">
        <span className="landing-compare-section-icon" aria-hidden>
          <MaterialIcon name={icon} />
        </span>
        <h2 className="landing-compare-section-title">{title}</h2>
      </div>
      <div className="landing-compare-section-body">{children}</div>
    </section>
  );
}

function CompareDataTable({
  columns,
  rows,
  huntloColumnIndex,
}: {
  columns: string[];
  rows: { label: string; cells: React.ReactNode[] }[];
  huntloColumnIndex?: number;
}) {
  return (
    <div className="landing-compare-table-wrap">
      <table className="landing-compare-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col}
                scope="col"
                className={
                  huntloColumnIndex === index ? "landing-compare-col-huntlo" : undefined
                }
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.label}-${index}`}
                  className={
                    huntloColumnIndex === index ? "landing-compare-col-huntlo" : undefined
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkflowTimeline({ steps, label, variant }: { steps: string[]; label: string; variant: "huntlo" | "competitor" }) {
  return (
    <div className={`landing-compare-timeline landing-compare-timeline--${variant}`}>
      <p className="landing-compare-timeline-label">{label}</p>
      <ol className="landing-compare-timeline-steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="landing-compare-timeline-num">{String(index + 1).padStart(2, "0")}</span>
            <span className="landing-compare-timeline-step">{step}</span>
            {index < steps.length - 1 ? (
              <MaterialIcon name="south" className="landing-compare-timeline-arrow" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

type Props = {
  page: DetailedComparisonPage;
  currentSlug: string;
};

export function ComparisonDetailedPage({ page, currentSlug }: Props) {
  const otherComparisons = COMPARISON_HUB_ENTRIES.filter((entry) => entry.slug !== currentSlug);

  return (
    <div className="landing-compare-page">
      <div className="landing-compare-hero">
        <div className="landing-compare-hero-glow" aria-hidden />

        <nav className="landing-compare-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <MaterialIcon name="chevron_right" className="landing-compare-breadcrumb-sep" />
          <Link href="/compare">Compare</Link>
          <MaterialIcon name="chevron_right" className="landing-compare-breadcrumb-sep" />
          <span>Huntlo vs {page.name}</span>
        </nav>

        <div className="landing-compare-matchup" aria-label={`Huntlo vs ${page.name}`}>
          <div className="landing-compare-matchup-card landing-compare-matchup-card--huntlo">
            <div className="landing-compare-matchup-mark landing-compare-matchup-mark--huntlo">
              <MaterialIcon name="rocket_launch" />
            </div>
            <div className="landing-compare-matchup-copy">
              <p className="landing-compare-matchup-name">Huntlo</p>
              <p className="landing-compare-matchup-role">{page.bestFor.huntlo}</p>
            </div>
          </div>

          <div className="landing-compare-matchup-vs" aria-hidden>
            <span>vs</span>
          </div>

          <div className="landing-compare-matchup-card landing-compare-matchup-card--competitor">
            <div className="landing-compare-matchup-mark landing-compare-matchup-mark--competitor">
              <span>{page.name.charAt(0)}</span>
            </div>
            <div className="landing-compare-matchup-copy">
              <p className="landing-compare-matchup-name">{page.name}</p>
              <p className="landing-compare-matchup-role">{page.bestFor.competitor}</p>
            </div>
          </div>
        </div>

        <h1 className="landing-compare-hero-title">{page.headline}</h1>

        <div className="landing-compare-hero-intro">
          {page.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <nav className="landing-compare-switcher" aria-label="Other comparisons">
          <span className="landing-compare-switcher-label">Also compare:</span>
          <div className="landing-compare-switcher-pills">
            {COMPARISON_HUB_ENTRIES.map((entry) => (
              <Link
                key={entry.slug}
                href={entry.href}
                className={`landing-blog-category-pill ${
                  entry.slug === currentSlug ? "landing-blog-category-pill--active" : ""
                }`}
                aria-current={entry.slug === currentSlug ? "page" : undefined}
              >
                vs {entry.shortName}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <div className="landing-compare-sections">
        <SectionCard icon="table_chart" title="Quick comparison">
          <CompareDataTable
            columns={["Feature", "Huntlo", page.name]}
            huntloColumnIndex={1}
            rows={[
              ...page.quickComparisonRows.map((row) => ({
                label: row.feature,
                cells: [
                  <FeatureBadge key="h" value={row.huntlo} />,
                  <FeatureBadge key="c" value={row.competitor} />,
                ],
              })),
              {
                label: "Best for",
                cells: [
                  <span key="h" className="landing-compare-text-value landing-compare-text-value--strong">
                    {page.bestFor.huntlo}
                  </span>,
                  <span key="c" className="landing-compare-text-value">
                    {page.bestFor.competitor}
                  </span>,
                ],
              },
            ]}
          />
        </SectionCard>

        <div className="landing-compare-choose-grid">
          <div className="landing-compare-choose-card landing-compare-choose-card--huntlo">
            <div className="landing-compare-choose-head">
              <MaterialIcon name="verified" />
              <h2>Choose Huntlo if</h2>
            </div>
            <ul>
              {page.chooseHuntlo.map((item) => (
                <li key={item}>
                  <MaterialIcon name="check_circle" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="landing-compare-choose-card">
            <div className="landing-compare-choose-head">
              <MaterialIcon name="search" />
              <h2>Choose {page.name} if</h2>
            </div>
            <ul>
              {page.chooseCompetitor.map((item) => (
                <li key={item}>
                  <MaterialIcon name="check_circle" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="landing-compare-platform-grid">
          <SectionCard icon="rocket_launch" title="What is Huntlo?" className="landing-compare-platform-card">
            <p>{page.whatIsHuntlo.lead}</p>
            <p className="landing-compare-platform-subhead">The platform combines</p>
            <ul className="landing-compare-platform-list">
              {page.whatIsHuntlo.bullets.map((item) => (
                <li key={item}>
                  <MaterialIcon name="arrow_forward" />
                  {item}
                </li>
              ))}
            </ul>
            <blockquote className="landing-compare-philosophy">
              <span className="landing-compare-philosophy-label">Core philosophy</span>
              {page.whatIsHuntlo.philosophy}
            </blockquote>
            <p className="landing-compare-platform-closing">{page.whatIsHuntlo.closing}</p>
          </SectionCard>

          <SectionCard icon="travel_explore" title={`What is ${page.name}?`} className="landing-compare-platform-card">
            <p>{page.whatIsCompetitor.lead}</p>
            <p className="landing-compare-platform-subhead">The platform emphasizes</p>
            <ul className="landing-compare-platform-list">
              {page.whatIsCompetitor.bullets.map((item) => (
                <li key={item}>
                  <MaterialIcon name="arrow_forward" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="landing-compare-platform-closing">{page.whatIsCompetitor.closing}</p>
          </SectionCard>
        </div>

        <SectionCard icon="compare_arrows" title="Feature comparison">
          <CompareDataTable
            columns={["Capability", "Huntlo", page.name]}
            huntloColumnIndex={1}
            rows={page.featureComparison.map((row) => ({
              label: row.capability,
              cells: [
                <span key="h" className="landing-compare-text-value landing-compare-text-value--strong">
                  {row.huntlo}
                </span>,
                <span key="c" className="landing-compare-text-value">
                  {row.competitor}
                </span>,
              ],
            }))}
          />
        </SectionCard>

        <div className="landing-compare-highlight">
          <MaterialIcon name="lightbulb" />
          <div>
            <p className="landing-compare-highlight-label">Biggest difference</p>
            <p className="landing-compare-highlight-text">{page.biggestDifference}</p>
          </div>
        </div>

        <SectionCard icon="account_tree" title="Workflow comparison">
          <div className="landing-compare-workflow-grid">
            <WorkflowTimeline steps={page.workflowHuntlo} label="Huntlo" variant="huntlo" />
            <WorkflowTimeline steps={page.workflowCompetitor} label={page.name} variant="competitor" />
          </div>
          <p className="landing-compare-workflow-note">{page.workflowNote}</p>
        </SectionCard>

        <SectionCard icon="recommend" title="Best platform by use case">
          <CompareDataTable
            columns={["Use case", "Recommended"]}
            rows={page.useCases.map((row) => ({
              label: row.useCase,
              cells: [
                <span
                  key="r"
                  className={
                    row.recommended === "Huntlo"
                      ? "landing-compare-recommended landing-compare-recommended--huntlo"
                      : row.recommended === "Both"
                        ? "landing-compare-recommended landing-compare-recommended--both"
                        : "landing-compare-recommended"
                  }
                >
                  {row.recommended === "Huntlo" ? (
                    <MaterialIcon name="star" className="text-sm" />
                  ) : null}
                  {row.recommended}
                </span>,
              ],
            }))}
          />
        </SectionCard>

        <SectionCard icon="balance" title="Pros & considerations">
          <div className="landing-compare-pros-grid">
            <div className="landing-compare-pros-card landing-compare-pros-card--huntlo">
              <h3>Huntlo</h3>
              <p className="landing-compare-pros-label">Pros</p>
              <ul>
                {page.prosHuntlo.map((item) => (
                  <li key={item}>
                    <MaterialIcon name="check" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="landing-compare-pros-label landing-compare-pros-label--muted">Consideration</p>
              <p className="landing-compare-pros-note">{page.considerationHuntlo}</p>
            </div>
            <div className="landing-compare-pros-card">
              <h3>{page.name}</h3>
              <p className="landing-compare-pros-label">Pros</p>
              <ul>
                {page.prosCompetitor.map((item) => (
                  <li key={item}>
                    <MaterialIcon name="check" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="landing-compare-pros-label landing-compare-pros-label--muted">Consideration</p>
              <p className="landing-compare-pros-note">{page.considerationCompetitor}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="help" title="FAQ">
          <dl className="landing-compare-faq">
            {page.faq.map((item) => (
              <div key={item.question} className="landing-compare-faq-item">
                <dt>
                  <MaterialIcon name="quiz" />
                  {item.question}
                </dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <section className="landing-compare-verdict-card">
          <div className="landing-compare-verdict-head">
            <MaterialIcon name="gavel" />
            <h2>Final verdict</h2>
          </div>
          {page.finalVerdict.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        {otherComparisons.length > 0 ? (
          <section className="landing-compare-related">
            <h2 className="landing-compare-related-title">Explore more comparisons</h2>
            <div className="landing-compare-related-grid">
              {otherComparisons.map((entry) => (
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
        ) : null}

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
    </div>
  );
}
