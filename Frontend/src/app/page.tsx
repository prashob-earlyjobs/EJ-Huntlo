import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { fetchPublicPricingPlans } from "@/lib/pricingPlans";

export const metadata: Metadata = {
  title: "Huntlo | World-Class AI Recruiting Infrastructure",
  description:
    "Orchestrate entire talent pipelines with autonomous agents. The infrastructure that powers high-performing hiring teams.",
};

export default async function Home() {
  const pricingPlans = await fetchPublicPricingPlans();
  return <LandingPage pricingPlans={pricingPlans} />;
}
