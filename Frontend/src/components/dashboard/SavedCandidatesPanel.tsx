"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import {
  SessionResultCandidateCard,
  type SessionResultCardData,
  type SessionResultHighlight,
} from "@/components/dashboard/SessionResultCandidateCard";
import { RevealContactIconButton } from "@/components/dashboard/RevealContactIconButton";
import { SavedCandidatesSkeleton } from "@/components/dashboard/SavedCandidatesSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
type SavedRawDoc = {
  _id?: string;
  sourcingSessionId?: string;
  finalScore?: number;
  profile?: {
    name?: string;
    region?: string;
    years_of_experience_raw?: number;
    linkedin_profile_url?: string;
    profile_picture_permalink?: string;
    skills?: string[];
    current_employers_object?: {
      company_name?: string;
      job_title?: string;
    }[];
  };
  profileAnalysis?: {
    highlights?: SessionResultHighlight[];
    recommendation?: string;
    analysis?: {
      keyStrengths?: { observation?: string; evidence?: string }[];
    };
  };
};

export type SaveListRow = {
  id: string;
  name: string;
};

export type SavedCandidateRow = {
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
  rawDoc?: SavedRawDoc | null;
  saveListId?: string;
};

export function SavedIconAction({
  tip,
  children,
}: {
  tip: string;
  children: ReactNode;
}) {
  return (
    <span className="dashboard-icon-tip" data-tip={tip}>
      {children}
    </span>
  );
}

function listLabel(saveListId: string, saveLists: SaveListRow[]): string {
  if (!saveListId.trim()) return "General";
  return saveLists.find((l) => l.id === saveListId)?.name ?? "List";
}

type SavedListSelectOption = { value: string; label: string };

