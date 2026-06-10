import type { Metadata } from "next";

import { PeopleScoutPageContent } from "@/components/people-scout/PeopleScoutPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "People Scout | Huntlo";
const description =
  "Look up individual candidate profiles, reveal contact details, and move targeted talent into outreach workflows.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/people-scout",
});

export default function PeopleScoutPage() {
  return <PeopleScoutPageContent />;
}
