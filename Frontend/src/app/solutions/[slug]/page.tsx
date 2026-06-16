import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SolutionPageContent } from "@/components/landing/SolutionPageContent";
import { SolutionPageLayout } from "@/components/landing/SolutionPageLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonLd";
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

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/solutions" },
    { label: page.title.replace(/^For /, "") },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          breadcrumbItems.map((item) => ({
            name: item.label,
            href: item.href,
          }))
        )}
      />
      <SolutionPageLayout page={page} breadcrumbItems={breadcrumbItems}>
        <SolutionPageContent page={page} />
      </SolutionPageLayout>
    </>
  );
}
