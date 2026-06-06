import Link from "next/link";

import { COMPARISON_FOOTER_LINKS } from "@/lib/comparisons";
import { FOOTER_PLATFORM_PARTNERS } from "@/lib/footerPlatformPartners";
import { FOOTER_LEGAL_LINKS, legalPageHref } from "@/lib/legalPages";

import { LandingLogo } from "./LandingLogo";

const FOOTER_LINK_HREFS: Record<string, string> = {
  Blog: "/blog",
  ...Object.fromEntries(COMPARISON_FOOTER_LINKS.map((item) => [item.label, item.href])),
};

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
    title: "Resources",
    links: ["Documentation", "Help Center", "Blog", "FAQs"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Partnerships"],
  },
  {
    title: "Comparison",
    links: COMPARISON_FOOTER_LINKS.map((item) => item.label),
  },
];

export function LandingFooter() {
  return (
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
          className="grid w-full grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-10 md:grid-cols-3 md:gap-x-8 md:gap-y-10 lg:grid-cols-5 lg:gap-x-10 lg:gap-y-0"
          aria-label="Footer"
        >
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#141b2b]">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((label) => {
                  const href = FOOTER_LINK_HREFS[label] || "#";
                  const isInternal = href.startsWith("/");
                  return (
                    <li key={label}>
                      {isInternal ? (
                        <Link
                          href={href}
                          className="text-sm leading-snug text-[#434654] transition-colors hover:text-[#0050cb]"
                        >
                          {label}
                        </Link>
                      ) : (
                        <a
                          href={href}
                          className="text-sm leading-snug text-[#434654] transition-colors hover:text-[#0050cb]"
                        >
                          {label}
                        </a>
                      )}
                    </li>
                  );
                })}
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
            {FOOTER_LEGAL_LINKS.map(({ label, slug }) => (
              <Link
                key={slug}
                href={legalPageHref(slug)}
                className="text-[#434654] transition-colors hover:text-[#0050cb]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
