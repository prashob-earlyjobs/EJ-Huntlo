"use client";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

import { FeaturesGrid } from "./FeaturesGrid";
import { FinalCTA } from "./FinalCTA";
import { HeroSection } from "./HeroSection";
import { IntegrationSection } from "./IntegrationSection";
import { ProductShowcase } from "./ProductShowcase";
import { ValueSection } from "./ValueSection";
import { WorkflowSection } from "./WorkflowSection";

export function SourcingPageContent() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <LandingNav />
      <main className="pt-16">
        <HeroSection />
        <ValueSection />
        <FeaturesGrid />
        <WorkflowSection />
        <ProductShowcase />
        <IntegrationSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
