import type { Metadata } from "next";

import { SourcingPageContent } from "@/components/sourcing/SourcingPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "AI Candidate Sourcing | Huntlo Source";
const description =
  "Describe talent in plain English and discover qualified candidates with AI-powered sourcing, enrichment, match scoring, and talent pools.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/sourcing",
});

export default function SourcingPage() {
  return <SourcingPageContent />;
}
