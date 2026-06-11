"use client";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPeopleScoutPanel } from "@/components/landing/LandingPeopleScoutPanel";

import { FeaturesGrid } from "./FeaturesGrid";
import { FinalCTA } from "./FinalCTA";
import { HeroSection } from "./HeroSection";
import { ValueSection } from "./ValueSection";

export function PeopleScoutPageContent() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <LandingNav />
      <main className="overflow-hidden pt-16">
        <HeroSection />
        <ValueSection />
        <section className="px-4 py-12 sm:px-6 max-w-5xl mx-auto">
          <LandingPeopleScoutPanel />
        </section>
        <FeaturesGrid />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
