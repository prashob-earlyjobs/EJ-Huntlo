import type { Metadata } from "next";

import { SourcingPageContent } from "@/components/sourcing/SourcingPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "Agentic AI Candidate Sourcing — Find Talent Faster | Huntlo";
const description =
  "Huntlo's agentic AI sourcing searches 50+ platforms using natural language — no Boolean filters. Qualified candidates matched and enriched instantly. Try free.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/sourcing",
});

export default function SourcingPage() {
  return <SourcingPageContent />;
}
