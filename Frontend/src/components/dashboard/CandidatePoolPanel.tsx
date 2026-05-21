"use client";

import { type FormEvent } from "react";

import {
  SessionResultCandidateCard,
  type SessionResultCardData,
  type SessionResultHighlight,
} from "@/components/dashboard/SessionResultCandidateCard";
import { isOpenToWork } from "@/lib/openToWork";
import { RevealContactIconButton } from "@/components/dashboard/RevealContactIconButton";
import {
  SavedIconAction,
  SavedListSelect,
  type SavedCandidateRow,
} from "@/components/dashboard/SavedCandidatesPanel";
import { SavedCandidatesSkeleton } from "@/components/dashboard/SavedCandidatesSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type PoolSessionOption = {
  id: string;
  label: string;
};

export type PoolCandidateRow = {
  name: string;
  role: string;
  experience: string;
  location: string;
  skills: string;
  status: string;
  email: string;
  phone: string;
  id?: string;
  sourcingSessionId?: string;
  linkedin_profile_url?: string;
  currentCompany?: string;
  finalScore?: number | null;
  highlights?: string[];
  recommendation?: string;
  rawDoc?: SavedCandidateRow["rawDoc"];
  ownerLabel?: string;
  ownerUserId?: string;
};

function poolCompactSkillsText(candidate: PoolCandidateRow): string {
  const docSkills =
    candidate.rawDoc &&
    typeof candidate.rawDoc === "object" &&
    Array.isArray(candidate.rawDoc.profile?.skills)
      ? candidate.rawDoc.profile!.skills!
          .map((s) => String(s ?? "").trim())
          .filter(Boolean)
      : [];
  if (docSkills.length > 0) return docSkills.slice(0, 12).join(", ");

  const rowSkills =
    typeof candidate.skills === "string" && candidate.skills.trim() && candidate.skills !== "—"
      ? candidate.skills.trim()
      : "";
  return rowSkills;
}

function poolCompactAboutText(
  candidate: PoolCandidateRow,
  highlights?: SessionResultHighlight[]
): string {
  const fromRecommendation =
    typeof candidate.recommendation === "string" ? candidate.recommendation.trim() : "";
  if (fromRecommendation) return fromRecommendation;

  const docRec =
    candidate.rawDoc &&
    typeof candidate.rawDoc === "object" &&
    typeof candidate.rawDoc.profileAnalysis?.recommendation === "string"
      ? candidate.rawDoc.profileAnalysis.recommendation.trim()
      : "";
  if (docRec) return docRec;

  const fromHighlights = (highlights ?? [])
    .map((h) => String(h.Highlight || "").trim())
    .filter(Boolean);
  if (fromHighlights.length > 0) return fromHighlights.join(" · ");

  return "";
}

function applyOwnerLabelToCard(card: SessionResultCardData, candidate: PoolCandidateRow) {
  if (!candidate.ownerLabel?.trim()) return card;
  const owner = `Workspace: ${candidate.ownerLabel.trim()}`;
  card.compactAbout = card.compactAbout ? `${owner} · ${card.compactAbout}` : owner;
  return card;
}

function candidateRowToCardData(
  candidate: PoolCandidateRow,
  index: number
): SessionResultCardData {
  const doc = candidate.rawDoc;
  if (doc?.profile) {
    const current = doc.profile.current_employers_object?.[0];
    const highlights = doc.profileAnalysis?.highlights;
    const card: SessionResultCardData = {
      id: doc._id || candidate.id || `pool-${index}`,
      name: doc.profile.name || candidate.name,
      role: current?.job_title || candidate.role,
      company: current?.company_name || candidate.currentCompany,
      companyWebsiteDomain: current?.company_website_domain,
      companyWebsite: current?.company_website,
      openToWork: isOpenToWork(doc.profile.open_to_cards),
      region: doc.profile.region || candidate.location,
      yearsExperience: doc.profile.years_of_experience_raw,
      finalScore:
        typeof doc.finalScore === "number" ? doc.finalScore : candidate.finalScore ?? undefined,
      photoUrl: doc.profile.profile_picture_permalink,
      linkedinUrl: doc.profile.linkedin_profile_url || candidate.linkedin_profile_url,
      highlights,
      recommendation: doc.profileAnalysis?.recommendation || candidate.recommendation,
      strengths: doc.profileAnalysis?.analysis?.keyStrengths,
    };
    const skillsLine = poolCompactSkillsText(candidate);
    if (skillsLine) card.compactSkills = skillsLine;
    const about = poolCompactAboutText(candidate, highlights);
    if (about) card.compactAbout = about;
    return applyOwnerLabelToCard(card, candidate);
  }

  const yearsMatch = candidate.experience.match(/(\d+)/);
  const highlights: SessionResultHighlight[] | undefined =
    Array.isArray(candidate.highlights) && candidate.highlights.length > 0
      ? candidate.highlights.map((h) => ({ Highlight: h }))
      : undefined;

  const card: SessionResultCardData = {
    id: candidate.id || `pool-${index}`,
    name: candidate.name,
    role: candidate.role,
    company: candidate.currentCompany,
    region: candidate.location,
    yearsExperience: yearsMatch ? parseInt(yearsMatch[1], 10) : undefined,
    finalScore: candidate.finalScore ?? undefined,
    linkedinUrl: candidate.linkedin_profile_url,
    highlights,
    recommendation: candidate.recommendation,
  };
  const skillsLine = poolCompactSkillsText(candidate);
  if (skillsLine) card.compactSkills = skillsLine;
  const about = poolCompactAboutText(candidate, highlights);
  if (about) card.compactAbout = about;
  return applyOwnerLabelToCard(card, candidate);
}

