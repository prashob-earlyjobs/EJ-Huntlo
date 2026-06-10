import type { Metadata } from "next";

import { CandidatePoolPageContent } from "@/components/candidate-pool/CandidatePoolPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "Candidate Pool | Huntlo";
const description =
  "Save and organize candidates from sourcing sessions, manage talent pipelines, and launch outreach from your workspace.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/candidate-pool",
});

export default function CandidatePoolPage() {
  return <CandidatePoolPageContent />;
}
