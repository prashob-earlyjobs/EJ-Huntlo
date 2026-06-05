"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  SessionResultCandidateCard,
  type SessionResultCardData,
} from "@/components/dashboard/SessionResultCandidateCard";
import { CandidateSearchAgentOverlay } from "@/components/dashboard/CandidateSearchAgentOverlay";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { savePendingPublicSearch } from "@/lib/pendingPublicSearch";
import { searchPublicCandidates } from "@/lib/publicCandidatesApi";
import { sessionDocToCardData } from "@/lib/sessionResultUi";

export default function CandidatesPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const [candidates, setCandidates] = useState<SessionResultCardData[]>([]);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [totalMatched, setTotalMatched] = useState(0);
  const [loading, setLoading] = useState(Boolean(query));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) {
      setCandidates([]);
      setDisplayedCount(0);
      setTotalMatched(0);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setCandidates([]);
    setDisplayedCount(0);
    setTotalMatched(0);

    void searchPublicCandidates(query)
      .then((data) => {
        if (cancelled) return;
        const cards = (data.candidates ?? []).map((doc, idx) =>
          sessionDocToCardData(doc, idx, { includeLinkedIn: false })
        );
        setCandidates(cards);
        const listed =
          typeof data.displayedCount === "number" ? data.displayedCount : cards.length;
        setDisplayedCount(listed);
        setTotalMatched(
          typeof data.totalMatched === "number" ? data.totalMatched : listed
        );

        const futureJobsSessionId = data.futureJobsSessionId?.trim();
        if (futureJobsSessionId) {
          savePendingPublicSearch({
            futureJobsSessionId,
            prompt: data.prompt || query,
            filterForm: data.filterForm,
            sessionTitle: data.sessionTitle,
            totalMatched:
              typeof data.totalMatched === "number" ? data.totalMatched : listed,
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load candidate preview.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const displayQuery = query || "your search";
  const signupHref = query
    ? `/signup?from=candidates&q=${encodeURIComponent(query)}`
    : "/signup?from=candidates";
  const listedCount = displayedCount || candidates.length;
  const resultCountLabel = loading
    ? "Searching…"
    : `${(totalMatched || listedCount).toLocaleString()} candidate${
        (totalMatched || listedCount) === 1 ? "" : "s"
      }`;

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <CandidateSearchAgentOverlay open={loading} query={query} />
      <LandingNav />

      <main className="px-4 py-8 md:px-8 md:py-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <header className="dashboard-results-toolbar mb-6 md:mb-8">
            <div className="dashboard-results-toolbar-leading">
              <Link
                href="/"
                className="dashboard-btn-secondary dashboard-btn-icon"
                aria-label="Back to home"
              >
                <MaterialIcon name="arrow_back" className="text-xl" />
              </Link>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#141b2b] md:text-2xl">
                  <MaterialIcon name="groups" className="text-xl text-[#0050cb]" />
                  Candidate results
                </h1>
                <p className="mt-1 text-sm text-[#424656] md:text-base">
                  Matches for your search. Sign up to unlock contacts and run outreach.
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-[#424656]">
                  <span className="font-medium text-[#141b2b]">Query:</span> {displayQuery}
                </p>
              </div>
            </div>
            <div className="dashboard-results-toolbar-actions">
              <div className="dashboard-results-toolbar-meta">
                <span className="dashboard-results-toolbar-badge tabular-nums">
                  {resultCountLabel}
                </span>
              </div>
            </div>
          </header>

          {loading ? null : error ? (
            <div className="py-12 text-center">
              <MaterialIcon name="error_outline" className="mx-auto text-3xl text-[#b42318]" />
              <p className="mt-3 text-sm text-[#424656]">{error}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link href="/" className="dashboard-btn-secondary text-sm">
                  Back to home
                </Link>
                <Link href={signupHref} className="dashboard-btn-primary text-sm">
                  Sign up for full search
                </Link>
              </div>
            </div>
          ) : !query ? (
            <div className="py-12 text-center">
              <MaterialIcon name="search" className="mx-auto text-3xl text-[#0050cb]" />
              <p className="mt-3 text-sm text-[#424656]">
                Start from the home page to preview matching candidates.
              </p>
              <Link href="/" className="dashboard-btn-primary mt-4 text-sm">
                Go to home
              </Link>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center">
              <MaterialIcon name="person_search" className="mx-auto text-3xl text-[#0050cb]" />
              <p className="mt-3 text-sm text-[#424656]">
                No preview matches yet. Try a different query or sign up for the full search.
              </p>
              <Link href={signupHref} className="dashboard-btn-primary mt-4 text-sm">
                Sign up
              </Link>
            </div>
          ) : (
            <div className="dashboard-results-grid dashboard-results-grid--saved">
              {candidates.map((candidate) => (
                <SessionResultCandidateCard
                  key={candidate.id}
                  data={candidate}
                  variant="compact"
                  href={signupHref}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-end gap-2">
                      <Link
                        href={signupHref}
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                      >
                        <MaterialIcon name="mail" className="text-xs" />
                        Unlock email
                      </Link>
                      <Link
                        href={signupHref}
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                      >
                        <MaterialIcon name="call" className="text-xs" />
                        Unlock number
                      </Link>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
