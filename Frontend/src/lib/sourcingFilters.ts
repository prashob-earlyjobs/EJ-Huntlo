export type TargetCompanyScope = "current_past" | "current" | "past";

export type CandidateFilterForm = {
  searchType: string;
  selectRegion: string[];
  currentTitle: string;
  yearsExpMin: string;
  yearsExpMax: string;
  keywordSkills: string;
  seniorityLevel: string;
  location: string[];
  searchOtherRegions: boolean;
  openToWork: boolean;
  functionCategory: string;
  geoDistance: string;
  industry: string;
  school: string[];
  fieldOfStudy: string[];
  degree: string[];
  certifications: string[];
  honorsAwards: string;
  targetCompanyScope: TargetCompanyScope;
  currentCompany: string[];
  yearsAtCompany: string[];
  pastCompany: string[];
  pastTitle: string[];
  companyType: string;
  companyHeadquarters: string;
  companyFocus: string[];
  employmentType: string;
  companyHeadcountRange: string;
  fundingStage: string[];
  headcountGrowthMin: string;
  headcountGrowthMax: string;
  companyHeadcountMin: string;
  companyHeadcountMax: string;
  annualRevenue: string;
  totalFundingRaised: string[];
  yearFoundedMin: string;
  yearFoundedMax: string;
  recentlyFunded: string[];
  languages: string[];
  frequentJobSwitch: boolean;
  recentlyChangedJob: boolean;
  largeEmploymentGaps: boolean;
  noCareerProgression: boolean;
  grammarSpellingIssues: boolean;
  overlappingFullTimeJobs: boolean;
  unspecifiedDatesOrLocations: boolean;
};

export const DEFAULT_CANDIDATE_FILTER_FORM: CandidateFilterForm = {
  searchType: "Flexible",
  selectRegion: [],
  currentTitle: "",
  yearsExpMin: "",
  yearsExpMax: "",
  keywordSkills: "",
  seniorityLevel: "",
  location: [],
  searchOtherRegions: false,
  openToWork: false,
  functionCategory: "",
  geoDistance: "50_km",
  industry: "",
  school: [],
  fieldOfStudy: [],
  degree: [],
  certifications: [],
  honorsAwards: "",
  targetCompanyScope: "current_past",
  currentCompany: [],
  yearsAtCompany: [],
  pastCompany: [],
  pastTitle: [],
  companyType: "",
  companyHeadquarters: "",
  companyFocus: [],
  employmentType: "",
  companyHeadcountRange: "",
  fundingStage: [],
  headcountGrowthMin: "",
  headcountGrowthMax: "",
  companyHeadcountMin: "",
  companyHeadcountMax: "",
  annualRevenue: "",
  totalFundingRaised: [],
  yearFoundedMin: "",
  yearFoundedMax: "",
  recentlyFunded: [],
  languages: [],
  frequentJobSwitch: false,
  recentlyChangedJob: false,
  largeEmploymentGaps: false,
  noCareerProgression: false,
  grammarSpellingIssues: false,
  overlappingFullTimeJobs: false,
  unspecifiedDatesOrLocations: false,
};

export function normalizeSelectRegions(value: unknown): string[] {
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      const s = typeof item === "string" ? item.trim() : "";
      if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    }
    return out;
  }
  if (typeof value === "string" && value.trim()) {
    const parts = value
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: string[] = [];
    for (const part of parts) {
      if (!out.some((x) => x.toLowerCase() === part.toLowerCase())) out.push(part);
    }
    return out;
  }
  return [];
}

/** Locations may contain commas — never split a legacy string by comma. */
export function normalizeLocations(value: unknown): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    if (out.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    out.push(s);
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") push(item);
    }
    return out;
  }
  if (typeof value === "string" && value.trim()) {
    push(value);
  }
  return out;
}

const COUNTRY_ABBREVIATIONS: Record<string, string> = {
  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  uk: "United Kingdom",
  uae: "United Arab Emirates",
};

function normalizeCountryLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return COUNTRY_ABBREVIATIONS[s.toLowerCase()] || s;
}

/**
 * Derive Country chips from Location chips (linked filters).
 * "Pune, Maharashtra, India" → "India". Single city names are ignored.
 */
export function countriesFromLocations(locations: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const loc of normalizeLocations(locations)) {
    const parts = loc
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;
    let country = "";
    if (parts.length >= 2) {
      country = normalizeCountryLabel(parts[parts.length - 1]);
    } else {
      country = COUNTRY_ABBREVIATIONS[parts[0].toLowerCase()] || "";
    }
    if (!country) continue;
    const key = country.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(country);
  }
  return out;
}

/** Free-text chip lists (past company / past title). Legacy string → one chip. */
export function normalizeChipList(value: unknown): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    if (out.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    out.push(s);
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") push(item);
    }
    return out;
  }
  if (typeof value === "string" && value.trim()) {
    push(value);
  }
  return out;
}

