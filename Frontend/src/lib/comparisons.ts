import { DETAILED_COMPARISON_PAGES } from "@/lib/comparisonDetailed";

export type ComparisonHubEntry = {
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  href: string;
};

export const COMPARISON_HUB_ENTRIES: ComparisonHubEntry[] = DETAILED_COMPARISON_PAGES.map(
  (c) => ({
    slug: c.slug,
    name: c.name,
    shortName: c.shortName,
    summary: c.intro[0] || c.metaDescription,
    href: `/compare/${c.slug}`,
  })
);

/** Footer comparison column order (Prism ↔ Juicebox swapped vs hub list). */
const FOOTER_COMPARISON_SLUG_ORDER = ["juicebox", "contrario", "prism", "qureos"] as const;

export const COMPARISON_FOOTER_LINKS = FOOTER_COMPARISON_SLUG_ORDER.map((slug) => {
  const entry = COMPARISON_HUB_ENTRIES.find((c) => c.slug === slug);
  if (!entry) {
    throw new Error(`Missing comparison entry for footer slug: ${slug}`);
  }
  return {
    label: `Huntlo vs ${entry.shortName}`,
    href: entry.href,
  };
});
