import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { fetchPublicPricingPlans } from "@/lib/pricingPlans";

export const metadata: Metadata = {
  title: "Huntlo | AI-Powered Outbound Recruiting",
  description:
    "Stop posting jobs and waiting. Reach top talent in seconds with AI-powered sourcing, outreach, and contact reveal.",
};

export default async function Home() {
  const pricingPlans = await fetchPublicPricingPlans();
  return <LandingPage pricingPlans={pricingPlans} />;
}