export function normalizeTargetCompanyScope(value: unknown): TargetCompanyScope {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "current" || s === "current_only") return "current";
  if (s === "past" || s === "past_only") return "past";
  if (s === "current_past" || s === "current_+_past" || s === "both") return "current_past";
  return "current_past";
}

export function inferTargetCompanyScope(
  currentCompany: unknown,
  pastCompany: unknown
): TargetCompanyScope {
  const current = normalizeChipList(currentCompany);
  const past = normalizeChipList(pastCompany);
  if (current.length > 0 && past.length > 0) return "current_past";
  if (current.length > 0) return "current";
  if (past.length > 0) return "past";
  return "current_past";
}

/** Visible chips for the unified Target Company field. */
export function getTargetCompanies(form: {
  targetCompanyScope: TargetCompanyScope;
  currentCompany: string[];
  pastCompany: string[];
}): string[] {
  if (form.targetCompanyScope === "current") {
    return normalizeChipList(form.currentCompany);
  }
  if (form.targetCompanyScope === "past") {
    return normalizeChipList(form.pastCompany);
  }
  return normalizeChipList([...form.currentCompany, ...form.pastCompany]);
}

/** Sync chip list into currentCompany / pastCompany from the scope dropdown. */
export function applyTargetCompanies(
  companies: string[],
  scope: TargetCompanyScope
): Pick<CandidateFilterForm, "targetCompanyScope" | "currentCompany" | "pastCompany"> {
  const chips = normalizeChipList(companies);
  if (scope === "current") {
    return { targetCompanyScope: scope, currentCompany: chips, pastCompany: [] };
  }
  if (scope === "past") {
    return { targetCompanyScope: scope, currentCompany: [], pastCompany: chips };
  }
  return { targetCompanyScope: scope, currentCompany: chips, pastCompany: chips };
}

/** Number inputs in CandidateFilterDrawer — must be strings for controlled inputs. */
export const FILTER_FORM_RANGE_KEYS = [
  "yearsExpMin",
  "yearsExpMax",
  "headcountGrowthMin",
  "headcountGrowthMax",
  "companyHeadcountMin",
  "companyHeadcountMax",
  "yearFoundedMin",
  "yearFoundedMax",
] as const;

function coerceRangeFields(form: CandidateFilterForm): CandidateFilterForm {
  const next = { ...form };
  for (const key of FILTER_FORM_RANGE_KEYS) {
    const v = next[key];
    if (v != null && v !== "") {
      next[key] = String(v);
    }
  }
  return next;
}

export function normalizeFilterForm(
  form: Partial<CandidateFilterForm> | Record<string, unknown> | null | undefined
): CandidateFilterForm | null {
  if (!form || typeof form !== "object") return null;
  return coerceRangeFields(mergeFilterForm(DEFAULT_CANDIDATE_FILTER_FORM, form));
}

export function mergeFilterForm(
  base: CandidateFilterForm,
  patch: Partial<CandidateFilterForm> | Record<string, unknown> | null | undefined
): CandidateFilterForm {
  if (!patch || typeof patch !== "object") return base;
  const merged = { ...base, ...(patch as Partial<CandidateFilterForm>) };
  if ("selectRegion" in patch) {
    merged.selectRegion = normalizeSelectRegions(patch.selectRegion);
  }
  if ("location" in patch) {
    merged.location = normalizeLocations(patch.location);
  }
  if ("currentCompany" in patch) {
    merged.currentCompany = normalizeChipList(patch.currentCompany);
  }
  if ("pastCompany" in patch) {
    merged.pastCompany = normalizeChipList(patch.pastCompany);
  }
  if ("pastTitle" in patch) {
    merged.pastTitle = normalizeChipList(patch.pastTitle);
  }
  if ("school" in patch) {
    merged.school = normalizeChipList(patch.school);
  }
  if ("fieldOfStudy" in patch) {
    merged.fieldOfStudy = normalizeChipList(patch.fieldOfStudy);
  }
  if ("degree" in patch) {
    merged.degree = normalizeChipList(patch.degree);
  }
  if ("certifications" in patch) {
    merged.certifications = normalizeChipList(patch.certifications);
  }
  if ("companyFocus" in patch) {
    merged.companyFocus = normalizeChipList(patch.companyFocus);
  }
  if ("yearsAtCompany" in patch) {
    merged.yearsAtCompany = normalizeChipList(patch.yearsAtCompany);
  }
  if ("fundingStage" in patch) {
    merged.fundingStage = normalizeChipList(patch.fundingStage);
  }
  if ("totalFundingRaised" in patch) {
    merged.totalFundingRaised = normalizeChipList(patch.totalFundingRaised);
  }
  if ("recentlyFunded" in patch) {
    merged.recentlyFunded = normalizeChipList(patch.recentlyFunded);
  }
  if ("languages" in patch) {
    merged.languages = normalizeChipList(patch.languages);
  }
  if ("targetCompanyScope" in patch) {
    merged.targetCompanyScope = normalizeTargetCompanyScope(patch.targetCompanyScope);
  } else if ("currentCompany" in patch || "pastCompany" in patch) {
    merged.targetCompanyScope = inferTargetCompanyScope(
      merged.currentCompany,
      merged.pastCompany
    );
  }
  if ("openToWork" in patch) {
    merged.openToWork = Boolean(patch.openToWork);
  }
  return coerceRangeFields(merged);
}

