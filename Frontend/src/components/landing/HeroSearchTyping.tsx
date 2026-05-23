"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MaterialIcon } from "./MaterialIcon";

const HERO_FILTER_TAGS = ["Roles", "Skills", "Experience"] as const;

const HERO_SEARCH_PHRASES = [
  "Tell me who you want to hire — backend engineer in Berlin with 3+ years of experience...",
  "Find senior product managers in London with fintech and B2B SaaS experience...",
  "Source full-stack engineers open to remote work with React and Node.js backgrounds...",
] as const;

const TYPE_MS = 42;
const DELETE_MS = 22;
const PAUSE_FULL_MS = 2600;
const PAUSE_EMPTY_MS = 500;

export function HeroSearchTyping() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const phrase = HERO_SEARCH_PHRASES[phraseIndex] ?? HERO_SEARCH_PHRASES[0];

  useEffect(() => {
    if (!isDeleting && display.length === phrase.length) {
      const pause = setTimeout(() => setIsDeleting(true), PAUSE_FULL_MS);
      return () => clearTimeout(pause);
    }

    if (isDeleting && display.length === 0) {
      const pause = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % HERO_SEARCH_PHRASES.length);
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
  }, [display, isDeleting, phrase]);

  return (
    <div className="landing-hero-search landing-ambient-shadow mx-auto mt-12 w-full max-w-3xl rounded-2xl border border-[#c3c6d6]/30 bg-white p-3 shadow-xl md:p-4">
      <div className="flex items-start gap-3 px-3 py-3 md:px-4 md:py-4">
        <MaterialIcon
          name="search"
          className="mt-0.5 shrink-0 text-[22px] text-[#0050cb]"
        />
        <p
          className="min-h-6 flex-1 text-left text-sm leading-relaxed text-[#434654] md:text-[15px]"
          aria-live="polite"
        >
          <span>{display}</span>
          <span className="landing-typing-cursor ml-0.5 inline-block font-light text-[#0050cb]">
            |
          </span>
        </p>
      </div>

      <div className="mx-3 border-t border-[#c3c6d6]/35 md:mx-4" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-3.5">
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
          className="shrink-0 rounded-full bg-[#0050cb] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0050cb]/25 transition-colors hover:bg-[#003fa4]"
        >
          Find Candidates
        </Link>
      </div>
    </div>
  );
}
