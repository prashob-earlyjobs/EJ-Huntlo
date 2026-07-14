"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CandidateFilterDrawerSkeleton } from "@/components/CandidateFilterDrawerSkeleton";
import { CountryRegionField } from "@/components/dashboard/CountryRegionField";
import { FilterChipField } from "@/components/dashboard/FilterChipField";
import { CompanyNameFilterField } from "@/components/dashboard/CompanyNameFilterField";
import { FilterAutocompleteChipField } from "@/components/dashboard/FilterAutocompleteChipField";
import { SchoolInstituteFilterField } from "@/components/dashboard/SchoolInstituteFilterField";
import { LanguageFilterField } from "@/components/dashboard/LanguageFilterField";
import { LocationRegionField } from "@/components/dashboard/LocationRegionField";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { COMPANY_FOCUS_OPTIONS } from "@/lib/companyFocusOptions";
import type { CandidateFilterForm, TargetCompanyScope } from "@/lib/sourcingFilters";
import {
  applyTargetCompanies,
  countriesFromLocations,
  getTargetCompanies,
} from "@/lib/sourcingFilters";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardInputSmClass,
} from "@/lib/dashboardStyles";

type Props = {
  open: boolean;
  form: CandidateFilterForm;
  searchPrompt?: string;
  onChange: (patch: Partial<CandidateFilterForm>) => void;
  onClose: () => void;
  onApply: () => void;
  applyLoading?: boolean;
  annotateLoading?: boolean;
  title?: string;
  skillsError?: string;
  applyStatusMessage?: string;
};

const inputClass = `mt-1 w-full ${dashboardInputClass}`;
const smallInputClass = dashboardInputSmClass;
const rangeRowClass = "mt-1 grid w-56 max-w-full grid-cols-[1fr_auto_1fr] items-center gap-2";

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** API tokens for Future Jobs `geo_distance` — options start at 50 km. */
const GEO_DISTANCE_OPTIONS = [
  { value: "50_km", label: "Within 50 kilometers" },
  { value: "100_km", label: "Within 100 kilometers" },
  { value: "150_km", label: "Within 150 kilometers" },
  { value: "200_km", label: "Within 200 kilometers" },
  { value: "", label: "Exact location" },
] as const;

const TARGET_COMPANY_SCOPE_OPTIONS: {
  value: TargetCompanyScope;
  label: string;
  description: string;
}[] = [
  {
    value: "current_past",
    label: "Current + Past",
    description:
      "Find people who currently work or have worked at these companies at any point in their career.",
  },
  {
    value: "current",
    label: "Current only",
    description: "Find people who currently work at these companies.",
  },
  {
    value: "past",
    label: "Past only",
    description: "Find people who have worked at these companies in the past.",
  },
];

const YEARS_AT_COMPANY_OPTIONS = [
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "6 to 10 years",
  "More than 10 years",
] as const;

const FUNDING_STAGE_OPTIONS = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D",
  "Series E",
  "Series F+",
  "IPO",
] as const;

const TOTAL_FUNDING_OPTIONS = [
  "Under $1M",
  "$1M – $10M",
  "$10M – $50M",
  "$50M – $500M",
  "Over $500M",
] as const;

const RECENTLY_FUNDED_OPTIONS = [
  "Last 3 months",
  "Last 6 months",
  "Last 12 months",
  "Last 24 months",
] as const;

const DEGREE_OPTIONS = [
  "High School or Above",
  "Associate's or Above",
  "Bachelor's or Above",
  "Master's or Above",
  "Doctorate or Above",
  "Post-Doctorate",
] as const;

function normalizePresetList(value: unknown, options: readonly string[]): string[] {
  const allowed = new Set(options.map((o) => o.toLowerCase()));
  const labelByLower = new Map(options.map((o) => [o.toLowerCase(), o]));
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? [value]
      : [];
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item ?? "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (!allowed.has(key)) continue;
    const canonical = labelByLower.get(key)!;
    if (out.some((x) => x.toLowerCase() === canonical.toLowerCase())) continue;
    out.push(canonical);
  }
  return out;
}

