"use client";

import { useEffect, useState, type FormEvent } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { nameInitials } from "@/lib/sessionResultUi";

export type PeopleScoutRecentUser = {
  id: string;
  name: string;
  role: string;
  location: string;
  company: string;
  lastSearchedAt: string;
  linkedinUrl: string;
  thumbnailUrl?: string;
  profile?: Record<string, unknown> | null;
  scoutId?: string;
};

function greetingFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

function RecentAvatar({ name, thumbnailUrl }: { name: string; thumbnailUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = typeof thumbnailUrl === "string" ? thumbnailUrl.trim() : "";
  const showImage = Boolean(url) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  return (
    <div className="dashboard-table-avatar" aria-hidden>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- LinkedIn / scout CDN URLs
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : (
        nameInitials(name)
      )}
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div
      className="dashboard-people-scout-recent-grid"
      aria-busy="true"
      aria-label="Loading recent searches"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`people-scout-skeleton-${i}`}
          className="rounded-xl border border-[color-mix(in_srgb,var(--dash-outline)_45%,transparent)] bg-white/90 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="dashboard-shimmer h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="dashboard-shimmer h-4 w-[85%] max-w-44 rounded" />
                <div className="dashboard-shimmer h-3 w-[60%] max-w-32 rounded" />
              </div>
            </div>
            <div className="dashboard-shimmer h-5 w-14 shrink-0 rounded-full" />
          </div>
          <div className="dashboard-shimmer mt-3 h-3 w-[75%] max-w-56 rounded" />
          <div className="dashboard-shimmer mt-3 h-8 w-28 rounded-md" />
        </div>
      ))}
    </div>
  );
}

type Props = {
  userDisplayName: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  error: string;
  recentList: PeopleScoutRecentUser[];
  recentLoading: boolean;
  onOpenRecent: (user: PeopleScoutRecentUser) => void;
};

export function PeopleScoutPanel({
  userDisplayName,
  query,
  onQueryChange,
  onSearch,
  loading,
  error,
  recentList,
  recentLoading,
  onOpenRecent,
}: Props) {
  const firstName = greetingFirstName(userDisplayName);
  const canSearch = query.trim().length > 0 && !loading;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSearch) onSearch();
  };

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
      <div className="dashboard-results-toolbar">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="person_search" className="text-xl text-[#0050cb]" />
            People Scout
          </h3>
          <p className="mt-1 dashboard-text-body">
            Look up any professional by LinkedIn URL, username, or email.
          </p>
        </div>
        {!recentLoading && recentList.length > 0 ? (
          <span className="dashboard-badge tabular-nums">
            {recentList.length} recent
          </span>
        ) : null}
      </div>
      </div>

      <div className="dashboard-card-body-scroll">
      <div className="dashboard-people-scout-hero mt-6">
        <p className="dashboard-people-scout-greeting">
          Hey {firstName}, who are you looking for?
        </p>
        <p className="mt-2 dashboard-text-body">
          Paste a LinkedIn URL or type a username / email to find any professional.
        </p>

        <form onSubmit={handleSubmit} className="dashboard-people-scout-search mt-5">
          <div className="dashboard-people-scout-search-field">
            <MaterialIcon
              name="link"
              className="dashboard-people-scout-search-field-icon text-[20px]"
              aria-hidden
            />
            <input
              id="peopleScoutQuery"
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Paste a LinkedIn URL or type a username / email"
              disabled={loading}
              autoComplete="off"
              className="dashboard-people-scout-search-input disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={!canSearch}
            className="dashboard-btn-primary dashboard-people-scout-search-btn disabled:opacity-55"
          >
            <MaterialIcon name="search" className="text-base" />
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error ? <p className="mt-3 dashboard-alert-error">{error}</p> : null}

        {loading ? (
          <div className="dashboard-people-scout-loading" role="status" aria-live="polite">
            <span className="dashboard-people-scout-loading-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span>Finding profile across professional networks…</span>
          </div>
        ) : null}
      </div>

      <div className="dashboard-people-scout-divider">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h4 className="flex items-center gap-2 dashboard-label-upper">
              <MaterialIcon name="history" className="text-base text-[#0050cb]" />
              Recent searches
            </h4>
            <p className="mt-1 dashboard-text-body">
              Professionals you have looked up — saved to your account.
            </p>
          </div>
        </div>

        {recentLoading ? (
          <RecentSkeleton />
        ) : recentList.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-state-icon">
              <MaterialIcon name="manage_search" className="text-[28px]" />
            </div>
            <p className="mt-4 text-base font-semibold text-[#141b2b]">No lookups yet</p>
            <p className="mt-2 max-w-sm text-sm text-[#424656]">
              Search by email or LinkedIn URL above. Your recent lookups will appear here.
            </p>
          </div>
        ) : (
          <div className="dashboard-people-scout-recent-grid">
            {recentList.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onOpenRecent(user)}
                className="dashboard-people-scout-recent-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <RecentAvatar name={user.name} thumbnailUrl={user.thumbnailUrl} />
                    <div className="min-w-0 text-left">
                      <span className="dashboard-table-candidate-name block truncate">
                        {user.name}
                      </span>
                      <span className="dashboard-table-candidate-sub block truncate">
                        {user.role || "—"}
                      </span>
                    </div>
                  </div>
                  <span className="dashboard-chip shrink-0 tabular-nums">{user.lastSearchedAt}</span>
                </div>
                {(user.company || user.location) && (
                  <p className="dashboard-people-scout-recent-meta line-clamp-1">
                    {user.company ? (
                      <>
                        <MaterialIcon name="business" className="text-sm opacity-70" />
                        <span className="truncate">{user.company}</span>
                      </>
                    ) : null}
                    {user.company && user.location ? (
                      <span className="opacity-40" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    {user.location ? (
                      <>
                        <MaterialIcon name="location_on" className="text-sm opacity-70" />
                        <span className="truncate">{user.location}</span>
                      </>
                    ) : null}
                  </p>
                )}
                <div className="dashboard-people-scout-recent-footer">
                  <span className="text-xs font-medium text-[#0050cb]">View profile</span>
                  <MaterialIcon name="arrow_forward" className="text-base text-[#0050cb]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
