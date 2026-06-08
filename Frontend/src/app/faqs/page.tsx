import type { Metadata } from "next";

import { FaqsPageContent } from "@/components/landing/FaqsPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "Frequently Asked Questions About Huntlo AI Recruiting OS";
const description =
  "Find answers about Huntlo's AI recruiting platform, candidate sourcing, outreach automation, screening, interviews, integrations, pricing, security, and implementation.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.faqs,
  path: "/faqs",
});

export default function FaqsPage() {
  return <FaqsPageContent />;
}
