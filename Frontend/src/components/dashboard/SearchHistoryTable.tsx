"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type SearchHistoryRow = {
  id: string;
  futureJobsSessionId: string;
  userId?: string;
  searchedByName?: string;
  searchedByEmail?: string;
  prompt: string;
  sessionTitle: string;
  usingSessionOverride: boolean;
  futureJobsStatus: string;
  totalDocs: number | null;
  candidateCountFirstPage: number;
  candidatePreview: {
    id: string;
    sourcingSessionId?: string;
    linkedin_profile_url?: string;
    name: string;
    role: string;
    location: string;
    status: string;
  }[];
  profilesFetchError: string | null;
  createdAt: string;
  updatedAt: string;
};

type WhenLabel = { primary: string; secondary: string; title: string };

type StatusTone = "success" | "pending" | "warning" | "neutral";

function formatWhen(iso: string): WhenLabel {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { primary: "—", secondary: "", title: "" };
  }

  const full = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);

  let primary: string;
  if (mins < 1) primary = "Just now";
  else if (mins < 60) primary = `${mins}m ago`;
  else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) primary = `${hours}h ago`;
    else {
      const days = Math.floor(hours / 24);
      if (days < 7) primary = `${days}d ago`;
      else {
        primary = date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
        });
      }
    }
  }

  const secondary = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return { primary, secondary, title: full };
}

function statusTone(raw: string): StatusTone {
  const s = raw.trim().toLowerCase();
  if (!s || s === "—") return "neutral";
  if (
    s.includes("complete") ||
    s.includes("done") ||
    s.includes("success") ||
    s.includes("ready") ||
    s === "ok"
  ) {
    return "success";
  }
  if (
    s.includes("pend") ||
    s.includes("run") ||
    s.includes("progress") ||
    s.includes("process") ||
    s.includes("queue")
  ) {
    return "pending";
  }
  if (s.includes("fail") || s.includes("error") || s.includes("warn")) {
    return "warning";
  }
  return "neutral";
}

function statusLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return "Unknown";
  return t.replace(/_/g, " ");
}

