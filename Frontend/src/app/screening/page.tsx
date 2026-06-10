import type { Metadata } from "next";

import { ScreeningPageContent } from "@/components/screening/ScreeningPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "AI Candidate Screening | Huntlo Screening";
const description =
  "Automate candidate screening, evaluate qualifications against role criteria, and surface qualified talent before interviews.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/screening",
});

export default function ScreeningPage() {
  return <ScreeningPageContent />;
}
