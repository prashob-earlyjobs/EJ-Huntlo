"use client";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

import { FinalCTA } from "./FinalCTA";
import { HeroSection } from "./HeroSection";
import { IntegrationsGrid } from "./IntegrationsGrid";
import { ValueSection } from "./ValueSection";

export function IntegrationsPageContent() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <LandingNav />
      <main className="overflow-hidden pt-16">
        <HeroSection />
        <IntegrationsGrid />
        <ValueSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
