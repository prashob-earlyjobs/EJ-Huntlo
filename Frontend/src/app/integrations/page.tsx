import type { Metadata } from "next";

import { IntegrationsPageContent } from "@/components/integrations/IntegrationsPageContent";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "Integrations | Huntlo";
const description =
  "Connect Gmail, WhatsApp, Calendly, and more to run candidate outreach and scheduling from one recruiting workspace.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/integrations",
});

export default function IntegrationsPage() {
  return <IntegrationsPageContent />;
}
