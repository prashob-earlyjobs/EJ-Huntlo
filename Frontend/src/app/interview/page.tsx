import type { Metadata } from "next";

import { InterviewPageContent } from "@/components/interview/InterviewPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "AI Interview Coordination | Huntlo Interview";
const description =
  "Coordinate interviews, capture structured feedback, evaluate candidates consistently, and move hiring decisions forward faster.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/interview",
});

export default function InterviewPage() {
  return <InterviewPageContent />;
}
