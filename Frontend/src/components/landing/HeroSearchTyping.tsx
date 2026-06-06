"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "./MaterialIcon";

const HERO_FILTER_TAGS = ["Roles", "Skills", "Location", "Experience"] as const;

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
  const router = useRouter();
  const tier = useTypingTier();
  const phrases = phrasesForTier(tier);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [userValue, setUserValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const phrase = phrases[phraseIndex] ?? phrases[0];
  const hasUserQuery = Boolean(userValue.trim());
  const showTyping = !isEditing && !userValue;

  const goToCandidates = () => {
    const q = userValue.trim();
    if (!q) return;
    router.push(`/candidates?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    setPhraseIndex(0);
    setDisplay("");
    setIsDeleting(false);
  }, [tier]);

  useEffect(() => {
    if (!showTyping) return;

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
  }, [display, isDeleting, phrase, phrases.length, showTyping]);

  return (
    <div className="landing-hero-search landing-ambient-shadow mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-[#c3c6d6]/30 bg-white p-3 shadow-xl sm:mt-12 md:p-4">
      <div
        className="landing-hero-search-input-row py-3 md:px-4 md:py-4"
        onClick={() => inputRef.current?.focus()}
      >
        <MaterialIcon
          name="search"
          className="shrink-0 text-[20px] text-[#0050cb] sm:text-[22px] md:mt-0.5"
        />
        <div className="landing-hero-search-typing relative min-h-6 md:min-h-12">
          <p
            className={`landing-hero-search-typing-text absolute inset-x-0 top-0 pointer-events-none transition-opacity ${
              showTyping ? "opacity-100" : "opacity-0"
            }`}
            aria-live="polite"
            aria-hidden={!showTyping}
          >
            <span className="landing-hero-search-typing-value">{display}</span>
            <span className="landing-typing-cursor shrink-0 font-light text-[#0050cb]">
              |
            </span>
          </p>

          <input
            ref={inputRef}
            type="text"
            value={userValue}
            onChange={(e) => setUserValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasUserQuery) goToCandidates();
            }}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
              if (!userValue.trim()) setIsEditing(false);
            }}
            placeholder={showTyping ? "" : display}
            className="relative z-10 w-full min-w-0 border-none bg-transparent text-left text-sm leading-6 text-[#434654] caret-[#0050cb] outline-none md:text-[15px] md:leading-relaxed"
            aria-label="Describe who you want to hire"
          />
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
        <button
          type="button"
          onClick={goToCandidates}
          disabled={!hasUserQuery}
          className="landing-hero-search-footer-cta shrink-0 rounded-full bg-[#0050cb] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0050cb]/25 transition-colors hover:bg-[#003fa4] disabled:cursor-not-allowed disabled:bg-[#c3c6d6] disabled:text-white/90 disabled:shadow-none disabled:hover:bg-[#c3c6d6]"
        >
          Find Candidates
        </button>
      </div>
    </div>
  );
}
