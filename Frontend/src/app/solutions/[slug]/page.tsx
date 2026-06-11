import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { SolutionPageContent } from "@/components/landing/SolutionPageContent";
import {
  getSolutionPage,
  SOLUTION_PAGE_SLUGS,
} from "@/lib/solutionPages";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SOLUTION_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSolutionPage(slug);
  if (!page) {
    return { title: "Solution not found | Huntlo" };
  }
  return buildPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    ogImage: OG_IMAGES.solutions,
    path: page.href,
  });
}

export default async function SolutionSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getSolutionPage(slug);
  if (!page) notFound();

  return (
    <MarketingPageShell
      eyebrow="Solutions"
      title={page.title}
      description={page.description}
    >
      <SolutionPageContent page={page} />
    </MarketingPageShell>
  );
}
