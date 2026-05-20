export type CandidateFilterForm = {
  searchType: string;
  selectRegion: string[];
  currentTitle: string;
  yearsExpMin: string;
  yearsExpMax: string;
  keywordSkills: string;
  seniorityLevel: string;
  location: string;
  searchOtherRegions: boolean;
  industry: string;
  school: string;
  fieldOfStudy: string;
  degree: string;
  certifications: string;
  honorsAwards: string;
  currentCompany: string;
  yearsAtCompany: string;
  pastCompany: string;
  pastTitle: string;
  companyType: string;
  companyHeadquarters: string;
  companyFocus: string;
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
  location: "",
  searchOtherRegions: false,
  industry: "",
  school: "",
  fieldOfStudy: "",
  degree: "",
  certifications: "",
  honorsAwards: "",
  currentCompany: "",
  yearsAtCompany: "",
  pastCompany: "",
  pastTitle: "",
  companyType: "",
  companyHeadquarters: "",
  companyFocus: "",
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

export function mergeFilterForm(
  base: CandidateFilterForm,
  patch: Partial<CandidateFilterForm> | Record<string, unknown> | null | undefined
): CandidateFilterForm {
  if (!patch || typeof patch !== "object") return base;
  const merged = { ...base, ...(patch as Partial<CandidateFilterForm>) };
  if ("selectRegion" in patch) {
    merged.selectRegion = normalizeSelectRegions(patch.selectRegion);
  }
  return merged;
}
