"use client";

import { CountryRegionField } from "@/components/dashboard/CountryRegionField";
import { FilterChipField } from "@/components/dashboard/FilterChipField";
import { LocationRegionField } from "@/components/dashboard/LocationRegionField";
import type { CandidateFilterForm } from "@/lib/sourcingFilters";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardInputSmClass,
  dashboardLabelClass,
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
          {searchPrompt.trim() ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                AI prompt
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{searchPrompt}</p>
            </section>
          ) : null}

          {annotateLoading ? (
            <p className="flex items-center gap-2 rounded-lg border border-[#c2c6d8]/50 bg-[#f1f3ff] px-3 py-2.5 text-sm text-[#424656]">
              <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
              Analyzing your prompt and prefilling filters…
            </p>
          ) : null}

          <section
            className={`rounded-xl border border-slate-200${annotateLoading ? " pointer-events-none opacity-60" : ""}`}
            aria-busy={annotateLoading}
          >
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              General
            </h4>
            <div className="space-y-4 px-4 py-4">
              <label className="block text-sm text-slate-700">
                Search Type
                <select
                  className={inputClass}
                  value={form.searchType || "Flexible"}
                  onChange={(e) => set({ searchType: e.target.value })}
                >
                  <option value="Flexible">Flexible</option>
                  <option value="Strict">Strict</option>
                </select>
              </label>
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
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
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
                  onChange={(location) => set({ location })}
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
                Geo distance
                <input
                  type="text"
                  placeholder="e.g. 50_km"
                  className={inputClass}
                  value={form.geoDistance}
                  onChange={(e) => set({ geoDistance: e.target.value })}
                />
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
              <input
                type="text"
                placeholder="School"
                className={inputClass.replace("mt-1 ", "")}
                value={form.school}
                onChange={(e) => set({ school: e.target.value })}
              />
              <input
                type="text"
                placeholder="Field of Study"
                className={inputClass.replace("mt-1 ", "")}
                value={form.fieldOfStudy}
                onChange={(e) => set({ fieldOfStudy: e.target.value })}
              />
              <input
                type="text"
                placeholder="Degree"
                className={inputClass.replace("mt-1 ", "")}
                value={form.degree}
                onChange={(e) => set({ degree: e.target.value })}
              />
              <input
                type="text"
                placeholder="Certifications"
                className={inputClass.replace("mt-1 ", "")}
                value={form.certifications}
                onChange={(e) => set({ certifications: e.target.value })}
              />
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
              <label className="block text-sm text-slate-700">
                Current Company
                <FilterChipField
                  value={form.currentCompany}
                  onChange={(currentCompany) => set({ currentCompany })}
                  placeholder="Type company and press Enter"
                  aria-label="Current Company"
                  disabled={annotateLoading}
                />
              </label>
              <input
                type="text"
                placeholder="Years at Company"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.yearsAtCompany}
                onChange={(e) => set({ yearsAtCompany: e.target.value })}
              />
              <label className="block text-sm text-slate-700">
                Past Company
                <FilterChipField
                  value={form.pastCompany}
                  onChange={(pastCompany) => set({ pastCompany })}
                  placeholder="Type company and press Enter"
                  aria-label="Past Company"
                  disabled={annotateLoading}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Past Title
                <FilterChipField
                  value={form.pastTitle}
                  onChange={(pastTitle) => set({ pastTitle })}
                  placeholder="Type title and press Enter"
                  aria-label="Past Title"
                  disabled={annotateLoading}
                />
              </label>
              <input
                type="text"
                placeholder="Company Type"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.companyType}
                onChange={(e) => set({ companyType: e.target.value })}
              />
              <input
                type="text"
                placeholder="Company HQ location"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.companyHeadquarters}
                onChange={(e) => set({ companyHeadquarters: e.target.value })}
              />
              <input
                type="text"
                placeholder="Company description / focus (e.g. B2B Saas)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.companyFocus}
                onChange={(e) => set({ companyFocus: e.target.value })}
              />
              <input
                type="text"
                placeholder="Employment type (comma-separated)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.employmentType}
                onChange={(e) => set({ employmentType: e.target.value })}
              />
              <input
                type="text"
                placeholder="Company headcount range (e.g. 51-200)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.companyHeadcountRange}
                onChange={(e) => set({ companyHeadcountRange: e.target.value })}
              />
              <input
                type="text"
                placeholder="Funding stage (e.g. series_a)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.fundingStage}
                onChange={(e) => set({ fundingStage: e.target.value })}
              />
              <label className="block text-sm text-slate-700">
                Headcount Growth (6-month %)
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
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
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
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
              <input
                type="text"
                placeholder="Annual revenue code (e.g. 1_10)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.annualRevenue}
                onChange={(e) => set({ annualRevenue: e.target.value })}
              />
              <input
                type="text"
                placeholder="Total funding code (e.g. 1_10)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.totalFundingRaised}
                onChange={(e) => set({ totalFundingRaised: e.target.value })}
              />
              <label className="block text-sm text-slate-700">
                Year Founded
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className={smallInputClass}
                    value={form.yearFoundedMin ?? ""}
                    onChange={(e) => set({ yearFoundedMin: e.target.value })}
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className={smallInputClass}
                    value={form.yearFoundedMax ?? ""}
                    onChange={(e) => set({ yearFoundedMax: e.target.value })}
                  />
                </div>
              </label>
              <input
                type="text"
                placeholder="Recently funded (e.g. 6m)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                value={form.recentlyFunded}
                onChange={(e) => set({ recentlyFunded: e.target.value })}
              />
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
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={form[key]}
                    onChange={(e) => set({ [key]: e.target.checked } as Partial<CandidateFilterForm>)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
          {applyLoading ? (
            <div className="dashboard-apply-progress mb-3" role="status" aria-live="polite">
              <span className="dashboard-apply-progress-spinner" aria-hidden />
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
              {applyLoading
                ? "Creating search…"
                : annotateLoading
                  ? "Analyzing prompt…"
                  : "Apply filters"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
