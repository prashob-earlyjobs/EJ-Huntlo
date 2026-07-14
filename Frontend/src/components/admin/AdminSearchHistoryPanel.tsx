"use client";

import {
  AdminUserSearchPicker,
  type AdminUserSearchOption,
} from "@/components/admin/AdminUserSearchPicker";
import {
  SearchHistoryTable,
  type SearchHistoryRow,
} from "@/components/dashboard/SearchHistoryTable";

type Props = {
  apiBase: string;
  token: string;
  rows: SearchHistoryRow[];
  loading: boolean;
  hydrated: boolean;
  error: string;
  selectedUser: AdminUserSearchOption | null;
  fromDate: string;
  toDate: string;
  onSelectedUserChange: (user: AdminUserSearchOption | null) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClearFilters: () => void;
  onOpenSession: (row: SearchHistoryRow) => void;
  onGoToCandidatePool: () => void;
};

export function AdminSearchHistoryPanel({
  apiBase,
  token,
  rows,
  loading,
  hydrated,
  error,
  selectedUser,
  fromDate,
  toDate,
  onSelectedUserChange,
  onFromDateChange,
  onToDateChange,
  onClearFilters,
  onOpenSession,
  onGoToCandidatePool,
}: Props) {
  const hasFilters = Boolean(selectedUser || fromDate || toDate);

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header shrink-0">
        <h3 className="flex items-center gap-2 dashboard-section-title">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#0050cb]">
            <path
              d="M12 8V12L15 15M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 3V8H8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Search history
        </h3>
        <p className="mt-1 dashboard-text-body">
          Every AI search across all users. Filter by who ran the search or date range, then open a
          session to review candidates in the candidate pool.
        </p>
      </div>

      <div className="admin-search-history-toolbar shrink-0">
        <div className="admin-search-history-toolbar-field admin-search-history-toolbar-field--user">
          <span className="admin-search-history-date-label">User</span>
          <AdminUserSearchPicker
            apiBase={apiBase}
            token={token}
            value={selectedUser}
            onChange={onSelectedUserChange}
            disabled={loading}
          />
        </div>
        <div className="admin-search-history-date-field">
          <label htmlFor="admin-history-from" className="admin-search-history-date-label">
            From
          </label>
          <input
            id="admin-history-from"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="admin-search-history-date-input"
            disabled={loading}
          />
        </div>
        <div className="admin-search-history-date-field">
          <label htmlFor="admin-history-to" className="admin-search-history-date-label">
            To
          </label>
          <input
            id="admin-history-to"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => onToDateChange(e.target.value)}
            className="admin-search-history-date-input"
            disabled={loading}
          />
        </div>
        {hasFilters ? (
          <button
            type="button"
            className="dashboard-btn-secondary self-end px-3 py-2 text-xs"
            onClick={onClearFilters}
            disabled={loading}
          >
            Clear filters
          </button>
        ) : null}
        {hydrated && rows.length > 0 ? (
          <span className="dashboard-badge tabular-nums self-end">
            {rows.length} session{rows.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="dashboard-card-body-scroll min-h-0">
        <SearchHistoryTable
          rows={hydrated ? rows : []}
          loading={loading || !hydrated}
          error={error}
          highlightSessionId={null}
          openingSessionId={null}
          onOpenSession={onOpenSession}
          onGoToSearch={onGoToCandidatePool}
          showSearchedBy
          emptyTitle="No searches yet"
          emptyDescription="When users run AI candidate searches, each session appears here with who ran it."
          emptyCtaLabel="View candidate pool"
        />
      </div>
    </section>
  );
}
