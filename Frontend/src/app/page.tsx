import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { fetchPublicPricingPlans } from "@/lib/pricingPlans";

export const metadata: Metadata = {
  title: "AI Recruiting OS for Sourcing, Outreach & Hiring Automation | Huntlo AI",
  description:
    "Hire faster with Agentic AI candidate sourcing, automated outreach across email and WhatsApp, AI voice screening, interview scheduling, and access to the EarlyJobs recruiter network.",
};

export default async function Home() {
  const pricingPlans = await fetchPublicPricingPlans();
  return <LandingPage pricingPlans={pricingPlans} />;
}