function SessionStatusBadge({
  status,
  hasWarning,
}: {
  status: string;
  hasWarning: boolean;
}) {
  if (hasWarning) {
    return (
      <span className="dashboard-status dashboard-status--warning">
        <span className="dashboard-status-dot" aria-hidden />
        Profiles warning
      </span>
    );
  }

  const tone = statusTone(status);
  return (
    <span className={`dashboard-status dashboard-status--${tone}`}>
      <span className="dashboard-status-dot" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

function HistoryTableSkeleton({ showSearchedBy }: { showSearchedBy: boolean }) {
  return (
    <div className="dashboard-thin-scrollbar mt-6 overflow-x-auto">
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>When</th>
            {showSearchedBy ? <th>Searched by</th> : null}
            <th>Search</th>
            <th>Preview</th>
            <th className="tabular-nums">Results</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, idx) => (
            <tr key={`history-skeleton-${idx}`}>
              <td>
                <div className="dashboard-shimmer h-4 w-20" />
                <div className="dashboard-shimmer mt-1.5 h-3 w-14" />
              </td>
              {showSearchedBy ? (
                <td>
                  <div className="dashboard-shimmer h-4 w-24 max-w-full" />
                </td>
              ) : null}
              <td>
                <div className="dashboard-shimmer h-4 w-48 max-w-full" />
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  <div className="dashboard-shimmer h-6 w-16 rounded-full" />
                  <div className="dashboard-shimmer h-6 w-20 rounded-full" />
                </div>
              </td>
              <td>
                <div className="dashboard-shimmer h-4 w-10" />
              </td>
              <td>
                <div className="dashboard-shimmer h-6 w-20 rounded-full" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function promptText(row: SearchHistoryRow): string {
  return (
    row.prompt ||
    row.sessionTitle ||
    (row.usingSessionOverride ? "Custom session payload" : "Untitled search")
  );
}

type Props = {
  rows: SearchHistoryRow[];
  loading: boolean;
  error: string;
  highlightSessionId: string | null;
  openingSessionId: string | null;
  onOpenSession: (row: SearchHistoryRow) => void;
  onGoToSearch: () => void;
  showSearchedBy?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCtaLabel?: string;
};

export function SearchHistoryTable({
  rows,
  loading,
  error,
  highlightSessionId,
  openingSessionId,
  onOpenSession,
  onGoToSearch,
  showSearchedBy = false,
  emptyTitle = "No searches yet",
  emptyDescription = "Run your first AI candidate search to build your sourcing history. Each session is saved automatically.",
  emptyCtaLabel = "Start searching",
}: Props) {
  const [unavailableRow, setUnavailableRow] = useState<SearchHistoryRow | null>(null);

  if (loading && rows.length === 0) {
    return <HistoryTableSkeleton showSearchedBy={showSearchedBy} />;
  }

  if (error) {
    return <p className="mt-4 dashboard-alert-error">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <div className="dashboard-empty-state-icon">
          <MaterialIcon name="history" className="text-[28px]" />
        </div>
        <p className="mt-4 text-base font-semibold text-[#141b2b]">{emptyTitle}</p>
        <p className="mt-2 max-w-sm text-sm text-[#424656]">{emptyDescription}</p>
        <button type="button" onClick={onGoToSearch} className="dashboard-btn-primary mt-6">
          <MaterialIcon name="search" className="text-base" />
          {emptyCtaLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={[
          "dashboard-thin-scrollbar mt-6 overflow-x-auto",
          loading && rows.length > 0 ? "dashboard-table-wrap--refreshing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="dashboard-table-wrap">
        <table className="dashboard-table" role="grid">
          <thead>
            <tr>
              <th scope="col">When</th>
              {showSearchedBy ? <th scope="col">Searched by</th> : null}
              <th scope="col">Search</th>
              <th scope="col">Preview</th>
              <th scope="col" className="tabular-nums">
                Results
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const when = formatWhen(row.createdAt);
              const label = promptText(row);
              const isHighlighted = highlightSessionId === row.id;
              const isOpening = Boolean(openingSessionId) && openingSessionId === row.id;
              const hasPreviewCandidates = row.candidatePreview.length > 0;
              const previewShown = Math.min(3, row.candidatePreview.length);
              const previewMore = Math.max(0, row.candidatePreview.length - previewShown);
              const totalResults =
                row.totalDocs != null && row.totalDocs > previewShown
                  ? row.totalDocs
                  : null;
              const moreCount =
                totalResults != null ? totalResults - previewShown : previewMore;
              const moreTitle =
                totalResults != null
                  ? `${totalResults.toLocaleString()} total candidates · ${previewShown} names shown`
                  : `${previewMore} more in preview`;

              const handleOpen = () => {
                if (isOpening) return;
                if (!hasPreviewCandidates) {
                  setUnavailableRow(row);
                  return;
                }
                onOpenSession(row);
              };

              return (
                <tr
                  id={`history-session-${row.id}`}
                  key={row.id}
                  className={[
                    "dashboard-table-row--clickable",
                    isHighlighted ? "dashboard-table-row--highlight" : "",
                    isOpening ? "dashboard-table-row--disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  tabIndex={isOpening ? -1 : 0}
                  onClick={handleOpen}
                  onKeyDown={(e) => {
                    if (isOpening) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpen();
                    }
                  }}
                  aria-disabled={isOpening}
                  aria-label={
                    hasPreviewCandidates
                      ? `Open search session: ${label}`
                      : `View unavailable candidates message for search session: ${label}`
                  }
                >
                <td title={when.title}>
                  <span className="dashboard-table-when-primary">{when.primary}</span>
                  {when.secondary ? (
                    <span className="dashboard-table-when-secondary">{when.secondary}</span>
                  ) : null}
                </td>
                {showSearchedBy ? (
                  <td className="max-w-48">
                    <span
                      className="dashboard-table-prompt line-clamp-2"
                      title={
                        [row.searchedByName, row.searchedByEmail].filter(Boolean).join(" · ") ||
                        "—"
                      }
                    >
                      {row.searchedByName?.trim() || "—"}
                    </span>
                    {row.searchedByEmail?.trim() ? (
                      <span className="dashboard-table-when-secondary line-clamp-1">
                        {row.searchedByEmail.trim()}
                      </span>
                    ) : null}
                  </td>
                ) : null}
                <td className="max-w-[18rem]">
                  <p className="dashboard-table-prompt line-clamp-2" title={label}>
                    {label}
                  </p>
                </td>
                <td className="max-w-[16rem]">
                  {row.candidatePreview.length === 0 ? (
                    <span className="text-xs text-[#424656]">No preview saved</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {row.candidatePreview.slice(0, 3).map((c) => (
                        <span
                          key={`${row.id}:${c.id || c.name}`}
                          className="dashboard-chip"
                          title={[c.name, c.role, c.location].filter(Boolean).join(" · ")}
                        >
                          {c.name || "Unknown"}
                        </span>
                      ))}
                      {moreCount > 0 ? (
                        <span className="dashboard-chip dashboard-chip--more" title={moreTitle}>
                          +{moreCount.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="tabular-nums">
                  <span className="dashboard-table-metric">
                    {row.totalDocs != null ? row.totalDocs.toLocaleString() : "—"}
                  </span>
                </td>
                <td>
                  <SessionStatusBadge
                    status={row.futureJobsStatus}
                    hasWarning={Boolean(row.profilesFetchError)}
                  />
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {unavailableRow ? (
        <div
          className="dashboard-modal-overlay px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-history-unavailable-title"
        >
          <div className="w-full max-w-[20rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <MaterialIcon name="info" className="text-lg" />
              </span>
              <div className="min-w-0 flex-1">
                <h3
                  id="search-history-unavailable-title"
                  className="text-sm font-semibold text-[#141b2b]"
                >
                  No candidates found
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-[#5f667a]">
                  This search has no saved candidates to open.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full cursor-pointer rounded-lg bg-[#0050cb] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#003f9f]"
              onClick={() => setUnavailableRow(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
