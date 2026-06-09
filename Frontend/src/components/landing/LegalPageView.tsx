import Link from "next/link";

import {
  FOOTER_LEGAL_LINKS,
  legalPageBySlug,
  legalPageHref,
  type LegalPageData,
} from "@/lib/legalPages";

type LegalPageViewProps = {
  page: LegalPageData;
};

export function LegalPageView({ page }: LegalPageViewProps) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      <nav className="mb-6 text-sm text-[#434654]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#0050cb]">
          Home
        </Link>
        <span className="mx-2 text-[#c3c6d6]">/</span>
        <span className="text-[#141b2b]">{page.title}</span>
      </nav>

      <header className="landing-legal-header">
        <p className="landing-blog-eyebrow">Legal</p>
        <h1 className="landing-legal-title">{page.title}</h1>
        <p className="landing-legal-meta">Last updated: {page.lastUpdated}</p>
      </header>

      <div className="landing-legal-body">
        {page.sections.map((section) => (
          <section key={section.id} id={section.id} className="landing-legal-section">
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <nav
        className="landing-legal-related mt-12 border-t border-[#c3c6d6]/35 pt-8"
        aria-label="Related legal pages"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">
          Related policies
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_LEGAL_LINKS.filter((link) => link.slug !== page.slug).map((link) => {
            const relatedPage = legalPageBySlug(link.slug);
            if (!relatedPage) return null;
            return (
              <li key={link.slug}>
                <Link
                  href={legalPageHref(link.slug)}
                  className="text-sm text-[#434654] transition-colors hover:text-[#0050cb]"
                >
                  {relatedPage.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </article>
  );
}