function PresetMultiSelectField({
  value,
  options,
  placeholder,
  ariaLabel,
  disabled,
  onChange,
}: {
  value: string[] | string | null | undefined;
  options: readonly string[];
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string[]) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => normalizePresetList(value, options),
    [value, options]
  );
  const selectedLower = useMemo(
    () => new Set(selected.map((item) => item.toLowerCase())),
    [selected]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = options.filter((opt) => !selectedLower.has(opt.toLowerCase()));
    if (!q) return [...pool];
    return pool.filter((opt) => opt.toLowerCase().includes(q));
  }, [query, options, selectedLower]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (opt: string) => {
    if (selectedLower.has(opt.toLowerCase())) return;
    const canonical = options.find((o) => o.toLowerCase() === opt.toLowerCase());
    if (!canonical) return;
    onChange([...selected, canonical]);
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const remove = (opt: string) => {
    onChange(selected.filter((item) => item !== opt));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={rootRef} className="relative mt-1">
      <div
        className={`dashboard-filter-country-field${
          disabled ? " dashboard-filter-country-field--disabled" : ""
        }`}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.map((item) => (
          <span key={item} className="dashboard-chip dashboard-chip--selected" title={item}>
            <span className="dashboard-chip-label">{item}</span>
            <button
              type="button"
              className="dashboard-chip-remove"
              aria-label={`Remove ${item}`}
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(item);
              }}
            >
              <MaterialIcon name="close" className="text-[9px]" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={listId}
          type="text"
          disabled={disabled}
          placeholder={selected.length > 0 ? "Add another" : placeholder}
          className={`dashboard-filter-country-input ${dashboardInputClass}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
              return;
            }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              e.preventDefault();
              remove(selected[selected.length - 1]);
              return;
            }
            if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              pick(suggestions[0]);
            }
          }}
          autoComplete="off"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
        />
      </div>

      {open && !disabled && suggestions.length > 0 ? (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="dashboard-filter-country-list"
          style={{ zIndex: 40 }}
        >
          {suggestions.map((opt) => (
            <li key={opt} role="option" aria-selected={false}>
              <button
                type="button"
                className="dashboard-filter-country-option"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(opt);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TargetCompanyScopeSelect({
  value,
  disabled,
  onChange,
}: {
  value: TargetCompanyScope;
  disabled?: boolean;
  onChange: (scope: TargetCompanyScope) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected =
    TARGET_COMPANY_SCOPE_OPTIONS.find((opt) => opt.value === value) ||
    TARGET_COMPANY_SCOPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="dashboard-filter-company-scope">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Target company scope"
        className="dashboard-filter-company-scope-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="dashboard-filter-company-scope-trigger-label">{selected.label}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="dashboard-filter-company-scope-trigger-icon"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Target company scope"
          className="dashboard-filter-company-scope-menu"
        >
          {TARGET_COMPANY_SCOPE_OPTIONS.map((opt) => {
            const isSelected = opt.value === selected.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="dashboard-filter-company-scope-option"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="dashboard-filter-company-scope-option-title">{opt.label}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="dashboard-filter-company-scope-option-check"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="dashboard-filter-company-scope-option-desc">{opt.description}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CandidateFilterDrawer({
  open,
  form,
  searchPrompt = "",
  onChange,
  onClose,
  onApply,
  applyLoading = false,
  annotateLoading = false,
  title = "Set search filters",
  skillsError = "",
  applyStatusMessage = "",
}: Props) {
  const set = (patch: Partial<CandidateFilterForm>) => onChange(patch);

  return (
    <div
      className={`dashboard-overlay fixed inset-0 transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close filter panel"
        className="absolute inset-0 dashboard-drawer-overlay"
        onClick={onClose}
      />
      <aside
        className={`dashboard-drawer-panel absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-[#c2c6d8]/40 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dashboard-label-upper">Candidate filters</p>
              <h3 className="dashboard-section-title mt-1">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="dashboard-btn-ghost p-1.5"
              aria-label="Close filter panel"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {annotateLoading ? (
            <CandidateFilterDrawerSkeleton />
          ) : (
            <>
          {searchPrompt.trim() ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                AI prompt
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{searchPrompt}</p>
            </section>
          ) : null}

          <section
            className="rounded-xl border border-slate-200"
          >
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              General
            </h4>
            <div className="space-y-4 px-4 py-4">
              <div className="block text-sm text-slate-700">
                <span>Search Type</span>
                <div
                  className="dashboard-filter-search-type"
                  role="group"
                  aria-label="Search Type"
                >
                  {(
                    [
                      { value: "Flexible", label: "Flexible" },
                      { value: "Strict", label: "Strict", badge: "New" },
                    ] as const
                  ).map((opt) => {
                    const active = (form.searchType || "Flexible") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="button"
                        aria-pressed={active}
                        disabled={annotateLoading}
                        className="dashboard-filter-search-type-option"
                        onClick={() => set({ searchType: opt.value })}
                      >
                        <span>{opt.label}</span>
                        {"badge" in opt && opt.badge ? (
                          <span className="dashboard-filter-search-type-badge">{opt.badge}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block text-sm text-slate-700">
                Select Region / Country
                <CountryRegionField
                  value={form.selectRegion}
                  onChange={(selectRegion) => set({ selectRegion })}
                  disabled={annotateLoading}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Current Title
                <input
                  type="text"
                  className={inputClass}
                  value={form.currentTitle}
                  onChange={(e) => set({ currentTitle: e.target.value })}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Years of Experience
                <div className={rangeRowClass}>
                  <input
                    type="number"
                    className={smallInputClass}
                    value={form.yearsExpMin ?? ""}
                    onChange={(e) => set({ yearsExpMin: e.target.value })}
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="number"
                    className={smallInputClass}
                    value={form.yearsExpMax ?? ""}
                    onChange={(e) => set({ yearsExpMax: e.target.value })}
                  />
                </div>
              </label>
              <label className="block text-sm text-slate-700">
                Keyword (Skills)
                <input
                  type="text"
                  className={inputClass}
                  value={form.keywordSkills}
                  onChange={(e) => set({ keywordSkills: e.target.value })}
                />
                {skillsError ? (
                  <p className="mt-1 text-xs text-red-600">{skillsError}</p>
                ) : null}
              </label>
              <label className="block text-sm text-slate-700">
                Seniority Level
                <input
                  type="text"
                  placeholder="e.g. Senior"
                  className={inputClass}
                  value={form.seniorityLevel}
                  onChange={(e) => set({ seniorityLevel: e.target.value })}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Function Category
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  className={inputClass}
                  value={form.functionCategory}
                  onChange={(e) => set({ functionCategory: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={form.openToWork}
                  onChange={(e) => set({ openToWork: e.target.checked })}
                />
                Open to work (career interest)
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Location
            </h4>
            <div className="space-y-4 px-4 py-4">
              <label className="block text-sm text-slate-700">
                Location
                <LocationRegionField
                  value={form.location}
                  onChange={(location) => {
                    const derivedCountries = countriesFromLocations(location);
                    if (derivedCountries.length > 0) {
                      set({ location, selectRegion: derivedCountries });
                    } else {
                      set({ location });
                    }
                  }}
                  disabled={annotateLoading}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={form.searchOtherRegions}
                  onChange={(e) => set({ searchOtherRegions: e.target.checked })}
                />
                Search other regions too
              </label>
              <label className="block text-sm text-slate-700">
                Location (Radius)
                <select
                  className={inputClass}
                  value={form.geoDistance}
                  onChange={(e) => set({ geoDistance: e.target.value })}
                >
                  {GEO_DISTANCE_OPTIONS.map((opt) => (
                    <option key={opt.value || "exact"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {form.geoDistance &&
                  !GEO_DISTANCE_OPTIONS.some((opt) => opt.value === form.geoDistance) ? (
                    <option value={form.geoDistance}>{form.geoDistance}</option>
                  ) : null}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Industry
            </h4>
            <div className="px-4 py-4">
              <label className="block text-sm text-slate-700">
                Industry
                <input
                  type="text"
                  placeholder="e.g. IT Services"
                  className={inputClass}
                  value={form.industry}
                  onChange={(e) => set({ industry: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Education
            </h4>
            <div className="space-y-4 px-4 py-4">
              <label className="block text-sm text-slate-700">
                School
                <SchoolInstituteFilterField
                  value={Array.isArray(form.school) ? form.school : form.school ? [String(form.school)] : []}
                  onChange={(school) => set({ school })}
                  placeholder="Type at least 3 letters to search"
                  aria-label="School"
                  disabled={annotateLoading}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Field of Study
                <FilterAutocompleteChipField
                  value={
                    Array.isArray(form.fieldOfStudy)
                      ? form.fieldOfStudy
                      : form.fieldOfStudy
                        ? [String(form.fieldOfStudy)]
                        : []
                  }
                  onChange={(fieldOfStudy) => set({ fieldOfStudy })}
                  filterType="education_background.field_of_study"
                  placeholder="Type at least 3 letters to search"
                  aria-label="Field of Study"
                  searchingLabel="Searching fields of study…"
                  emptyLabel="No fields found — press Enter to add custom"
                  addAnotherPlaceholder="Add another field"
                  disabled={annotateLoading}
                />
              </label>
              <div className="block text-sm text-slate-700">
                <span>Degree</span>
                <PresetMultiSelectField
                  value={form.degree}
                  options={DEGREE_OPTIONS}
                  placeholder="e.g. Bachelor's or Above"
                  ariaLabel="Degree"
                  disabled={annotateLoading}
                  onChange={(degree) => set({ degree })}
                />
              </div>
              <label className="block text-sm text-slate-700">
                Certifications
                <FilterAutocompleteChipField
                  value={
                    Array.isArray(form.certifications)
                      ? form.certifications
                      : form.certifications
                        ? [String(form.certifications)]
                        : []
                  }
                  onChange={(certifications) => set({ certifications })}
                  filterType="certifications.name"
                  placeholder="Type at least 3 letters to search"
                  aria-label="Certifications"
                  searchingLabel="Searching certifications…"
                  emptyLabel="No certifications found — press Enter to add custom"
                  addAnotherPlaceholder="Add another certification"
                  disabled={annotateLoading}
                />
              </label>
              <input
                type="text"
                placeholder="Honors & Awards"
                className={inputClass.replace("mt-1 ", "")}
                value={form.honorsAwards}
                onChange={(e) => set({ honorsAwards: e.target.value })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Company
            </h4>
            <div className="space-y-4 px-4 py-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700">Target Company</span>
                  <TargetCompanyScopeSelect
                    value={form.targetCompanyScope || "current_past"}
                    disabled={annotateLoading}
                    onChange={(scope) =>
                      set(applyTargetCompanies(getTargetCompanies(form), scope))
                    }
                  />
                </div>
                <CompanyNameFilterField
                  value={getTargetCompanies(form)}
                  onChange={(companies) =>
                    set(
                      applyTargetCompanies(
                        companies,
                        form.targetCompanyScope || "current_past"
                      )
                    )
                  }
                  placeholder="Type at least 3 letters to search"
                  aria-label="Target Company"
                  disabled={annotateLoading}
                />
                <p className="dashboard-filter-company-scope-hint">
                  {(
                    TARGET_COMPANY_SCOPE_OPTIONS.find(
                      (opt) => opt.value === (form.targetCompanyScope || "current_past")
                    ) || TARGET_COMPANY_SCOPE_OPTIONS[0]
                  ).description}
                </p>
              </div>
              <label className="block text-sm text-slate-700">
                Company Focus
                <FilterChipField
                  value={form.companyFocus}
                  onChange={(companyFocus) => set({ companyFocus })}
                  placeholder="e.g. B2B SaaS, AI infrastructure"
                  aria-label="Company Focus"
                  suggestions={COMPANY_FOCUS_OPTIONS}
                  disabled={annotateLoading}
                />
              </label>
              <div className="block text-sm text-slate-700">
                <span>Years at current company</span>
                <PresetMultiSelectField
                  value={form.yearsAtCompany}
                  options={YEARS_AT_COMPANY_OPTIONS}
                  placeholder="e.g. 3 to 5 years"
                  ariaLabel="Years at current company"
                  disabled={annotateLoading}
                  onChange={(yearsAtCompany) => set({ yearsAtCompany })}
                />
              </div>
              <div className="block text-sm text-slate-700">
                <span>Funding Stage</span>
                <PresetMultiSelectField
                  value={form.fundingStage}
                  options={FUNDING_STAGE_OPTIONS}
                  placeholder="e.g. Series A, Series B"
                  ariaLabel="Funding Stage"
                  disabled={annotateLoading}
                  onChange={(fundingStage) => set({ fundingStage })}
                />
              </div>
              <label className="block text-sm text-slate-700">
                Headcount Growth (6-month %)
                <div className={rangeRowClass}>
                  <input
                    type="number"
                    placeholder="Min"
                    className={smallInputClass}
                    value={form.headcountGrowthMin ?? ""}
                    onChange={(e) => set({ headcountGrowthMin: e.target.value })}
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className={smallInputClass}
                    value={form.headcountGrowthMax ?? ""}
                    onChange={(e) => set({ headcountGrowthMax: e.target.value })}
                  />
                </div>
              </label>
              <label className="block text-sm text-slate-700">
                Company Headcount
                <div className={rangeRowClass}>
                  <input
                    type="number"
                    placeholder="Min"
                    className={smallInputClass}
                    value={form.companyHeadcountMin ?? ""}
                    onChange={(e) => set({ companyHeadcountMin: e.target.value })}
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className={smallInputClass}
                    value={form.companyHeadcountMax ?? ""}
                    onChange={(e) => set({ companyHeadcountMax: e.target.value })}
                  />
                </div>
              </label>
              <div className="block text-sm text-slate-700">
                <span>Total Funding Raised</span>
                <PresetMultiSelectField
                  value={form.totalFundingRaised}
                  options={TOTAL_FUNDING_OPTIONS}
                  placeholder="e.g. Under $1M, $1M – $10M"
                  ariaLabel="Total Funding Raised"
                  disabled={annotateLoading}
                  onChange={(totalFundingRaised) => set({ totalFundingRaised })}
                />
              </div>
              <label className="block text-sm text-slate-700">
                Year Founded
                <div className={rangeRowClass}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min"
                    className={smallInputClass}
                    value={form.yearFoundedMin ?? ""}
                    onChange={(e) =>
                      set({ yearFoundedMin: digitsOnly(e.target.value).slice(0, 4) })
                    }
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max"
                    className={smallInputClass}
                    value={form.yearFoundedMax ?? ""}
                    onChange={(e) =>
                      set({ yearFoundedMax: digitsOnly(e.target.value).slice(0, 4) })
                    }
                  />
                </div>
              </label>
              <div className="block text-sm text-slate-700">
                <span>Recently Funded</span>
                <PresetMultiSelectField
                  value={form.recentlyFunded}
                  options={RECENTLY_FUNDED_OPTIONS}
                  placeholder="e.g. Last 6 months"
                  ariaLabel="Recently Funded"
                  disabled={annotateLoading}
                  onChange={(recentlyFunded) => set({ recentlyFunded })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Others
            </h4>
            <div className="space-y-4 px-4 py-4">
              <div className="block text-sm text-slate-700">
                <span>Languages</span>
                <LanguageFilterField
                  value={form.languages}
                  onChange={(languages) => set({ languages })}
                  disabled={annotateLoading}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Nuances
            </h4>
            <div className="space-y-2 px-4 py-4 text-sm text-slate-700">
              {(
                [
                  ["frequentJobSwitch", "Frequent Job Switch"],
                  ["recentlyChangedJob", "Recently Changed Job"],
                  ["largeEmploymentGaps", "Large Employment Gaps"],
                  ["noCareerProgression", "No Career Progression"],
                  ["grammarSpellingIssues", "Grammar & Spelling Issues in Profile"],
                  ["overlappingFullTimeJobs", "Overlapping Full-Time Jobs"],
                  ["unspecifiedDatesOrLocations", "Unspecified Dates or Locations"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                    checked={form[key]}
                    onChange={(e) => set({ [key]: e.target.checked } as Partial<CandidateFilterForm>)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
            </>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
          {applyLoading ? (
            <div className="dashboard-apply-progress mb-3" role="status" aria-live="polite">
              <ButtonSpinner className="shrink-0" />
              <div className="min-w-0">
                <p className="dashboard-apply-progress-title">
                  {applyStatusMessage || "Setting up your search"}
                </p>
                <p className="dashboard-apply-progress-subtitle">
                  This usually takes less than a minute
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applyLoading || annotateLoading}
              className={`${dashboardBtnSecondaryClass} disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={applyLoading || annotateLoading}
              className={`${dashboardBtnPrimaryClass} disabled:opacity-60`}
            >
              <ButtonLoadingContent
                loading={applyLoading || annotateLoading}
                loadingLabel={
                  applyLoading
                    ? "Creating search"
                    : annotateLoading
                      ? "Analyzing prompt"
                      : "Loading"
                }
              >
                Apply filters
              </ButtonLoadingContent>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