type Props = {
  candidates: PoolCandidateRow[];
  totalDocs: number;
  totalAllDocs: number;
  totalInScope: number;
  searchInput: string;
  searchQuery: string;
  onSearchInputChange: (value: string) => void;
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sessionFilter: string;
  onSessionFilterChange: (value: string) => void;
  sessions: PoolSessionOption[];
  sessionsLoading: boolean;
  rowKey: (candidate: PoolCandidateRow) => string;
  identityKey: (candidate: PoolCandidateRow) => string;
  saveBusyKeys: string[];
  savedKeys: string[];
  revealedEmailKeys: string[];
  revealedPhoneKeys: string[];
  isRevealEmailBusy: (candidate: PoolCandidateRow) => boolean;
  isRevealPhoneBusy: (candidate: PoolCandidateRow) => boolean;
  onOpenDetail?: (candidate: PoolCandidateRow) => void;
  onToggleSave: (candidate: PoolCandidateRow) => void;
  onRevealEmail: (candidate: PoolCandidateRow) => void;
  onRevealPhone: (candidate: PoolCandidateRow) => void;
  getDisplayedEmail: (candidate: PoolCandidateRow) => string;
  getDisplayedPhone: (candidate: PoolCandidateRow) => string;
  onGoToSearch?: () => void;
  title?: string;
  subtitle?: string;
  userFilter?: string;
  onUserFilterChange?: (value: string) => void;
  users?: PoolSessionOption[];
  usersLoading?: boolean;
  readOnly?: boolean;
};

