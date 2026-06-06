import { Suspense } from "react";

import { CandidateSearchAgentOverlay } from "@/components/dashboard/CandidateSearchAgentOverlay";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

import { CandidatesPageContent } from "./CandidatesPageContent";

function CandidatesPageFallback() {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <CandidateSearchAgentOverlay open query="" />
      <LandingNav />
      <main className="px-4 py-8 md:px-8 md:py-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="h-24 animate-pulse rounded-xl bg-[#f1f3ff]" />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<CandidatesPageFallback />}>
      <CandidatesPageContent />
    </Suspense>
  );
}