/** After apply, API may return empty range fields — keep values the user had in the drawer. */
export function mergeFilterFormPreserveFilled(
  base: CandidateFilterForm,
  patch: Partial<CandidateFilterForm> | Record<string, unknown> | null | undefined
): CandidateFilterForm {
  if (!patch || typeof patch !== "object") return base;
  const merged = mergeFilterForm(mergeFilterForm(DEFAULT_CANDIDATE_FILTER_FORM, base), patch);
  for (const key of FILTER_FORM_RANGE_KEYS) {
    const patchVal = (patch as Partial<CandidateFilterForm>)[key];
    const baseVal = base[key];
    const patchEmpty = patchVal === "" || patchVal == null;
    const baseFilled = baseVal !== "" && baseVal != null;
    if (patchEmpty && baseFilled) {
      merged[key] = String(baseVal);
    }
  }
  const textKeys = [
    "keywordSkills",
    "currentTitle",
    "seniorityLevel",
    "functionCategory",
    "industry",
  ] as const;
  for (const key of textKeys) {
    const patchVal = (patch as Partial<CandidateFilterForm>)[key];
    const baseVal = base[key];
    const patchEmpty = typeof patchVal !== "string" || !patchVal.trim();
    const baseFilled = typeof baseVal === "string" && baseVal.trim();
    if (patchEmpty && baseFilled) {
      merged[key] = baseVal;
    }
  }
  if (
    normalizeLocations(patch.location).length === 0 &&
    normalizeLocations(base.location).length > 0
  ) {
    merged.location = normalizeLocations(base.location);
  }
  if (
    normalizeChipList(patch.school).length === 0 &&
    normalizeChipList(base.school).length > 0
  ) {
    merged.school = normalizeChipList(base.school);
  }
  if (
    normalizeChipList(patch.fieldOfStudy).length === 0 &&
    normalizeChipList(base.fieldOfStudy).length > 0
  ) {
    merged.fieldOfStudy = normalizeChipList(base.fieldOfStudy);
  }
  if (
    normalizeChipList(patch.degree).length === 0 &&
    normalizeChipList(base.degree).length > 0
  ) {
    merged.degree = normalizeChipList(base.degree);
  }
  if (
    normalizeChipList(patch.certifications).length === 0 &&
    normalizeChipList(base.certifications).length > 0
  ) {
    merged.certifications = normalizeChipList(base.certifications);
  }
  if (
    normalizeChipList(patch.currentCompany).length === 0 &&
    normalizeChipList(base.currentCompany).length > 0
  ) {
    merged.currentCompany = normalizeChipList(base.currentCompany);
  }
  if (
    normalizeChipList(patch.pastCompany).length === 0 &&
    normalizeChipList(base.pastCompany).length > 0
  ) {
    merged.pastCompany = normalizeChipList(base.pastCompany);
  }
  if (
    normalizeChipList(patch.pastTitle).length === 0 &&
    normalizeChipList(base.pastTitle).length > 0
  ) {
    merged.pastTitle = normalizeChipList(base.pastTitle);
  }
  if (
    normalizeChipList(patch.companyFocus).length === 0 &&
    normalizeChipList(base.companyFocus).length > 0
  ) {
    merged.companyFocus = normalizeChipList(base.companyFocus);
  }
  if (
    normalizeChipList(patch.yearsAtCompany).length === 0 &&
    normalizeChipList(base.yearsAtCompany).length > 0
  ) {
    merged.yearsAtCompany = normalizeChipList(base.yearsAtCompany);
  }
  if (
    normalizeChipList(patch.fundingStage).length === 0 &&
    normalizeChipList(base.fundingStage).length > 0
  ) {
    merged.fundingStage = normalizeChipList(base.fundingStage);
  }
  if (
    normalizeChipList(patch.totalFundingRaised).length === 0 &&
    normalizeChipList(base.totalFundingRaised).length > 0
  ) {
    merged.totalFundingRaised = normalizeChipList(base.totalFundingRaised);
  }
  if (
    normalizeChipList(patch.recentlyFunded).length === 0 &&
    normalizeChipList(base.recentlyFunded).length > 0
  ) {
    merged.recentlyFunded = normalizeChipList(base.recentlyFunded);
  }
  if (
    normalizeChipList(patch.languages).length === 0 &&
    normalizeChipList(base.languages).length > 0
  ) {
    merged.languages = normalizeChipList(base.languages);
  }
  return merged;
}
