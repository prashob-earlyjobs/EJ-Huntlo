"use client";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

import { AssessmentsPanel } from "./AssessmentsPanel";
import { FeaturesGrid } from "./FeaturesGrid";
import { FinalCTA } from "./FinalCTA";
import { HeroSection } from "./HeroSection";
import { IntegrationSection } from "./IntegrationSection";
import { ProductShowcase } from "./ProductShowcase";
import { ResultsSection } from "./ResultsSection";
import { ValueSection } from "./ValueSection";
import { WorkflowSection } from "./WorkflowSection";

export function AssessmentsPageContent() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <LandingNav />
      <main className="overflow-hidden pt-16">
        <HeroSection />
        <ValueSection />
        <FeaturesGrid />
        <WorkflowSection />
        <ProductShowcase />
        <AssessmentsPanel />
        <IntegrationSection />
        <ResultsSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
