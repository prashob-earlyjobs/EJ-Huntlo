import type { Metadata } from "next";

import { ComparisonHubPage } from "@/components/landing/ComparisonHubPage";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonLd";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Compare Huntlo vs AI Recruiting Platforms (2026)",
  description:
    "Browse Huntlo comparisons with Humanly, Paradox AI, hireEZ, Gem, SeekOut, Phenom, Eightfold AI, and more. Features, workflows, and best-fit use cases.",
  ogImage: OG_IMAGES.solutions,
  path: "/compare",
});

export default function CompareIndexPage() {
  const breadcrumbItems = [
    { name: "Home", href: "/" },
    { name: "Compare" },
  ];

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <LandingNav />

      <main className="px-4 py-8 md:px-8 md:py-12 lg:px-12">
        <ComparisonHubPage />
      </main>

      <LandingFooter />
    </div>
  );
}
