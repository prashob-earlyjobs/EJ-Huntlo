import Link from "next/link";

import type { SolutionPageData } from "@/lib/solutionPages";
import { listSolutionPages } from "@/lib/solutionPages";

type Props = {
  page: SolutionPageData;
};

export function SolutionPageContent({ page }: Props) {
  const related = listSolutionPages().filter((item) => item.id !== page.id).slice(0, 3);

  return (
    <div className="landing-legal-body mt-8">
      <p>{page.intro}</p>

      <section className="landing-legal-section">
        <h2>Challenges we solve</h2>
        <ul>
          {page.challenges.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="landing-legal-section">
        <h2>How Huntlo helps</h2>
        <ul>
          {page.capabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="landing-legal-section">
        <h2>What you can expect</h2>
        <ul>
          {page.outcomes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {related.length > 0 ? (
        <section className="landing-legal-section">
          <h2>More solutions</h2>
          <ul>
            {related.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-[#0050cb] hover:underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
