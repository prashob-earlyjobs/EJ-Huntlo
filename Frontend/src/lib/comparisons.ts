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

export const COMPARISON_FOOTER_LINKS = COMPARISON_HUB_ENTRIES.map((c) => ({
  label: `Huntlo vs ${c.shortName}`,
  href: c.href,
}));
