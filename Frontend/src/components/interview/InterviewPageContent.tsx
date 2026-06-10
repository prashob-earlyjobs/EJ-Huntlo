"use client";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

import { DecisionSection } from "./DecisionSection";
import { FeaturesGrid } from "./FeaturesGrid";
import { FinalCTA } from "./FinalCTA";
import { Hero } from "./Hero";
import { Integration } from "./Integration";
import { InterviewPanel } from "./InterviewPanel";
import { ProductShowcase } from "./ProductShowcase";
import { ValueSection } from "./ValueSection";
import { Workflow } from "./Workflow";

export function InterviewPageContent() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <LandingNav />
      <main className="overflow-hidden pt-16">
        <Hero />
        <ValueSection />
        <FeaturesGrid />
        <Workflow />
        <ProductShowcase />
        <InterviewPanel />
        <Integration />
        <DecisionSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
