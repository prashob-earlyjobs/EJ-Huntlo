import type { Metadata } from "next";

import { AssessmentsPageContent } from "@/components/assessments/AssessmentsPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "AI Candidate Assessments | Huntlo Assessments";
const description =
  "Run role-based assessments, score candidates consistently, and advance qualified talent into interviews with clear skill signals.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/assessments",
});

export default function AssessmentsPage() {
  return <AssessmentsPageContent />;
}
