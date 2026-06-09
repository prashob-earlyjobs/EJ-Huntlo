import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";
import { fetchPublicPricingPlans } from "@/lib/pricingPlans";

const title =
  "AI Recruiting OS for Sourcing, Outreach & Hiring Automation | Huntlo AI";
const description =
  "Hire faster with Agentic AI candidate sourcing, automated outreach across email and WhatsApp, AI voice screening, interview scheduling, and access to the EarlyJobs recruiter network.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  ogImage: OG_IMAGES.platform,
  path: "/",
});

export default async function Home() {
  const pricingPlans = await fetchPublicPricingPlans();
  return <LandingPage pricingPlans={pricingPlans} />;
}
