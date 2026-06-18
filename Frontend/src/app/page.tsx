import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { HOMEPAGE_FAQS } from "@/lib/homepageFaqs";
import {
  faqPageJsonLd,
  homeOrganizationSoftwareGraphJsonLd,
  webSiteJsonLd,
} from "@/lib/jsonLd";
import { fetchPublicPricingPlans } from "@/lib/pricingPlans";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

const title = "Agentic AI Recruiting Infrastructure for Hiring Teams | Huntlo";
const description =
  "Huntlo's agentic AI recruiting infrastructure sources, engages & screens candidates autonomously — email, WhatsApp, AI voice. Start free.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/",
});

export default async function Home() {
  const pricingPlans = await fetchPublicPricingPlans();
  return (
    <>
      <JsonLd
        data={[
          homeOrganizationSoftwareGraphJsonLd(),
          webSiteJsonLd(),
          faqPageJsonLd(HOMEPAGE_FAQS),
        ]}
      />
      <LandingPage pricingPlans={pricingPlans} />
    </>
  );
}
