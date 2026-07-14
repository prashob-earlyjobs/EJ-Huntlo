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
  school: string;
  fieldOfStudy: string;
  degree: string;
  certifications: string;
  honorsAwards: string;
  currentCompany: string[];
  yearsAtCompany: string;
  pastCompany: string[];
  pastTitle: string[];
  companyType: string;
  companyHeadquarters: string;
  companyFocus: string;
  employmentType: string;
  companyHeadcountRange: string;
  fundingStage: string;
  headcountGrowthMin: string;
  headcountGrowthMax: string;
  companyHeadcountMin: string;
  companyHeadcountMax: string;
  annualRevenue: string;
  totalFundingRaised: string;
  yearFoundedMin: string;
  yearFoundedMax: string;
  recentlyFunded: string;
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
  geoDistance: "",
  industry: "",
  school: "",
  fieldOfStudy: "",
  degree: "",
  certifications: "",
  honorsAwards: "",
  currentCompany: [],
  yearsAtCompany: "",
  pastCompany: [],
  pastTitle: [],
  companyType: "",
  companyHeadquarters: "",
  companyFocus: "",
  employmentType: "",
  companyHeadcountRange: "",
  fundingStage: "",
  headcountGrowthMin: "",
  headcountGrowthMax: "",
  companyHeadcountMin: "",
  companyHeadcountMax: "",
  annualRevenue: "",
  totalFundingRaised: "",
  yearFoundedMin: "",
  yearFoundedMax: "",
  recentlyFunded: "",
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
  return merged;
}
