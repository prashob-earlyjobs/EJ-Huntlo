import type { Metadata } from "next";

import { FaqsPageContent } from "@/components/landing/FaqsPageContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ_SECTIONS } from "@/lib/faqsContent";
import { faqPageJsonLd, flattenFaqSectionsForSchema } from "@/lib/jsonLd";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "Huntlo FAQ — Agentic AI Recruiting, Sourcing & Outreach Explained";
const description =
  "Find answers about Huntlo's agentic AI recruiting infrastructure — candidate sourcing, autonomous outreach, AI voice screening, pricing, and integrations.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.faqs,
  path: "/faqs",
});

export default function FaqsPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(flattenFaqSectionsForSchema(FAQ_SECTIONS))} />
      <FaqsPageContent />
    </>
  );
}
