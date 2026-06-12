"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LandingFiltersPanel } from "./LandingFiltersPanel";
import { LandingMatchingCandidatesPanel } from "./LandingMatchingCandidatesPanel";
import { MaterialIcon } from "./MaterialIcon";
import { LandingPeopleScoutPanel } from "./LandingPeopleScoutPanel";

const SOURCING_FEATURES = [
  {
    id: "search",
    icon: "search",
    title: "AI-powered candidate sourcing",
    description:
      "Describe your ideal hire in plain English. Huntlo maps intent to talent across millions of profiles.",
  },
  {
    id: "filters",
    icon: "filter_alt",
    title: "Smart filters & scoring",
    description:
      "Refine by skills, location, experience, and company signals—with match scores you can trust.",
  },
  {
    id: "scout",
    icon: "person_search",
    title: "People Scout lookups",
    description:
      "Find a single profile by email or LinkedIn when you already know who you want to reach.",
  },
] as const;

const STEP_COUNT = SOURCING_FEATURES.length;

type FeatureId = (typeof SOURCING_FEATURES)[number]["id"];

function SourcingPanel({ featureId }: { featureId: FeatureId }) {
  if (featureId === "filters") return <LandingFiltersPanel />;
  if (featureId === "scout") return <LandingPeopleScoutPanel />;
  return <LandingMatchingCandidatesPanel />;
}

export function LandingProductSourcingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollDriven, setScrollDriven] = useState(true);
  const activeFeature = SOURCING_FEATURES[activeIndex] ?? SOURCING_FEATURES[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setScrollDriven(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const updateActiveFromScroll = useCallback(() => {
    const section = sectionRef.current;
    if (!section || !scrollDriven) return;

    const rect = section.getBoundingClientRect();
    const scrollRange = section.offsetHeight - window.innerHeight;
    if (scrollRange <= 0) return;

    const progress = Math.min(1, Math.max(0, -rect.top / scrollRange));
    const nextIndex = Math.min(STEP_COUNT - 1, Math.floor(progress * STEP_COUNT));

    setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex));
  }, [scrollDriven]);

  useEffect(() => {
    if (!scrollDriven) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveFromScroll();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateActiveFromScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollDriven, updateActiveFromScroll]);

  const goToStep = (index: number) => {
    setActiveIndex(index);

    const section = sectionRef.current;
    if (!section || !scrollDriven) return;

    const scrollRange = section.offsetHeight - window.innerHeight;
    if (scrollRange <= 0) return;

    const progress = (index + 0.5) / STEP_COUNT;
    const targetTop = window.scrollY + section.getBoundingClientRect().top + progress * scrollRange;

    window.scrollTo({ top: targetTop, behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      className={`scroll-mt-24 bg-white px-4 md:px-8 lg:px-12 ${
        scrollDriven ? "landing-sourcing-scroll-section" : "py-20"
      }`}
      id="product"
    >
      <div
        className={
          scrollDriven
            ? "landing-sourcing-scroll-sticky mx-auto max-w-7xl"
            : "mx-auto max-w-7xl"
        }
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
              Agentic AI Candidate Sourcing — Describe the Role, Get Matched Talent
            </h2>
            <ul className="mt-8 space-y-4" role="tablist" aria-label="Sourcing features">
              {SOURCING_FEATURES.map((feature, index) => {
                const isActive = activeIndex === index;
                return (
                  <li key={feature.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`sourcing-panel-${feature.id}`}
                      id={`sourcing-tab-${feature.id}`}
                      onClick={() => goToStep(index)}
                      className={`landing-sourcing-feature flex w-full gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300 ${
                        isActive
                          ? "border-[#0050cb]/30 bg-[#f1f3ff] shadow-sm shadow-[#0050cb]/10"
                          : "border-transparent bg-transparent hover:border-[#c3c6d6]/40 hover:bg-[#faf9ff]"
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                          isActive
                            ? "bg-[#0050cb] text-white shadow-md shadow-[#0050cb]/20"
                            : "bg-[#0050cb]/10 text-[#0050cb]"
                        }`}
                      >
                        <MaterialIcon name={feature.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`font-semibold transition-colors ${
                            isActive ? "text-[#0050cb]" : "text-[#141b2b]"
                          }`}
                        >
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-[#434654]">
                          {feature.description}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            role="tabpanel"
            id={`sourcing-panel-${activeFeature.id}`}
            aria-labelledby={`sourcing-tab-${activeFeature.id}`}
            className="landing-sourcing-panel-wrap min-h-[320px]"
          >
            <div key={activeFeature.id}>
              <SourcingPanel featureId={activeFeature.id} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