export function SavedListSelect({
  value,
  onChange,
  disabled,
  options,
  ariaLabel,
  wrapClassName = "",
  onClick,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  options: SavedListSelectOption[];
  ariaLabel: string;
  wrapClassName?: string;
  onClick?: (event: ReactMouseEvent<HTMLSelectElement>) => void;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <div
      className={`dashboard-saved-list-select-wrap${wrapClassName ? ` ${wrapClassName}` : ""}`}
    >
      <select
        value={value}
        onChange={onChange}
        onClick={onClick}
        disabled={disabled}
        className="dashboard-saved-list-select"
        aria-label={ariaLabel}
        title={selectedLabel}
      >
        {options.map((option) => (
          <option key={option.value || "__empty"} value={option.value} title={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function candidateRowToCardData(candidate: SavedCandidateRow, index: number): SessionResultCardData {
  const doc = candidate.rawDoc;
  if (doc?.profile) {
    const current = doc.profile.current_employers_object?.[0];
    return {
      id: doc._id || candidate.id || `saved-${index}`,
      name: doc.profile.name || candidate.name,
      role: current?.job_title || candidate.role,
      company: current?.company_name || candidate.currentCompany,
      region: doc.profile.region || candidate.location,
      yearsExperience: doc.profile.years_of_experience_raw,
      finalScore: typeof doc.finalScore === "number" ? doc.finalScore : candidate.finalScore ?? undefined,
      photoUrl: doc.profile.profile_picture_permalink,
      linkedinUrl: doc.profile.linkedin_profile_url || candidate.linkedin_profile_url,
      highlights: doc.profileAnalysis?.highlights,
      recommendation: doc.profileAnalysis?.recommendation || candidate.recommendation,
      strengths: doc.profileAnalysis?.analysis?.keyStrengths,
    };
  }

  const yearsMatch = candidate.experience.match(/(\d+)/);
  const highlights: SessionResultHighlight[] | undefined =
    Array.isArray(candidate.highlights) && candidate.highlights.length > 0
      ? candidate.highlights.map((h) => ({ Highlight: h }))
      : undefined;

  return {
    id: candidate.id || `saved-${index}`,
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
}

type Props = {
  candidates: SavedCandidateRow[];
  totalSavedCount: number;
  filteredTotalDocs: number;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  saveListFilter: string;
  onSaveListFilterChange: (value: string) => void;
  saveLists: SaveListRow[];
  saveListsLoading: boolean;
  newSaveListName: string;
  onNewSaveListNameChange: (value: string) => void;
  onCreateSaveList: () => void;
  createSaveListBusy: boolean;
  onDeleteSaveList: (listId: string) => void;
  deleteSaveListBusyId: string | null;
  saveTargetListId: string;
  onSaveTargetListChange: (listId: string) => void;
  rowKey: (candidate: SavedCandidateRow) => string;
  identityKey: (candidate: SavedCandidateRow) => string;
  saveBusyKeys: string[];
  revealedEmailKeys: string[];
  revealedPhoneKeys: string[];
  isRevealEmailBusy: (candidate: SavedCandidateRow) => boolean;
  isRevealPhoneBusy: (candidate: SavedCandidateRow) => boolean;
  onOpenDetail?: (candidate: SavedCandidateRow) => void;
  onUnsave: (candidate: SavedCandidateRow) => void;
  onMoveList: (candidate: SavedCandidateRow, listId: string) => void;
  onRevealEmail: (candidate: SavedCandidateRow) => void;
  onRevealPhone: (candidate: SavedCandidateRow) => void;
  getDisplayedEmail: (candidate: SavedCandidateRow) => string;
  getDisplayedPhone: (candidate: SavedCandidateRow) => string;
  onGoToSessionResults: () => void;
};

export function SavedCandidatesPanel({
  candidates,
  totalSavedCount,
  filteredTotalDocs,
  loading,
  page,
  totalPages,
  onPageChange,
  saveListFilter,
  onSaveListFilterChange,
  saveLists,
  saveListsLoading,
  newSaveListName,
  onNewSaveListNameChange,
  onCreateSaveList,
  createSaveListBusy,
  onDeleteSaveList,
  deleteSaveListBusyId,
  saveTargetListId,
  onSaveTargetListChange,
  rowKey,
  identityKey,
  saveBusyKeys,
  revealedEmailKeys,
  revealedPhoneKeys,
  isRevealEmailBusy,
  isRevealPhoneBusy,
  onOpenDetail,
  onUnsave,
  onMoveList,
  onRevealEmail,
  onRevealPhone,
  getDisplayedEmail,
  getDisplayedPhone,
  onGoToSessionResults,
}: Props) {
  const [listsMenuOpen, setListsMenuOpen] = useState(false);
  const listsMenuRef = useRef<HTMLDivElement>(null);
  const listsMenuId = useId();

  const filterLabel =
    saveListFilter === "__all__"
      ? "All saved"
      : saveListFilter === "__general__"
        ? "General"
        : listLabel(saveListFilter, saveLists);

  const canDeleteActiveList =
    saveListFilter !== "__all__" && saveListFilter !== "__general__";

  useEffect(() => {
    if (!listsMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!listsMenuRef.current?.contains(event.target as Node)) {
        setListsMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setListsMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [listsMenuOpen]);

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
      <div className="dashboard-results-toolbar dashboard-results-toolbar--saved">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="bookmark" className="text-xl text-[#0050cb]" />
            Saved candidates
          </h3>
          <p className="mt-1 dashboard-text-body">
            Shortlisted profiles you marked for follow-up. Organize them into custom lists.
          </p>
        </div>

        <div className="dashboard-saved-header-actions">
          <span
            className="dashboard-saved-header-badge tabular-nums"
            title={`${totalSavedCount} saved candidates`}
          >
            {totalSavedCount} saved
          </span>

          <SavedListSelect
            wrapClassName="dashboard-saved-filter-select-wrap"
            value={saveListFilter}
            onChange={(e) => onSaveListFilterChange(e.target.value)}
            ariaLabel="Filter by list"
            options={[
              { value: "__all__", label: "All saved" },
              { value: "__general__", label: "General" },
              ...saveLists.map((list) => ({ value: list.id, label: list.name })),
            ]}
          />

          <div className="dashboard-saved-lists-menu-wrap" ref={listsMenuRef}>
            <button
              type="button"
              onClick={() => setListsMenuOpen((open) => !open)}
              className={`dashboard-saved-lists-trigger${
                listsMenuOpen ? " dashboard-saved-lists-trigger--open" : ""
              }`}
              aria-expanded={listsMenuOpen}
              aria-controls={listsMenuId}
              aria-haspopup="dialog"
              title="Manage saved lists"
            >
              <MaterialIcon name="playlist_add" />
              <span className="dashboard-saved-lists-trigger-label">Manage lists</span>
              <MaterialIcon
                name="expand_more"
                className={`dashboard-saved-lists-trigger-chevron${
                  listsMenuOpen ? " dashboard-saved-lists-trigger-chevron--open" : ""
                }`}
              />
            </button>

            {listsMenuOpen ? (
              <div
                id={listsMenuId}
                role="dialog"
                aria-label="Manage saved lists"
                className="dashboard-saved-lists-menu"
              >
                <p className="dashboard-label-upper">Lists</p>

                <label className="dashboard-saved-menu-field">
                  <span className="dashboard-label">New list</span>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={newSaveListName}
                      onChange={(e) => onNewSaveListNameChange(e.target.value)}
                      placeholder="e.g. Senior engineers"
                      maxLength={120}
                      className="dashboard-input dashboard-input-sm min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={onCreateSaveList}
                      disabled={createSaveListBusy || !newSaveListName.trim()}
                      className="dashboard-btn-primary shrink-0 px-3 disabled:opacity-55"
                    >
                      <MaterialIcon name="add" className="text-base" />
                      {createSaveListBusy ? "…" : "Add"}
                    </button>
                  </div>
                </label>

                <label className="dashboard-saved-menu-field">
                  <span className="dashboard-label">Default list for new saves</span>
                  <SavedListSelect
                    wrapClassName="dashboard-saved-list-select-wrap--menu mt-1"
                    value={saveTargetListId}
                    onChange={(e) => onSaveTargetListChange(e.target.value)}
                    disabled={saveListsLoading}
                    ariaLabel="Default list for new saves"
                    options={[
                      { value: "", label: "General" },
                      ...saveLists.map((l) => ({ value: l.id, label: l.name })),
                    ]}
                  />
                </label>

                {canDeleteActiveList ? (
                  <button
                    type="button"
                    onClick={() => onDeleteSaveList(saveListFilter)}
                    disabled={deleteSaveListBusyId === saveListFilter}
                    className="dashboard-btn-secondary mt-1 w-full justify-center text-[#b91c1c] hover:border-red-200 hover:bg-red-50 disabled:opacity-55"
                  >
                    <MaterialIcon name="delete_outline" className="text-base" />
                    {deleteSaveListBusyId === saveListFilter
                      ? "Deleting…"
                      : `Delete “${filterLabel}”`}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>

      <div className="dashboard-card-body-scroll">
      {loading ? (
        <SavedCandidatesSkeleton count={6} />
      ) : totalSavedCount === 0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-state-icon">
            <MaterialIcon name="bookmark_border" className="text-[28px]" />
          </div>
          <p className="mt-4 text-base font-semibold text-[#141b2b]">No saved candidates yet</p>
          <p className="mt-2 max-w-sm text-sm text-[#424656]">
            Save profiles from Session Results to build your shortlist. They will appear here
            with AI insights and contact actions.
          </p>
          <button type="button" onClick={onGoToSessionResults} className="dashboard-btn-primary mt-6">
            <MaterialIcon name="groups" className="text-base" />
            Go to session results
          </button>
        </div>
      ) : filteredTotalDocs === 0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-state-icon">
            <MaterialIcon name="folder_open" className="text-[28px]" />
          </div>
          <p className="mt-4 text-base font-semibold text-[#141b2b]">No candidates in this list</p>
          <p className="mt-2 max-w-sm text-sm text-[#424656]">
            Try another list or move saved profiles into &ldquo;{filterLabel}&rdquo; from the card
            actions.
          </p>
          <button
            type="button"
            onClick={() => onSaveListFilterChange("__all__")}
            className="dashboard-btn-secondary mt-6"
          >
            View all saved
          </button>
        </div>
      ) : (
        <>
        <div className="dashboard-results-grid dashboard-results-grid--saved mt-6">
          {candidates.map((candidate, idx) => {
            const key = identityKey(candidate);
            const busy = saveBusyKeys.includes(key);
            const emailRevealed = revealedEmailKeys.includes(rowKey(candidate));
            const phoneRevealed = revealedPhoneKeys.includes(rowKey(candidate));
            const canOpen = Boolean(onOpenDetail && candidate.rawDoc);

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
                      className="dashboard-saved-card-footer"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <SavedListSelect
                        wrapClassName="dashboard-saved-list-select-wrap--card"
                        value={String(candidate.saveListId || "")}
                        onChange={(e) => onMoveList(candidate, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={busy}
                        ariaLabel={`Move ${candidate.name} to list`}
                        options={[
                          { value: "", label: "General" },
                          ...saveLists.map((l) => ({ value: l.id, label: l.name })),
                        ]}
                      />

                      <div
                        className="dashboard-saved-card-actions"
                        role="group"
                        aria-label="Saved candidate actions"
                      >
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
                        <SavedIconAction tip="Remove from saved">
                          <button
                            type="button"
                            aria-label="Remove from saved"
                            onClick={() => onUnsave(candidate)}
                            disabled={busy}
                            className="dashboard-table-icon-btn dashboard-table-icon-btn--sm dashboard-table-icon-btn--danger disabled:opacity-50"
                          >
                            <MaterialIcon name="bookmark_remove" />
                          </button>
                        </SavedIconAction>
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
          <div className="dashboard-pagination mt-6">
            <p className="dashboard-pagination-label tabular-nums">
              Page {page} of {totalPages}
              <span className="text-[#424656]/80">
                {" "}
                · {filteredTotalDocs.toLocaleString()} in this view
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                aria-busy={loading}
              >
                <MaterialIcon name="chevron_left" className="text-base" />
                Previous
              </button>
              <button
                type="button"
                disabled={loading || page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <MaterialIcon name="chevron_right" className="text-base" />
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
