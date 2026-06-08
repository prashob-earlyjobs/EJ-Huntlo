import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComparisonDetailedPage } from "@/components/landing/ComparisonDetailedPage";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import {
  detailedComparisonBySlug,
  DETAILED_COMPARISON_SLUGS,
} from "@/lib/comparisonDetailed";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DETAILED_COMPARISON_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = detailedComparisonBySlug(slug);
  if (!page) {
    return { title: "Comparison not found | Huntlo" };
  }
  return buildPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    ogImage: OG_IMAGES.solutions,
    path: `/compare/${slug}`,
  });
}

export default async function CompareSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const page = detailedComparisonBySlug(slug);
  if (!page) notFound();

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      <main className="px-4 py-8 md:px-8 md:py-12 lg:px-12">
        <ComparisonDetailedPage page={page} currentSlug={slug} />
      </main>

      <LandingFooter />
    </div>
  );
}
