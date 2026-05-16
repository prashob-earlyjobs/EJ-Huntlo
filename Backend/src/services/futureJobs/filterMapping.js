/**
 * Map Future Jobs session.queries ↔ flat filter form (dashboard drawer).
 */

const DEFAULT_FILTER_FORM = {
  searchType: "",
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

function queryValues(queries, key) {
  const q = queries?.[key];
  if (!q || q.value == null) return [];
  if (Array.isArray(q.value)) {
    return q.value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  return [String(q.value).trim()].filter(Boolean);
}

function queryRange(queries, key) {
  const q = queries?.[key];
  if (!q || !Array.isArray(q.value) || q.value.length < 2) {
    return { min: "", max: "" };
  }
  return {
    min: q.value[0] != null ? String(q.value[0]) : "",
    max: q.value[1] != null ? String(q.value[1]) : "",
  };
}

function skillsToKeyword(skillsValue) {
  if (!skillsValue || typeof skillsValue !== "object") return "";
  const parts = [];
  for (const bucket of ["mandatory", "core", "secondary"]) {
    const arr = skillsValue[bucket];
    if (Array.isArray(arr)) {
      for (const s of arr) {
        const t = String(s ?? "").trim();
        if (t) parts.push(t);
      }
    }
  }
  return parts.join(", ");
}

function keywordToSkills(keyword, existingSkills) {
  const base =
    existingSkills && typeof existingSkills === "object"
      ? {
          mandatory: Array.isArray(existingSkills.mandatory)
            ? [...existingSkills.mandatory]
            : [],
          core: Array.isArray(existingSkills.core) ? [...existingSkills.core] : [],
          secondary: Array.isArray(existingSkills.secondary)
            ? [...existingSkills.secondary]
            : [],
        }
      : { mandatory: [], core: [], secondary: [] };

  const tokens = String(keyword || "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) return base;

  const merged = { ...base, core: [...base.core] };
  for (const t of tokens) {
    if (!merged.mandatory.includes(t) && !merged.core.includes(t)) {
      merged.core.push(t);
    }
  }
  return merged;
}

function setQueryIn(queries, key, values, type = "IN") {
  const list = Array.isArray(values)
    ? values.map((v) => String(v).trim()).filter(Boolean)
    : [];
  if (list.length === 0) {
    delete queries[key];
    return;
  }
  queries[key] = { type, value: list };
}

function trimRangeInput(v) {
  if (v == null) return "";
  return String(v).trim();
}

function setQueryRange(queries, key, min, max) {
  const minStr = trimRangeInput(min);
  const maxStr = trimRangeInput(max);
  if (minStr === "" && maxStr === "") {
    delete queries[key];
    return;
  }

  const lo = minStr === "" ? null : Number(minStr);
  const hi = maxStr === "" ? null : Number(maxStr);
  if (lo != null && Number.isNaN(lo)) {
    delete queries[key];
    return;
  }
  if (hi != null && Number.isNaN(hi)) {
    delete queries[key];
    return;
  }

  const finalLo = lo != null ? lo : hi;
  const finalHi = hi != null ? hi : lo;
  queries[key] = { type: "RANGE", value: [finalLo, finalHi] };
}

/**
 * @param {object} futureJobsCreateResponse — full FJ create response
 * @param {object} [requestPayload] — body sent to create (fallback)
 */
function filterFormFromCreateResponse(futureJobsCreateResponse, requestPayload) {
  const session =
    futureJobsCreateResponse?.data?.session &&
    typeof futureJobsCreateResponse.data.session === "object"
      ? futureJobsCreateResponse.data.session
      : null;
  const queries =
    session?.queries && typeof session.queries === "object"
      ? session.queries
      : requestPayload?.queries && typeof requestPayload.queries === "object"
        ? requestPayload.queries
        : {};

  const yoe = queryRange(queries, "years_of_experience_raw");
  const headcountGrowth = queryRange(queries, "current_employers.headcount_growth_6m");
  const companyHeadcount = queryRange(queries, "current_employers.company_headcount");
  const yearFounded = queryRange(queries, "current_employers.year_founded");

  const allowFallback = queryValues(queries, "allowFallback");
  const skillsQ = queries?.skills?.value;

  const nuances = Array.isArray(session?.nuances) ? session.nuances : [];
  const nuanceHas = (label) =>
    nuances.some((n) => String(n).toLowerCase() === label.toLowerCase());

  return {
    ...DEFAULT_FILTER_FORM,
    searchType:
      allowFallback.length > 0 && allowFallback[0] === "false"
        ? "Strict"
        : allowFallback.length > 0
          ? "Flexible"
          : "",
    selectRegion:
      queryValues(queries, "country_region")[0] ||
      queryValues(queries, "region")[0] ||
      "",
    currentTitle: queryValues(queries, "current_employers.title")[0] || "",
    yearsExpMin: yoe.min,
    yearsExpMax: yoe.max,
    keywordSkills: skillsToKeyword(skillsQ),
    seniorityLevel: queryValues(queries, "seniority_level")[0] || "",
    location: queryValues(queries, "region")[0] || "",
    searchOtherRegions: queryValues(queries, "search_other_regions").includes("true"),
    industry: queryValues(queries, "current_employers.industry")[0] || "",
    school: queryValues(queries, "education.school")[0] || "",
    fieldOfStudy: queryValues(queries, "education.field_of_study")[0] || "",
    degree: queryValues(queries, "education.degree")[0] || "",
    certifications: queryValues(queries, "certifications")[0] || "",
    honorsAwards: queryValues(queries, "honors_awards")[0] || "",
    currentCompany: queryValues(queries, "current_employers.name")[0] || "",
    yearsAtCompany: queryValues(queries, "current_employers.years_at_company")[0] || "",
    pastCompany: queryValues(queries, "past_employers.name")[0] || "",
    pastTitle: queryValues(queries, "past_employers.title")[0] || "",
    companyType: queryValues(queries, "current_employers.company_type")[0] || "",
    companyHeadquarters:
      queryValues(queries, "current_employers.company_headquarters")[0] || "",
    companyFocus: queryValues(queries, "current_employers.company_focus")[0] || "",
    fundingStage: queryValues(queries, "current_employers.funding_stage")[0] || "",
    headcountGrowthMin: headcountGrowth.min,
    headcountGrowthMax: headcountGrowth.max,
    companyHeadcountMin: companyHeadcount.min,
    companyHeadcountMax: companyHeadcount.max,
    annualRevenue: queryValues(queries, "current_employers.annual_revenue")[0] || "",
    totalFundingRaised:
      queryValues(queries, "current_employers.total_funding_raised")[0] || "",
    yearFoundedMin: yearFounded.min,
    yearFoundedMax: yearFounded.max,
    recentlyFunded: queryValues(queries, "current_employers.recently_funded")[0] || "",
    frequentJobSwitch: nuanceHas("Frequent Job Switch"),
    recentlyChangedJob: nuanceHas("Recently Changed Job"),
    largeEmploymentGaps: nuanceHas("Large Employment Gaps"),
    noCareerProgression: nuanceHas("No Career Progression"),
    grammarSpellingIssues: nuanceHas("Grammar & Spelling Issues in Profile"),
    overlappingFullTimeJobs: nuanceHas("Overlapping Full-Time Jobs"),
    unspecifiedDatesOrLocations: nuanceHas("Unspecified Dates or Locations"),
  };
}

/**
 * Merge flat form into an existing FJ session object (for apply / update).
 * @param {object} baseSession — session from create response
 * @param {object} form — flat filter form
 */
function mergeFilterFormIntoSession(baseSession, form) {
  const session =
    baseSession && typeof baseSession === "object"
      ? JSON.parse(JSON.stringify(baseSession))
      : {};
  const queries =
    session.queries && typeof session.queries === "object"
      ? { ...session.queries }
      : {};

  const existingSkills = queries?.skills?.value;

  setQueryIn(queries, "country_region", [form.selectRegion].filter(Boolean), "(.)");
  setQueryIn(queries, "region", [form.location || form.selectRegion].filter(Boolean));
  setQueryIn(queries, "current_employers.title", [form.currentTitle].filter(Boolean));
  setQueryRange(queries, "years_of_experience_raw", form.yearsExpMin, form.yearsExpMax);
  setQueryIn(queries, "seniority_level", [form.seniorityLevel].filter(Boolean));
  if (form.searchOtherRegions) {
    setQueryIn(queries, "search_other_regions", ["true"]);
  } else {
    delete queries.search_other_regions;
  }
  setQueryIn(queries, "current_employers.industry", [form.industry].filter(Boolean));
  setQueryIn(queries, "education.school", [form.school].filter(Boolean));
  setQueryIn(queries, "education.field_of_study", [form.fieldOfStudy].filter(Boolean));
  setQueryIn(queries, "education.degree", [form.degree].filter(Boolean));
  setQueryIn(queries, "certifications", [form.certifications].filter(Boolean));
  setQueryIn(queries, "honors_awards", [form.honorsAwards].filter(Boolean));
  setQueryIn(queries, "current_employers.name", [form.currentCompany].filter(Boolean));
  setQueryIn(
    queries,
    "current_employers.years_at_company",
    [form.yearsAtCompany].filter(Boolean)
  );
  setQueryIn(queries, "past_employers.name", [form.pastCompany].filter(Boolean));
  setQueryIn(queries, "past_employers.title", [form.pastTitle].filter(Boolean));
  setQueryIn(queries, "current_employers.company_type", [form.companyType].filter(Boolean));
  setQueryIn(
    queries,
    "current_employers.company_headquarters",
    [form.companyHeadquarters].filter(Boolean)
  );
  setQueryIn(queries, "current_employers.company_focus", [form.companyFocus].filter(Boolean));
  setQueryIn(queries, "current_employers.funding_stage", [form.fundingStage].filter(Boolean));
  setQueryRange(
    queries,
    "current_employers.headcount_growth_6m",
    form.headcountGrowthMin,
    form.headcountGrowthMax
  );
  setQueryRange(
    queries,
    "current_employers.company_headcount",
    form.companyHeadcountMin,
    form.companyHeadcountMax
  );
  setQueryIn(
    queries,
    "current_employers.annual_revenue",
    [form.annualRevenue].filter(Boolean)
  );
  setQueryIn(
    queries,
    "current_employers.total_funding_raised",
    [form.totalFundingRaised].filter(Boolean)
  );
  setQueryRange(
    queries,
    "current_employers.year_founded",
    form.yearFoundedMin,
    form.yearFoundedMax
  );
  setQueryIn(
    queries,
    "current_employers.recently_funded",
    [form.recentlyFunded].filter(Boolean)
  );

  const skillsValue = keywordToSkills(form.keywordSkills, existingSkills);
  const hasSkills =
    (form.keywordSkills && String(form.keywordSkills).trim() !== "") ||
    skillsValue.mandatory.length > 0 ||
    skillsValue.core.length > 0 ||
    skillsValue.secondary.length > 0;
  if (hasSkills) {
    queries.skills = { type: "IN", value: skillsValue };
  } else {
    delete queries.skills;
  }

  if (form.searchType === "Strict") {
    queries.allowFallback = { type: "NA", value: [false] };
  } else {
    queries.allowFallback = { type: "NA", value: [true] };
  }

  const nuances = [];
  const nuanceMap = [
    ["frequentJobSwitch", "Frequent Job Switch"],
    ["recentlyChangedJob", "Recently Changed Job"],
    ["largeEmploymentGaps", "Large Employment Gaps"],
    ["noCareerProgression", "No Career Progression"],
    ["grammarSpellingIssues", "Grammar & Spelling Issues in Profile"],
    ["overlappingFullTimeJobs", "Overlapping Full-Time Jobs"],
    ["unspecifiedDatesOrLocations", "Unspecified Dates or Locations"],
  ];
  for (const [key, label] of nuanceMap) {
    if (form[key]) nuances.push(label);
  }

  session.queries = queries;
  session.nuances = nuances;
  return session;
}

function buildSessionPayloadForApply(baseSession, form) {
  const merged = mergeFilterFormIntoSession(baseSession, form);
  return {
    sessionTitle: merged.sessionTitle || "",
    jdDetail: merged.jdDetail || { userText: "", sampleProfileURL: "" },
    queries: merged.queries || {},
    nuances: Array.isArray(merged.nuances) ? merged.nuances : [],
  };
}

/** Base session shell from prompt only (no hardcoded queries). */
function baseSessionFromPrompt(prompt) {
  const userText = typeof prompt === "string" ? prompt.trim() : "";
  const sessionTitle = userText
    ? userText.split(/\r?\n/)[0].slice(0, 120).trim()
    : "";
  return {
    sessionTitle,
    jdDetail: {
      userText,
      sampleProfileURL: "",
    },
    queries: {},
    nuances: [],
  };
}

/** Full Future Jobs create body from user prompt + filter drawer form. */
function buildSessionPayloadFromPromptAndFilter(prompt, form) {
  const base = baseSessionFromPrompt(prompt);
  return buildSessionPayloadForApply(base, form);
}

module.exports = {
  DEFAULT_FILTER_FORM,
  filterFormFromCreateResponse,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  baseSessionFromPrompt,
  buildSessionPayloadFromPromptAndFilter,
};
