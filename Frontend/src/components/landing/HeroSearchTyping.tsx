"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MaterialIcon } from "./MaterialIcon";

const HERO_FILTER_TAGS = ["Roles", "Skills", "Experience"] as const;

const HERO_SEARCH_PHRASES_DESKTOP = [
  "Tell me who you want to hire — backend engineer in Berlin with 3+ years of experience...",
  "Find senior product managers in London with fintech and B2B SaaS experience...",
  "Source full-stack engineers open to remote work with React and Node.js backgrounds...",
] as const;

const HERO_SEARCH_PHRASES_MOBILE = [
  "Backend engineer in Berlin, 3+ years...",
  "Senior PM in London, fintech...",
  "Remote full-stack, React & Node...",
] as const;

const HERO_SEARCH_PHRASES_NARROW = [
  "backend engineers...",
  "Node.js developers 3 yrs...",
  "full-stack devs bangalore...",
] as const;

const TYPE_MS = 42;
const DELETE_MS = 22;
const PAUSE_FULL_MS = 2600;
const PAUSE_EMPTY_MS = 500;

type TypingTier = "desktop" | "mobile" | "narrow";

function useTypingTier(): TypingTier {
  const [tier, setTier] = useState<TypingTier>("desktop");

  useEffect(() => {
    const sync = () => {
      const width = window.innerWidth;
      if (width <= 400) {
        setTier("narrow");
      } else if (width <= 767) {
        setTier("mobile");
      } else {
        setTier("desktop");
      }
    };

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return tier;
}

function phrasesForTier(tier: TypingTier) {
  if (tier === "narrow") return HERO_SEARCH_PHRASES_NARROW;
  if (tier === "mobile") return HERO_SEARCH_PHRASES_MOBILE;
  return HERO_SEARCH_PHRASES_DESKTOP;
}

export function HeroSearchTyping() {
  const tier = useTypingTier();
  const phrases = phrasesForTier(tier);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const phrase = phrases[phraseIndex] ?? phrases[0];

  useEffect(() => {
    setPhraseIndex(0);
    setDisplay("");
    setIsDeleting(false);
  }, [tier]);

  useEffect(() => {
    if (!isDeleting && display.length === phrase.length) {
      const pause = setTimeout(() => setIsDeleting(true), PAUSE_FULL_MS);
      return () => clearTimeout(pause);
    }

    if (isDeleting && display.length === 0) {
      const pause = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      }, PAUSE_EMPTY_MS);
      return () => clearTimeout(pause);
    }

    const tick = setTimeout(
      () => {
        if (isDeleting) {
          setDisplay(phrase.slice(0, display.length - 1));
        } else {
          setDisplay(phrase.slice(0, display.length + 1));
        }
      },
      isDeleting ? DELETE_MS : TYPE_MS
    );

    return () => clearTimeout(tick);
  }, [display, isDeleting, phrase, phrases.length]);

  return (
    <div className="landing-hero-search landing-ambient-shadow mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-[#c3c6d6]/30 bg-white p-3 shadow-xl sm:mt-12 md:p-4">
      <div className="landing-hero-search-input-row py-3 md:px-4 md:py-4">
        <MaterialIcon
          name="search"
          className="shrink-0 text-[20px] text-[#0050cb] sm:text-[22px] md:mt-0.5"
        />
        <div className="landing-hero-search-typing">
          <p className="landing-hero-search-typing-text" aria-live="polite">
            <span className="landing-hero-search-typing-value">{display}</span>
            <span className="landing-typing-cursor shrink-0 font-light text-[#0050cb]">
              |
            </span>
          </p>
        </div>
      </div>

      <div className="mx-3 border-t border-[#c3c6d6]/35 md:mx-4" aria-hidden />

      <div className="landing-hero-search-footer px-3 py-3 md:px-4 md:py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {HERO_FILTER_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#f1f3ff] px-3 py-1 text-xs font-medium text-[#434654]"
            >
              {tag}
            </span>
          ))}
        </div>
        <Link
          href="/signup"
          className="landing-hero-search-footer-cta shrink-0 rounded-full bg-[#0050cb] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0050cb]/25 transition-colors hover:bg-[#003fa4]"
        >
          Find Candidates
        </Link>
      </div>
    </div>
  );
}
