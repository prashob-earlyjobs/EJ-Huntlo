import type { Metadata } from "next";

import { AboutPageContent } from "@/components/landing/AboutPageContent";
import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES } from "@/lib/marketingPages";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const page = MARKETING_PAGES.about;

export const metadata: Metadata = buildPageMetadata({
  title: "About Huntlo — Agentic AI Recruiting Infrastructure | Huntlo",
  description: page.description,
  ogImage: OG_IMAGES.about,
  path: page.path,
});

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <AboutPageContent />
    </MarketingPageShell>
  );
}
