export type CandidateFilterForm = {
  searchType: string;
  selectRegion: string;
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
  selectRegion: "",
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

export function mergeFilterForm(
  base: CandidateFilterForm,
  patch: Partial<CandidateFilterForm> | Record<string, unknown> | null | undefined
): CandidateFilterForm {
  if (!patch || typeof patch !== "object") return base;
  return { ...base, ...(patch as Partial<CandidateFilterForm>) };
}
