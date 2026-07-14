import Link from "next/link";

import { COMPARISON_FOOTER_LINKS } from "@/lib/comparisons";
import { FOOTER_PLATFORM_PARTNERS } from "@/lib/footerPlatformPartners";
import { FOOTER_LEGAL_LINKS, legalPageHref } from "@/lib/legalPages";

import { LandingLogo } from "./LandingLogo";

const FOOTER_LINK_HREFS: Record<string, string> = {
  Sourcing: "/sourcing",
  Screening: "/screening",
  Assessments: "/assessments",
  Interview: "/interview",
  "Source Candidates": "/sourcing",
  "People Scout": "/people-scout",
  "Candidate Pool": "/candidate-pool",
  Integrations: "/integrations",
  Documentation: "/docs",
  Blog: "/blog",
  FAQs: "/faqs",
  About: "/about",
  Careers: "https://www.earlyjobs.ai/jobs",
  Contact: "/contact",
  ...Object.fromEntries(COMPARISON_FOOTER_LINKS.map((item) => [item.label, item.href])),
};

const FOOTER_SOCIAL_LINKS = [
  {
    name: "YouTube",
    href: "https://www.youtube.com/@Huntlo-ai",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.6 15.5v-7l6.4 3.5-6.4 3.5Z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/huntlo-ai",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.2 0 22.23 0Z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/huntlo.ai/",
    icon: (
      <span
        aria-hidden
        className="inline-block h-5 w-5 translate-y-0.5 bg-current"
        style={{
          WebkitMaskImage: "url(/ai_platform_logo/instagram-white-icon.webp)",
          maskImage: "url(/ai_platform_logo/instagram-white-icon.webp)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    ),
  },
] as const;

const FOOTER_COLUMNS: {
  title: string;
  titleHref?: string;
  links: string[];
}[] = [
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
    links: ["Documentation", "Blog", "FAQs"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact"],
  },
  {
    title: "Comparison",
    titleHref: "/compare",
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
          <div className="flex flex-wrap items-center gap-3 sm:justify-end sm:gap-3.5">
            <div
              className="flex flex-wrap items-center gap-3 sm:gap-3.5"
              aria-label="Ask AI assistants about Huntlo"
            >
              {FOOTER_PLATFORM_PARTNERS.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={partner.description}
                  aria-label={partner.description}
                  className="rounded-md opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                >
                  <img
                    src={partner.logoSrc}
                    alt={partner.name}
                    className="h-6 w-auto max-w-[4.25rem] object-contain brightness-0 invert"
                  />
                </a>
              ))}
            </div>
            <span className="hidden text-sm text-white/40 sm:inline" aria-hidden>
              |
            </span>
            <div
              className="flex items-center gap-3 sm:gap-3.5"
              aria-label="Huntlo social media"
            >
              {FOOTER_SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  aria-label={social.name}
                  className="text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                >
                  {social.icon}
                </a>
              ))}
            </div>
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
                {col.titleHref ? (
                  <Link
                    href={col.titleHref}
                    className="transition-colors hover:text-[#0050cb]"
                  >
                    {col.title}
                  </Link>
                ) : (
                  col.title
                )}
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
