"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MaterialIcon } from "./MaterialIcon";

const HERO_FILTER_TAGS = ["Roles", "Skills", "Location", "Experience"] as const;

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
  const router = useRouter();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [userValue, setUserValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const phrase = HERO_SEARCH_PHRASES[phraseIndex] ?? HERO_SEARCH_PHRASES[0];
  const hasUserQuery = Boolean(userValue.trim());

  const goToCandidates = () => {
    const q = userValue.trim();
    if (!q) return;
    router.push(`/candidates?q=${encodeURIComponent(q)}`);
  };

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
      <div
        className="flex items-start gap-3 px-3 py-3 md:px-4 md:py-4"
        onClick={() => inputRef.current?.focus()}
      >
        <MaterialIcon
          name="search"
          className="mt-0.5 shrink-0 text-[22px] text-[#0050cb]"
        />
        <div className="relative min-h-6 flex-1">
          {/* Animated typing text (shown when not actively editing) */}
          <p
            className="pointer-events-none absolute inset-0 flex items-center text-left text-sm leading-relaxed text-[#434654] md:text-[15px]"
            aria-live="polite"
            aria-hidden={isEditing || Boolean(userValue)}
          >
            <span className={isEditing || userValue ? "opacity-0" : "opacity-100"}>
              {display}
            </span>
            <span
              className={`landing-typing-cursor ml-0.5 inline-block font-light text-[#0050cb] ${
                isEditing || userValue ? "opacity-0" : "opacity-100"
              }`}
            >
              |
            </span>
          </p>

          {/* Actual editable search input */}
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
              // When user clears the field and blurs, go back to animated copy
              if (!userValue.trim()) setIsEditing(false);
            }}
            placeholder={isEditing || userValue ? "" : display}
            className="relative z-10 w-full border-none bg-transparent text-left text-sm leading-relaxed text-[#434654] caret-[#0050cb] outline-none md:text-[15px]"
            aria-label="Describe who you want to hire"
          />
        </div>
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
        <button
          type="button"
          onClick={goToCandidates}
          disabled={!hasUserQuery}
          className="shrink-0 rounded-full bg-[#0050cb] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0050cb]/25 transition-colors hover:bg-[#003fa4] disabled:cursor-not-allowed disabled:bg-[#c3c6d6] disabled:text-white/90 disabled:shadow-none disabled:hover:bg-[#c3c6d6]"
        >
          Find Candidates
        </button>
      </div>
    </div>
  );
}
