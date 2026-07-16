"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Select, {
  type GroupBase,
  type SingleValue,
  type StylesConfig,
} from "react-select";

import {
  SessionResultCandidateCard,
  type SessionResultCardData,
  type SessionResultHighlight,
} from "@/components/dashboard/SessionResultCandidateCard";
import { isOpenToWork } from "@/lib/openToWork";
import { RevealContactIconButton } from "@/components/dashboard/RevealContactIconButton";
import { SavedCandidatesSkeleton } from "@/components/dashboard/SavedCandidatesSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
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
    open_to_cards?: string[];
    skills?: string[];
    current_employers_object?: {
      company_name?: string;
      job_title?: string;
      company_website?: string;
      company_website_domain?: string;
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

function SavedCardListControl({
  candidateName,
  currentListId,
  options,
  disabled,
  open,
  menuId,
  onToggle,
  onClose,
  onSelect,
}: {
  candidateName: string;
  currentListId: string;
  options: SavedListSelectOption[];
  disabled?: boolean;
  open: boolean;
  menuId: string;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (listId: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);
  const [listSearch, setListSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setListSearch("");
      return;
    }
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, listSearch]);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(220, Math.min(280, Math.max(rect.width, 220)));
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      const estimatedHeight = Math.min(320, 56 + Math.max(filteredOptions.length, 1) * 36);
      let top = rect.bottom + 6;
      if (top + estimatedHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - estimatedHeight - 6);
      }
      setMenuPos({ top, left, width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, filteredOptions.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const label = listLabel(currentListId, options.map((o) => ({ id: o.value, name: o.label })));

  return (
    <div className="dashboard-saved-card-list" ref={wrapRef}>
      <span className="dashboard-saved-card-list-name" title={label}>
        {label}
      </span>
      <button
        type="button"
        className="dashboard-saved-card-list-change"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="listbox"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        Change
      </button>
      {open && mounted && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="dashboard-saved-card-list-menu dashboard-saved-card-list-menu--portal"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dashboard-saved-card-list-search">
                <MaterialIcon name="search" className="dashboard-saved-card-list-search-icon" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search lists"
                  aria-label={`Search lists for ${candidateName}`}
                  className="dashboard-saved-card-list-search-input"
                  autoComplete="off"
                />
              </div>
              <div
                role="listbox"
                aria-label={`Choose list for ${candidateName}`}
                className="dashboard-saved-card-list-options"
              >
                {filteredOptions.length === 0 ? (
                  <p className="dashboard-saved-card-list-empty">No lists match</p>
                ) : (
                  filteredOptions.map((option) => {
                    const selected = currentListId === option.value;
                    return (
                      <button
                        key={option.value || "__general__"}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={disabled || selected}
                        className={`dashboard-saved-card-list-option${
                          selected ? " dashboard-saved-card-list-option--active" : ""
                        }`}
                        onClick={() => {
                          onClose();
                          if (!selected) onSelect(option.value);
                        }}
                      >
                        <span className="truncate">{option.label}</span>
                        {selected ? (
                          <MaterialIcon
                            name="check"
                            className="shrink-0 text-base text-[#0050cb]"
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

type SavedListSelectOption = { value: string; label: string };

const savedFilterSelectStyles: StylesConfig<
  SavedListSelectOption,
  false,
  GroupBase<SavedListSelectOption>
> = {
  container: (base) => ({ ...base, width: "100%", minWidth: "9.5rem" }),
  control: (base, state) => ({
    ...base,
    minHeight: "2rem",
    borderRadius: "0.5rem",
    borderWidth: 1,
    borderColor: state.isFocused
      ? "var(--dash-primary, #0050cb)"
      : "color-mix(in srgb, var(--dash-outline) 58%, transparent)",
    backgroundColor: state.isDisabled ? "#f8f9fa" : "#fff",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(0, 80, 203, 0.12)" : "none",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    "&:hover": {
      borderColor: state.isDisabled
        ? base.borderColor
        : "color-mix(in srgb, var(--dash-primary, #0050cb) 45%, transparent)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 0.5rem",
  }),
  singleValue: (base) => ({
    ...base,
    margin: 0,
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#141b2b",
  }),
  placeholder: (base) => ({
    ...base,
    margin: 0,
    fontSize: "0.8125rem",
    color: "#94a3b8",
  }),
  input: (base) => ({ ...base, margin: 0, padding: 0, fontSize: "0.8125rem" }),
  indicatorsContainer: (base) => ({ ...base, height: "2rem" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 0.4rem",
    color: "#64748b",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "0 0.25rem",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 10_000 }),
  menu: (base) => ({
    ...base,
    marginTop: 6,
    borderRadius: "0.75rem",
    border: "1px solid #e8eaed",
    boxShadow: "0 12px 32px rgba(20, 27, 43, 0.14)",
    overflow: "hidden",
    zIndex: 10_000,
  }),
  menuList: (base) => ({ ...base, padding: 6, maxHeight: 260 }),
  option: (base, state) => ({
    ...base,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: "0.8125rem",
    fontWeight: state.isSelected ? 600 : 450,
    color: state.isSelected ? "var(--dash-primary, #0050cb)" : "#141b2b",
    backgroundColor: state.isSelected
      ? "#e8f0fe"
      : state.isFocused
        ? "#f8f9fa"
        : "transparent",
    cursor: "pointer",
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    color: "#80868b",
    padding: "10px",
  }),
};

function SavedFilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SavedListSelectOption[];
  ariaLabel: string;
}) {
  const selected =
    options.find((option) => option.value === value) ?? options[0] ?? null;

  return (
    <div className="dashboard-saved-filter-select-wrap">
      <Select<SavedListSelectOption, false>
        inputId="saved-list-filter"
        aria-label={ariaLabel}
        options={options}
        value={selected}
        onChange={(next: SingleValue<SavedListSelectOption>) => {
          if (next?.value) onChange(next.value);
        }}
        styles={savedFilterSelectStyles}
        isSearchable
        menuPlacement="auto"
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        placeholder="Filter by list"
        classNamePrefix="saved-filter-select"
      />
    </div>
  );
}

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
      companyWebsiteDomain: current?.company_website_domain,
      companyWebsite: current?.company_website,
      openToWork: isOpenToWork(doc.profile.open_to_cards),
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
  newSaveListName: string;
  onNewSaveListNameChange: (value: string) => void;
  onCreateSaveList: () => void;
  createSaveListBusy: boolean;
  onDeleteSaveList: (listId: string) => void;
  deleteSaveListBusyId: string | null;
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
  onExport?: () => void;
  exportBusy?: boolean;
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
  newSaveListName,
  onNewSaveListNameChange,
  onCreateSaveList,
  createSaveListBusy,
  onDeleteSaveList,
  deleteSaveListBusyId,
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
  onExport,
  exportBusy = false,
}: Props) {
  const [listsMenuOpen, setListsMenuOpen] = useState(false);
  const listsMenuRef = useRef<HTMLDivElement>(null);
  const listsMenuId = useId();
  const moveListMenuId = useId();

  const filterLabel =
    saveListFilter === "__all__"
      ? "All saved"
      : saveListFilter === "__general__"
        ? "General"
        : listLabel(saveListFilter, saveLists);

  const canDeleteActiveList =
    saveListFilter !== "__all__" && saveListFilter !== "__general__";

  const filterOptions = useMemo(
    (): SavedListSelectOption[] => [
      { value: "__all__", label: "All saved" },
      { value: "__general__", label: "General" },
      ...saveLists.map((list) => ({ value: list.id, label: list.name })),
    ],
    [saveLists]
  );

  const moveListOptions = useMemo(
    (): SavedListSelectOption[] => [
      { value: "", label: "General" },
      ...saveLists.map((list) => ({ value: list.id, label: list.name })),
    ],
    [saveLists]
  );

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

  const [moveListMenuKey, setMoveListMenuKey] = useState<string | null>(null);

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
      <div className="dashboard-results-toolbar dashboard-results-toolbar--saved">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="bookmark" className="text-xl text-[#0050cb]" />
            Saved candidates
            <span
              className="dashboard-saved-header-count tabular-nums"
              title={`${totalSavedCount.toLocaleString()} saved candidates`}
            >
              {totalSavedCount.toLocaleString()}
            </span>
          </h3>
          <p className="mt-1 dashboard-text-body">
            Shortlisted profiles you marked for follow-up. Organize them into custom lists.
          </p>
        </div>

        <div className="dashboard-saved-header-actions">
          <SavedFilterSelect
            value={saveListFilter}
            onChange={onSaveListFilterChange}
            ariaLabel="Filter by list"
            options={filterOptions}
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
                      <ButtonLoadingContent loading={createSaveListBusy} loadingLabel="Adding">
                        Add
                      </ButtonLoadingContent>
                    </button>
                  </div>
                </label>

                {canDeleteActiveList ? (
                  <button
                    type="button"
                    onClick={() => onDeleteSaveList(saveListFilter)}
                    disabled={deleteSaveListBusyId === saveListFilter}
                    className="dashboard-btn-secondary mt-1 w-full justify-center text-[#b91c1c] hover:border-red-200 hover:bg-red-50 disabled:opacity-55"
                  >
                    <MaterialIcon name="delete_outline" className="text-base" />
                    <ButtonLoadingContent
                      loading={deleteSaveListBusyId === saveListFilter}
                      loadingLabel="Deleting"
                    >
                      {`Delete “${filterLabel}”`}
                    </ButtonLoadingContent>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              disabled={exportBusy || loading || filteredTotalDocs === 0}
              className="dashboard-saved-export-icon-btn disabled:opacity-55"
              title="Export saved candidates"
              aria-label="Export saved candidates"
            >
              {exportBusy ? (
                <ButtonSpinner size="sm" />
              ) : (
                <MaterialIcon name="download" className="text-xl" />
              )}
            </button>
          ) : null}
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
            const emailRevealed =
              revealedEmailKeys.includes(rowKey(candidate)) ||
              Boolean(getDisplayedEmail(candidate).trim());
            const phoneRevealed =
              revealedPhoneKeys.includes(rowKey(candidate)) ||
              Boolean(getDisplayedPhone(candidate).trim());
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
                      <SavedCardListControl
                        candidateName={candidate.name}
                        currentListId={String(candidate.saveListId || "")}
                        options={moveListOptions}
                        disabled={busy}
                        open={moveListMenuKey === key}
                        menuId={moveListMenuId}
                        onToggle={() =>
                          setMoveListMenuKey((prev) => (prev === key ? null : key))
                        }
                        onClose={() => setMoveListMenuKey(null)}
                        onSelect={(listId) => onMoveList(candidate, listId)}
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