export function CandidatePoolPanel({
  candidates,
  totalDocs,
  totalAllDocs,
  totalInScope,
  searchInput,
  searchQuery,
  onSearchInputChange,
  loading,
  error,
  page,
  totalPages,
  onPageChange,
  sessionFilter,
  onSessionFilterChange,
  sessions,
  sessionsLoading,
  rowKey,
  identityKey,
  saveBusyKeys,
  savedKeys,
  revealedEmailKeys,
  revealedPhoneKeys,
  isRevealEmailBusy,
  isRevealPhoneBusy,
  onOpenDetail,
  onToggleSave,
  onRevealEmail,
  onRevealPhone,
  getDisplayedEmail,
  getDisplayedPhone,
  onGoToSearch,
  title = "All searched candidates",
  subtitle = "Every candidate from your sourcing searches, newest first. Filter by search or candidate details.",
  userFilter = "__all__",
  onUserFilterChange,
  users = [],
  usersLoading = false,
  readOnly = false,
}: Props) {
  const filterLabel =
    sessionFilter === "__all__"
      ? "All searches"
      : sessions.find((s) => s.id === sessionFilter)?.label ?? "Search";

  const userFilterLabel =
    userFilter === "__all__"
      ? "All users"
      : users.find((u) => u.id === userFilter)?.label ?? "User";

  const sessionFilterOptions = [
    { value: "__all__", label: "All searches" },
    ...sessions.map((s) => ({ value: s.id, label: s.label })),
  ];

  const userFilterOptions = [
    { value: "__all__", label: "All users" },
    ...users.map((u) => ({ value: u.id, label: u.label })),
  ];

  const appliedSearch = searchQuery.trim();
  const hasSearch = appliedSearch.length > 0;
  const badgeTitle = hasSearch
    ? `${totalDocs.toLocaleString()} matches for “${appliedSearch}” (${totalInScope.toLocaleString()} in ${filterLabel}${onUserFilterChange ? ` · ${userFilterLabel}` : ""})`
    : `${totalAllDocs.toLocaleString()} candidates${onUserFilterChange ? ` · ${userFilterLabel}` : " across all searches"}`;
  const badgeText = hasSearch
    ? `${totalDocs.toLocaleString()} match${totalDocs === 1 ? "" : "es"}`
    : `${totalAllDocs.toLocaleString()} total`;

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearchInputChange(searchInput.trim());
  };

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
      <div className="dashboard-results-toolbar dashboard-results-toolbar--saved">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="groups" className="text-xl text-[#0050cb]" />
            {title}
          </h3>
          <p className="mt-1 dashboard-text-body">{subtitle}</p>
        </div>

        <div className="dashboard-saved-header-actions">
          <span
            className="dashboard-saved-header-badge tabular-nums"
            title={badgeTitle}
          >
            {badgeText}
          </span>

          {onUserFilterChange ? (
            <SavedListSelect
              wrapClassName="dashboard-saved-filter-select-wrap"
              value={userFilter}
              onChange={(e) => onUserFilterChange(e.target.value)}
              disabled={usersLoading}
              ariaLabel="Filter by user"
              options={userFilterOptions}
            />
          ) : null}

          <SavedListSelect
            wrapClassName="dashboard-saved-filter-select-wrap"
            value={sessionFilter}
            onChange={(e) => onSessionFilterChange(e.target.value)}
            disabled={sessionsLoading}
            ariaLabel="Filter by search"
            options={sessionFilterOptions}
          />
        </div>
      </div>

      <form className="dashboard-pool-search mt-4" onSubmit={handleSearchSubmit}>
        <MaterialIcon name="search" className="dashboard-pool-search-icon" aria-hidden />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Search by name, role, company, skills, location…"
          className="dashboard-pool-search-input"
          aria-label="Search candidates in pool"
        />
        {searchInput.trim() ? (
          <button
            type="button"
            onClick={() => onSearchInputChange("")}
            className="dashboard-pool-search-clear"
            aria-label="Clear search"
          >
            <MaterialIcon name="close" className="text-base" />
          </button>
        ) : null}
      </form>

      {error ? <p className="mt-4 dashboard-alert-error">{error}</p> : null}
      </div>

      <div className="dashboard-card-body-scroll">
      {loading ? (
        <SavedCandidatesSkeleton count={6} />
      ) : totalInScope === 0 && !hasSearch ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-state-icon">
            <MaterialIcon name="person_search" className="text-[28px]" />
          </div>
          <p className="mt-4 text-base font-semibold text-[#141b2b]">No candidates yet</p>
          <p className="mt-2 max-w-sm text-sm text-[#424656]">
            Run a People Scout or AI search to discover candidates. They will appear here in
            your pool.
          </p>
          {onGoToSearch ? (
            <button type="button" onClick={onGoToSearch} className="dashboard-btn-primary mt-6">
              <MaterialIcon name="search" className="text-base" />
              Search candidates
            </button>
          ) : null}
        </div>
      ) : totalDocs === 0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-state-icon">
            <MaterialIcon
              name={hasSearch ? "search_off" : "filter_alt_off"}
              className="text-[28px]"
            />
          </div>
          <p className="mt-4 text-base font-semibold text-[#141b2b]">
            {hasSearch ? "No candidates match your search" : "No matches for this filter"}
          </p>
          <p className="mt-2 max-w-sm text-sm text-[#424656]">
            {hasSearch
              ? `No results for “${appliedSearch}”. Try a different name, role, company, or skill.`
              : "Try another search session or view all candidates in your pool."}
          </p>
          {hasSearch ? (
            <button
              type="button"
              onClick={() => onSearchInputChange("")}
              className="dashboard-btn-secondary mt-6"
            >
              Clear search
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSessionFilterChange("__all__")}
              className="dashboard-btn-secondary mt-6"
            >
              View all searches
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="dashboard-results-grid dashboard-results-grid--saved mt-6">
            {candidates.map((candidate, idx) => {
              const key = identityKey(candidate);
              const busy = saveBusyKeys.includes(key);
              const isSaved = savedKeys.includes(key);
              const emailRevealed = revealedEmailKeys.includes(rowKey(candidate));
              const phoneRevealed = revealedPhoneKeys.includes(rowKey(candidate));
              const canOpen = Boolean(onOpenDetail);

              return (
                <SessionResultCandidateCard
                  key={key || candidate.name}
                  data={candidateRowToCardData(candidate, idx)}
                  variant="compact"
                  interactive={canOpen}
                  onSelect={canOpen ? () => onOpenDetail?.(candidate) : undefined}
                  footer={
                    <>
                      <div
                        className="dashboard-saved-card-footer dashboard-saved-card-footer--spread"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div
                          className="dashboard-saved-card-actions dashboard-saved-card-actions--spread"
                          role="group"
                          aria-label="Candidate actions"
                        >
                          {!readOnly ? (
                            <RevealContactIconButton
                              icon="mail"
                              tip={
                                emailRevealed
                                  ? getDisplayedEmail(candidate) || "Email"
                                  : "Reveal email"
                              }
                              ariaLabel="Reveal email"
                              revealed={emailRevealed}
                              busy={isRevealEmailBusy(candidate)}
                              onClick={() => onRevealEmail(candidate)}
                            />
                          ) : null}
                          {!readOnly ? (
                            <RevealContactIconButton
                              icon="call"
                              tip={
                                phoneRevealed
                                  ? getDisplayedPhone(candidate) || "Phone"
                                  : "Reveal phone"
                              }
                              ariaLabel="Reveal phone"
                              revealed={phoneRevealed}
                              busy={isRevealPhoneBusy(candidate)}
                              onClick={() => onRevealPhone(candidate)}
                            />
                          ) : null}
                          {candidate.linkedin_profile_url ? (
                            <SavedIconAction tip="Open LinkedIn">
                              <a
                                href={candidate.linkedin_profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open LinkedIn profile"
                                className="dashboard-table-icon-btn dashboard-table-icon-btn--sm"
                              >
                                <MaterialIcon name="work" />
                              </a>
                            </SavedIconAction>
                          ) : null}
                          {canOpen ? (
                            <SavedIconAction tip="View full profile">
                              <button
                                type="button"
                                aria-label="View full profile"
                                onClick={() => onOpenDetail?.(candidate)}
                                className="dashboard-table-icon-btn dashboard-table-icon-btn--sm dashboard-table-icon-btn--primary"
                              >
                                <MaterialIcon name="open_in_new" />
                              </button>
                            </SavedIconAction>
                          ) : null}
                          {!readOnly ? (
                            <SavedIconAction
                              tip={isSaved ? "Remove from saved" : "Save candidate"}
                            >
                              <button
                                type="button"
                                aria-label={isSaved ? "Remove from saved" : "Save candidate"}
                                onClick={() => onToggleSave(candidate)}
                                disabled={busy}
                                className={`dashboard-table-icon-btn dashboard-table-icon-btn--sm${
                                  isSaved ? " dashboard-table-icon-btn--active" : ""
                                } disabled:opacity-50`}
                              >
                                <MaterialIcon name={isSaved ? "bookmark" : "bookmark_add"} />
                              </button>
                            </SavedIconAction>
                          ) : null}
                        </div>
                      </div>
                      {emailRevealed || phoneRevealed ? (
                        <div className="dashboard-saved-revealed mt-2">
                          {emailRevealed ? (
                            <p className="dashboard-table-revealed">
                              <span className="text-[#424656]">Email </span>
                              {getDisplayedEmail(candidate) || "—"}
                            </p>
                          ) : null}
                          {phoneRevealed ? (
                            <p className="dashboard-table-revealed">
                              <span className="text-[#424656]">Phone </span>
                              {getDisplayedPhone(candidate) || "—"}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="dashboard-pagination dashboard-pagination--compact mt-6">
              <p className="dashboard-pagination-label tabular-nums">
                Page {page} of {totalPages}
                <span className="text-[#424656]/80">
                  {" "}
                  · {totalDocs.toLocaleString()} in {filterLabel}
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className="dashboard-btn-secondary dashboard-btn-secondary--sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-busy={loading}
                >
                  <MaterialIcon name="chevron_left" className="text-sm" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={loading || page >= totalPages}
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className="dashboard-btn-secondary dashboard-btn-secondary--sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <MaterialIcon name="chevron_right" className="text-sm" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
      </div>
    </section>
  );
}
