import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CompetitorComparison } from "@/lib/comparisons";

type Props = {
  comparison: CompetitorComparison;
};

export function ComparisonTable({ comparison }: Props) {
  return (
    <section
      id={comparison.slug}
      className="landing-compare-section scroll-mt-28"
      aria-labelledby={`compare-${comparison.slug}-title`}
    >
      <div className="landing-compare-section-head">
        <h2 id={`compare-${comparison.slug}-title`} className="landing-compare-section-title">
          Huntlo vs {comparison.name}
        </h2>
        <p className="landing-compare-section-summary">{comparison.summary}</p>
        <p className="landing-compare-section-positioning">{comparison.positioning}</p>
      </div>

      <div className="landing-compare-table-wrap">
        <table className="landing-compare-table">
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">Huntlo</th>
              <th scope="col">{comparison.name}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td>
                  <span className="landing-compare-cell">
                    {row.huntloAdvantage ? (
                      <MaterialIcon
                        name="check_circle"
                        className="landing-compare-icon landing-compare-icon--yes"
                      />
                    ) : null}
                    {row.huntlo}
                  </span>
                </td>
                <td>
                  <span className="landing-compare-cell">{row.competitor}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="landing-compare-highlights">
        <p className="landing-compare-highlights-label">Why teams pick Huntlo</p>
        <ul>
          {comparison.huntloHighlights.map((item) => (
            <li key={item}>
              <MaterialIcon name="bolt" className="landing-compare-highlight-icon" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
