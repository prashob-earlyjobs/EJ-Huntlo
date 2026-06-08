"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

import { HeroSearchPromptWarningModal } from "@/components/landing/HeroSearchPromptWarningModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { checkHeroPromptWithBackend } from "@/lib/heroPromptCheckApi";
import {
  detectHeroQueryDimensions,
  hasMinimumHeroQueryDimensions,
  HERO_TAG_TO_DIMENSION,
} from "@/lib/heroQueryDimensions";

const PROMPT_DIMENSION_TAGS = ["Roles", "Skills", "Location", "Experience"] as const;

export type RecentAiSearchItem = {
  id: string;
  futureJobsSessionId: string;
  text: string;
  totalDocs: number | null;
  createdAt?: string;
};

function greetingFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

function formatRecentWhen(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RecentSkeleton() {
  return (
    <ul className="dashboard-ai-search-recent-list" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={`ai-search-recent-skel-${i}`}>
          <div className="dashboard-ai-search-recent-card dashboard-ai-search-recent-card--static">
            <div className="dashboard-shimmer h-4 w-[90%] max-w-md rounded" />
            <div className="dashboard-shimmer mt-2 h-3 w-24 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  userDisplayName: string;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onSearch: () => void;
  searchLoading: boolean;
  searchError: string;
  profilesWarning: string;
  recentSearches: RecentAiSearchItem[];
  recentLoading: boolean;
  onOpenRecent: (item: RecentAiSearchItem) => void;
  onViewAllHistory: () => void;
};

export function SearchCandidatesPanel({
  userDisplayName,
  aiPrompt,
  onAiPromptChange,
  onSearch,
  searchLoading,
  searchError,
  profilesWarning,
  recentSearches,
  recentLoading,
  onOpenRecent,
  onViewAllHistory,
}: Props) {
  const firstName = greetingFirstName(userDisplayName);
  const trimmedPrompt = aiPrompt.trim();
  const [incompleteWarningOpen, setIncompleteWarningOpen] = useState(false);
  const [promptCheckLoading, setPromptCheckLoading] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const queryDimensions = useMemo(
    () => detectHeroQueryDimensions(aiPrompt),
    [aiPrompt]
  );
  const canSearch =
    trimmedPrompt.length > 0 && !searchLoading && !promptCheckLoading;

  const requestSearch = async () => {
    const q = trimmedPrompt;
    if (!q || searchLoading || promptCheckLoading) return;

    if (!hasMinimumHeroQueryDimensions(queryDimensions)) {
      setIncompleteWarningOpen(true);
      return;
    }

    setPromptCheckLoading(true);
    try {
      const result = await checkHeroPromptWithBackend(q);
      if (result.allPresent) {
        onSearch();
        return;
      }
      setIncompleteWarningOpen(true);
    } catch {
      // If AI verification is unavailable, proceed — FE rule-based check already passed.
      onSearch();
    } finally {
      setPromptCheckLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSearch) void requestSearch();
  };

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="manage_search" className="text-xl text-[#0050cb]" />
            Search Candidates
          </h3>
          <p className="mt-1 mb-3 dashboard-text-body">
            Describe who you need — AI builds filters and finds matching profiles.
          </p>
        </div>
      </div>

      <div className="dashboard-card-body-scroll">
        <div className="dashboard-people-scout-hero mt-2">
          <p className="dashboard-people-scout-greeting">
            Hey {firstName}, who should we find today?
          </p>
          <p className="mt-2 dashboard-text-body">
            Use natural language — role, skills, location, experience, and availability.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="dashboard-ai-prompt-field">
              <div className="dashboard-ai-prompt-field-header">
                <MaterialIcon name="auto_awesome" className="text-[18px] text-[#0050cb]" aria-hidden />
                <span className="text-sm font-medium text-[#141b2b]">AI search prompt</span>
              </div>
              <textarea
                ref={promptRef}
                id="aiPrompt"
                value={aiPrompt}
                onChange={(e) => onAiPromptChange(e.target.value)}
                placeholder="Example: Find candidates with 3+ years Node.js experience in Hyderabad who can join in 30 days."
                rows={7}
                disabled={searchLoading || promptCheckLoading}
                className="dashboard-ai-prompt-textarea disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PROMPT_DIMENSION_TAGS.map((tag) => {
                const dimension = HERO_TAG_TO_DIMENSION[tag];
                const detected = dimension ? queryDimensions[dimension] : false;
                return (
                  <span
                    key={tag}
                    className={`landing-hero-search-chip rounded-full px-3 py-1 text-xs ${
                      detected
                        ? "landing-hero-search-chip--detected"
                        : "landing-hero-search-chip--default"
                    }`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={!trimmedPrompt || searchLoading || promptCheckLoading}
                onClick={() => onAiPromptChange("")}
                className="dashboard-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={!canSearch}
                className="dashboard-btn-primary dashboard-people-scout-search-btn px-5 disabled:opacity-55"
              >
                <MaterialIcon name="tune" className="text-base" />
                {promptCheckLoading
                  ? "Checking…"
                  : searchLoading
                    ? "Preparing…"
                    : "Continue to filters"}
              </button>
            </div>
          </form>

          <HeroSearchPromptWarningModal
            open={incompleteWarningOpen}
            onEdit={() => {
              setIncompleteWarningOpen(false);
              requestAnimationFrame(() => promptRef.current?.focus());
            }}
            onContinue={() => {
              setIncompleteWarningOpen(false);
              onSearch();
            }}
          />

          {searchError ? <p className="mt-3 dashboard-alert-error">{searchError}</p> : null}
          {profilesWarning ? (
            <p className="mt-3 dashboard-alert-warning">
              Session created, but profiles could not be loaded: {profilesWarning}
            </p>
          ) : null}

          {searchLoading ? (
            <div className="dashboard-people-scout-loading mt-4" role="status" aria-live="polite">
              <span className="dashboard-people-scout-loading-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span>Creating your sourcing session and loading candidates…</span>
            </div>
          ) : null}
        </div>

        <div className="dashboard-people-scout-divider">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 dashboard-label-upper">
                <MaterialIcon name="history" className="text-base text-[#0050cb]" />
                Recent AI searches
              </h4>
              <p className="mt-1 dashboard-text-body">
                Pick up where you left off or review past sourcing sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={onViewAllHistory}
              className="dashboard-btn-secondary px-3 py-1.5 text-xs"
            >
              <MaterialIcon name="history" className="text-sm" />
              View all history
            </button>
          </div>

          {recentLoading ? (
            <RecentSkeleton />
          ) : recentSearches.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state-icon">
                <MaterialIcon name="travel_explore" className="text-[28px]" />
              </div>
              <p className="mt-4 text-base font-semibold text-[#141b2b]">No searches yet</p>
              <p className="mt-2 max-w-sm text-sm text-[#424656]">
                Run your first AI search above. Your recent prompts will appear here for quick
                access.
              </p>
            </div>
          ) : (
            <ul className="dashboard-ai-search-recent-list">
              {recentSearches.map((item) => {
                const when = formatRecentWhen(item.createdAt);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenRecent(item)}
                      className="dashboard-ai-search-recent-card"
                    >
                      <span className="dashboard-ai-search-recent-icon" aria-hidden>
                        <MaterialIcon name="search" className="text-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="dashboard-table-prompt line-clamp-2">{item.text}</span>
                        <span className="dashboard-ai-search-recent-meta">
                          {when ? <span>{when}</span> : null}
                          {item.totalDocs != null ? (
                            <span className="tabular-nums">
                              {when ? " · " : ""}
                              {item.totalDocs.toLocaleString()} candidates
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <MaterialIcon
                        name="arrow_forward"
                        className="dashboard-ai-search-recent-arrow shrink-0 text-[20px]"
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
