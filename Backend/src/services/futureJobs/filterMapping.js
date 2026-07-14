/**
 * Map Future Jobs session.queries ↔ flat filter form (dashboard drawer).
 */

/** Max length for jdDetail.userText sent to Future Jobs create/update sourcing session. */
const SOURCING_PROMPT_MAX_LENGTH = 250;

/**
 * Plain single-line user text for sourcing APIs — strips literal \\n / \\r / \\t
 * and real line breaks (often pasted from JSON or job descriptions).
 * @param {unknown} text
 */
function normalizePromptPlainText(text) {
  if (typeof text !== "string") return "";
  let s = text;
  s = s.replace(/\\r\\n/g, " ");
  s = s.replace(/\\n/g, " ");
  s = s.replace(/\\r/g, " ");
  s = s.replace(/\\t/g, " ");
  s = s.replace(/\r\n/g, " ");
  s = s.replace(/\n/g, " ");
  s = s.replace(/\r/g, " ");
  s = s.replace(/\t/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Truncate prompt for POST/PATCH /wl/sourcing-session only (not annotate).
 * @param {unknown} prompt
 */
function promptForSourcingApi(prompt) {
  const plain = normalizePromptPlainText(prompt);
  return plain.slice(0, SOURCING_PROMPT_MAX_LENGTH);
}

/** Future Jobs open-to-work card value (queries.open_to_cards). */
const OPEN_TO_WORK_CARD = "CAREER_INTEREST";

const DEFAULT_FILTER_FORM = {
  searchType: "Flexible",
  selectRegion: "",
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
  if (!q || q.value == null) {
    return { min: "", max: "" };
  }
  const val = q.value;
  if (Array.isArray(val)) {
    if (val.length >= 2) {
      return {
        min: val[0] != null ? String(val[0]) : "",
        max: val[1] != null ? String(val[1]) : "",
      };
    }
    if (val.length === 1 && val[0] != null && val[0] !== "") {
      const single = String(val[0]);
      return { min: single, max: single };
    }
    return { min: "", max: "" };
  }
  const single = String(val).trim();
  return single ? { min: single, max: single } : { min: "", max: "" };
}

/** Numeric range inputs in the filter drawer — stored as strings for controlled inputs. */
const FILTER_FORM_RANGE_KEYS = [
  "yearsExpMin",
  "yearsExpMax",
  "headcountGrowthMin",
  "headcountGrowthMax",
  "companyHeadcountMin",
  "companyHeadcountMax",
  "yearFoundedMin",
  "yearFoundedMax",
];

/**
 * Normalize flat filter form for API responses and Mongo (string ranges, array regions).
 * @param {object} [form]
 * @returns {object|null}
 */
function normalizeFilterFormForUi(form) {
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    return null;
  }

  const out = { ...DEFAULT_FILTER_FORM };

  for (const key of Object.keys(DEFAULT_FILTER_FORM)) {
    if (!(key in form)) continue;
    const val = form[key];

    if (key === "selectRegion") {
      if (Array.isArray(val)) {
        out.selectRegion = val
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .filter(
            (s, i, arr) =>
              arr.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i
          );
      } else if (typeof val === "string" && val.trim()) {
        out.selectRegion = val
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      continue;
    }

    if (key === "location") {
      out.location = normalizeLocationsValue(val);
      continue;
    }

    if (key === "pastCompany" || key === "pastTitle" || key === "currentCompany") {
      out[key] = normalizeChipListValue(val);
      continue;
    }

    if (typeof DEFAULT_FILTER_FORM[key] === "boolean") {
      out[key] = Boolean(val);
      continue;
    }

    if (FILTER_FORM_RANGE_KEYS.includes(key)) {
      out[key] =
        val == null || val === "" ? "" : String(val).trim();
      continue;
    }

    if (typeof DEFAULT_FILTER_FORM[key] === "string") {
      out[key] = val == null ? "" : String(val);
    }
  }

  return out;
}

function normalizeSkillsValue(raw) {
  const empty = { mandatory: [], core: [], secondary: [] };
  if (raw == null) return empty;

  if (Array.isArray(raw)) {
    const core = raw
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);
    return core.length > 0 ? { ...empty, core } : empty;
  }

  if (typeof raw !== "object") return empty;

  const mandatory = Array.isArray(raw.mandatory)
    ? raw.mandatory.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  const core = Array.isArray(raw.core)
    ? raw.core.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  const secondary = Array.isArray(raw.secondary)
    ? raw.secondary.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];

  return { mandatory, core, secondary };
}

function skillsToKeyword(skillsValue) {
  const normalized = normalizeSkillsValue(skillsValue);
  const parts = [];
  for (const bucket of ["mandatory", "core", "secondary"]) {
    for (const s of normalized[bucket]) {
      if (s) parts.push(s);
    }
  }
  return parts.join(", ");
}

function keywordToSkills(keyword, existingSkills) {
  const base = normalizeSkillsValue(existingSkills);

  const tokens = String(keyword || "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) return base;

  const merged = {
    mandatory: [...base.mandatory],
    core: [...base.core],
    secondary: [...base.secondary],
  };
  for (const t of tokens) {
    if (
      !merged.mandatory.includes(t) &&
      !merged.core.includes(t) &&
      !merged.secondary.includes(t)
    ) {
      merged.core.push(t);
    }
  }
  return merged;
}

function skillsHasEntries(skills) {
  const n = normalizeSkillsValue(skills);
  return (
    n.mandatory.length > 0 || n.core.length > 0 || n.secondary.length > 0
  );
}

const SKILL_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "in",
  "at",
  "for",
  "to",
  "of",
  "with",
  "on",
  "is",
  "are",
  "be",
  "looking",
  "seeking",
  "hire",
  "hiring",
  "candidates",
  "candidate",
  "years",
  "year",
  "experience",
  "based",
  "located",
  "location",
]);

function tokensFromFreeText(text, max = 6) {
  const parts = String(text || "")
    .split(/[,;|/\n]+/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];
  const seen = new Set();
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (part.length < 2 || SKILL_STOP_WORDS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    out.push(part);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Future Jobs 422 if skills.mandatory/core/secondary are all empty.
 */
function ensureSkillsForFutureJobs(skills, form, session) {
  const normalized = normalizeSkillsValue(skills);
  if (skillsHasEntries(normalized)) return normalized;

  const core = [];
  const addCore = (label) => {
    const t = String(label ?? "").trim();
    if (!t) return;
    if (!core.some((c) => c.toLowerCase() === t.toLowerCase())) {
      core.push(t);
    }
  };

  for (const token of industryTokensFromForm(form)) {
    addCore(token);
    if (core.length >= 4) break;
  }

  const title = String(form?.currentTitle || "").trim();
  if (title) {
    addCore(title);
  }

  if (core.length === 0) {
    const jdText =
      (session?.jdDetail && typeof session.jdDetail.userText === "string"
        ? session.jdDetail.userText
        : "") ||
      (typeof session?.sessionTitle === "string" ? session.sessionTitle : "");
    for (const token of tokensFromFreeText(jdText)) {
      addCore(token);
    }
  }

  if (core.length === 0) {
    addCore("General");
  }

  return {
    mandatory: [...normalized.mandatory],
    core: [...normalized.core, ...core],
    secondary: [...normalized.secondary],
  };
}

/**
 * Prefill keywordSkills in the filter drawer when annotation omits skills.
 * Uses the same rules as ensureSkillsForFutureJobs so UI matches the sourcing API payload.
 */
function enrichFilterFormSkillsFromPrompt(form, promptText) {
  const out = { ...form };
  if (String(out.keywordSkills || "").trim()) return out;

  const prompt = String(promptText ?? "").trim();
  const session = {
    jdDetail: { userText: prompt },
    sessionTitle: prompt ? prompt.split(/\r?\n/)[0].slice(0, 120).trim() : "",
  };
  const skills = ensureSkillsForFutureJobs(
    normalizeSkillsValue(null),
    out,
    session
  );
  const keyword = skillsToKeyword(skills);
  if (keyword) out.keywordSkills = keyword;
  return out;
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

function setQueryEquals(queries, key, values) {
  const list = Array.isArray(values)
    ? values.map((v) => String(v).trim()).filter(Boolean)
    : [String(values ?? "").trim()].filter(Boolean);
  if (list.length === 0) {
    delete queries[key];
    return;
  }
  queries[key] = { type: "=", value: list };
}

function commaSplitTokens(raw) {
  return String(raw || "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** First non-empty value from primary FJ query key, then legacy aliases. */
function queryValueFirst(queries, primaryKey, legacyKeys = []) {
  const primary = queryValues(queries, primaryKey);
  if (primary.length > 0) return primary[0];
  for (const key of legacyKeys) {
    const legacy = queryValues(queries, key);
    if (legacy.length > 0) return legacy[0];
  }
  return "";
}

function queryRangeFirst(queries, primaryKey, legacyKeys = []) {
  const primary = queryRange(queries, primaryKey);
  if (primary.min !== "" || primary.max !== "") return primary;
  for (const key of legacyKeys) {
    const legacy = queryRange(queries, key);
    if (legacy.min !== "" || legacy.max !== "") return legacy;
  }
  return { min: "", max: "" };
}

function trimRangeInput(v) {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Normalize free-text chip lists (past company / past title).
 * Legacy string values are kept as a single entry.
 * @param {unknown} val
 * @returns {string[]}
 */
function normalizeChipListValue(val) {
  const out = [];
  const push = (raw) => {
    const s = String(raw ?? "").trim();
    if (!s) return;
    if (out.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    out.push(s);
  };

  if (Array.isArray(val)) {
    for (const item of val) push(item);
    return out;
  }
  if (typeof val === "string" && val.trim()) {
    push(val);
  }
  return out;
}

/**
 * Normalize location filter values (city/region chips).
 * Legacy string values are kept as a single entry (do not split on commas).
 * @param {unknown} val
 * @returns {string[]}
 */
function normalizeLocationsValue(val) {
  const out = [];
  const push = (raw) => {
    const s = String(raw ?? "").trim();
    if (!s) return;
    if (out.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    out.push(s);
  };

  if (Array.isArray(val)) {
    for (const item of val) push(item);
    return out;
  }
  if (typeof val === "string" && val.trim()) {
    push(val);
  }
  return out;
}

/**
 * Future Jobs rejects overly specific region strings (e.g. leading PIN/postal codes).
 * "244001, Moradabad, Uttar Pradesh, India" → "Moradabad, Uttar Pradesh, India"
 */
function normalizeRegionForFutureJobs(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  let out = s.replace(/^\d{4,6}(?:-\d{4})?\s*,\s*/i, "").trim();
  // Some payloads omit the space after the comma: "244001,Moradabad,..."
  out = out.replace(/^\d{4,6}(?:-\d{4})?,/i, "").trim();
  return out || s;
}

const COUNTRY_ALIASES = {
  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  uk: "United Kingdom",
  uae: "United Arab Emirates",
};

function normalizeCountryLabel(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return COUNTRY_ALIASES[s.toLowerCase()] || s;
}

/** Derive a country label from a region string (e.g. "City, State, India" → "India"). */
function countryFromRegionString(raw) {
  const normalized = normalizeRegionForFutureJobs(raw);
  if (!normalized) return "";

  const parts = normalized
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  return normalizeCountryLabel(parts[parts.length - 1]);
}

function selectRegionsFromRegionFallback(regionValues) {
  const out = [];
  const seen = new Set();
  for (const raw of regionValues) {
    const country = countryFromRegionString(raw);
    if (!country) continue;
    const key = country.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(country);
  }
  return out;
}

function selectRegionsFromForm(form) {
  if (Array.isArray(form?.selectRegion)) {
    const out = [];
    const seen = new Set();
    for (const item of form.selectRegion) {
      const s = String(item ?? "").trim();
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }
  const legacy = String(form?.selectRegion ?? "").trim();
  if (!legacy) return [];
  return legacy
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, arr) => arr.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);
}

function industryTokensFromForm(form) {
  return String(form?.industry || "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function industryLabelFromQuery(queries) {
  const current = queryValues(queries, "current_employers.company_industries");
  if (current.length > 0) return current.join(", ");
  const legacy = queryValues(queries, "current_employers.industry");
  if (legacy.length > 0) return legacy[0];
  const all = queryValues(queries, "all_employers.company_industries");
  if (all.length > 0) return all.join(", ");
  return "";
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
  const headcountGrowth = queryRangeFirst(queries, "headcount_growth", [
    "current_employers.headcount_growth_6m",
  ]);
  const companyHeadcount = queryRangeFirst(queries, "current_employers.company_headcount_latest", [
    "current_employers.company_headcount",
  ]);
  const yearFounded = queryRangeFirst(queries, "year_founded", [
    "current_employers.year_founded",
  ]);

  const allowFallback = queryValues(queries, "allowFallback");
  const skillsQ = queries?.skills?.value;
  const openToCards = queryValues(queries, "open_to_cards");

  const nuances = Array.isArray(session?.nuances) ? session.nuances : [];
  const nuanceHas = (label) =>
    nuances.some((n) => String(n).toLowerCase() === label.toLowerCase());

  const titles = queryValues(queries, "current_employers.title");

  return {
    ...DEFAULT_FILTER_FORM,
    searchType:
      allowFallback.length > 0 && allowFallback[0] === "false"
        ? "Strict"
        : "Flexible",
    selectRegion: queryValues(queries, "country_region"),
    currentTitle: titles.length > 0 ? titles.join(", ") : "",
    yearsExpMin: yoe.min,
    yearsExpMax: yoe.max,
    keywordSkills: skillsToKeyword(skillsQ),
    seniorityLevel: queryValueFirst(queries, "current_employers.seniority_level", [
      "seniority_level",
    ]),
    location: queryValues(queries, "region")
      .map((r) => normalizeRegionForFutureJobs(r))
      .filter(Boolean),
    searchOtherRegions: queryValues(queries, "search_other_regions").includes("true"),
    openToWork: openToCards.some(
      (c) => String(c).toUpperCase() === OPEN_TO_WORK_CARD
    ),
    functionCategory: queryValues(queries, "current_employers.function_category").join(", "),
    geoDistance: queryValueFirst(queries, "geo_distance"),
    industry: industryLabelFromQuery(queries),
    school: queryValueFirst(queries, "education_background.institute_name", [
      "education.school",
    ]),
    fieldOfStudy: queryValueFirst(queries, "education_background.field_of_study", [
      "education.field_of_study",
    ]),
    degree: queryValueFirst(queries, "education_background.degree_name", [
      "education.degree",
    ]),
    certifications: queryValueFirst(queries, "certifications.name", ["certifications"]),
    honorsAwards: queryValueFirst(queries, "honors.title", ["honors_awards"]),
    currentCompany: queryValues(queries, "current_employers.name"),
    yearsAtCompany: queryValues(queries, "current_employers.years_at_company")[0] || "",
    pastCompany: queryValues(queries, "past_employers.name"),
    pastTitle: queryValues(queries, "past_employers.title"),
    companyType: queryValues(queries, "current_employers.company_type")[0] || "",
    companyHeadquarters: queryValueFirst(queries, "current_employers.company_hq_location", [
      "current_employers.company_headquarters",
    ]),
    companyFocus: queryValueFirst(queries, "current_employers.description", [
      "current_employers.company_focus",
    ]),
    employmentType: queryValues(queries, "current_employers.employment_type").join(", "),
    companyHeadcountRange:
      queryValues(queries, "current_employers.company_headcount_range")[0] || "",
    fundingStage: queryValueFirst(queries, "funding_stage", [
      "current_employers.funding_stage",
    ]),
    headcountGrowthMin: headcountGrowth.min,
    headcountGrowthMax: headcountGrowth.max,
    companyHeadcountMin: companyHeadcount.min,
    companyHeadcountMax: companyHeadcount.max,
    annualRevenue: queryValueFirst(queries, "annual_revenue", [
      "current_employers.annual_revenue",
    ]),
    totalFundingRaised: queryValueFirst(queries, "total_funding", [
      "current_employers.total_funding_raised",
    ]),
    yearFoundedMin: yearFounded.min,
    yearFoundedMax: yearFounded.max,
    recentlyFunded: queryValueFirst(queries, "recently_funded", [
      "current_employers.recently_funded",
    ]),
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

  const countries = selectRegionsFromForm(form);
  setQueryIn(queries, "country_region", countries, "(.)");
  const locations = normalizeLocationsValue(form.location)
    .map((r) => normalizeRegionForFutureJobs(r))
    .filter(Boolean);
  const regionsForFj =
    locations.length > 0
      ? locations
      : [normalizeRegionForFutureJobs(countries[0] || "")].filter(Boolean);
  setQueryIn(queries, "region", regionsForFj);

  if (form.openToWork) {
    setQueryEquals(queries, "open_to_cards", [OPEN_TO_WORK_CARD]);
  } else {
    delete queries.open_to_cards;
  }

  const titleTokens = commaSplitTokens(form.currentTitle);
  if (titleTokens.length > 0) {
    setQueryIn(queries, "current_employers.title", titleTokens);
  } else {
    delete queries["current_employers.title"];
  }

  setQueryRange(queries, "years_of_experience_raw", form.yearsExpMin, form.yearsExpMax);

  const functionTokens = commaSplitTokens(form.functionCategory);
  if (functionTokens.length > 0) {
    setQueryIn(queries, "current_employers.function_category", functionTokens);
  } else {
    delete queries["current_employers.function_category"];
  }

  if (String(form.seniorityLevel || "").trim()) {
    setQueryIn(queries, "current_employers.seniority_level", [form.seniorityLevel]);
  } else {
    delete queries["current_employers.seniority_level"];
  }
  delete queries.seniority_level;

  if (form.searchOtherRegions) {
    setQueryIn(queries, "search_other_regions", ["true"]);
  } else {
    delete queries.search_other_regions;
  }

  if (String(form.geoDistance || "").trim()) {
    setQueryEquals(queries, "geo_distance", [form.geoDistance]);
  } else {
    delete queries.geo_distance;
  }

  delete queries["current_employers.industry"];
  const industryTokens = industryTokensFromForm(form);
  if (industryTokens.length > 0) {
    setQueryIn(queries, "current_employers.company_industries", industryTokens);
    setQueryIn(queries, "all_employers.company_industries", industryTokens);
  } else {
    delete queries["current_employers.company_industries"];
    delete queries["all_employers.company_industries"];
  }

  setQueryIn(
    queries,
    "education_background.degree_name",
    [form.degree].filter(Boolean)
  );
  setQueryIn(
    queries,
    "education_background.field_of_study",
    commaSplitTokens(form.fieldOfStudy)
  );
  setQueryIn(
    queries,
    "education_background.institute_name",
    [form.school].filter(Boolean)
  );
  delete queries["education.school"];
  delete queries["education.field_of_study"];
  delete queries["education.degree"];

  setQueryIn(queries, "certifications.name", [form.certifications].filter(Boolean));
  delete queries.certifications;
  setQueryIn(queries, "honors.title", [form.honorsAwards].filter(Boolean));
  delete queries.honors_awards;

  setQueryIn(queries, "current_employers.name", normalizeChipListValue(form.currentCompany));
  setQueryIn(
    queries,
    "current_employers.years_at_company",
    [form.yearsAtCompany].filter(Boolean)
  );
  setQueryIn(queries, "past_employers.name", normalizeChipListValue(form.pastCompany));
  setQueryIn(queries, "past_employers.title", normalizeChipListValue(form.pastTitle));
  setQueryIn(queries, "current_employers.company_type", [form.companyType].filter(Boolean));
  setQueryIn(
    queries,
    "current_employers.company_hq_location",
    [form.companyHeadquarters].filter(Boolean)
  );
  delete queries["current_employers.company_headquarters"];
  setQueryIn(queries, "current_employers.description", [form.companyFocus].filter(Boolean));
  delete queries["current_employers.company_focus"];

  const employmentTokens = commaSplitTokens(form.employmentType);
  if (employmentTokens.length > 0) {
    setQueryIn(queries, "current_employers.employment_type", employmentTokens);
  } else {
    delete queries["current_employers.employment_type"];
  }

  setQueryIn(
    queries,
    "current_employers.company_headcount_range",
    [form.companyHeadcountRange].filter(Boolean)
  );

  if (String(form.fundingStage || "").trim()) {
    setQueryEquals(queries, "funding_stage", [form.fundingStage]);
  } else {
    delete queries.funding_stage;
  }
  delete queries["current_employers.funding_stage"];

  setQueryRange(queries, "headcount_growth", form.headcountGrowthMin, form.headcountGrowthMax);
  delete queries["current_employers.headcount_growth_6m"];

  setQueryRange(
    queries,
    "current_employers.company_headcount_latest",
    form.companyHeadcountMin,
    form.companyHeadcountMax
  );
  delete queries["current_employers.company_headcount"];

  if (String(form.annualRevenue || "").trim()) {
    setQueryEquals(queries, "annual_revenue", [form.annualRevenue]);
  } else {
    delete queries.annual_revenue;
  }
  delete queries["current_employers.annual_revenue"];

  if (String(form.totalFundingRaised || "").trim()) {
    setQueryEquals(queries, "total_funding", [form.totalFundingRaised]);
  } else {
    delete queries.total_funding;
  }
  delete queries["current_employers.total_funding_raised"];

  setQueryRange(queries, "year_founded", form.yearFoundedMin, form.yearFoundedMax);
  delete queries["current_employers.year_founded"];

  if (String(form.recentlyFunded || "").trim()) {
    setQueryEquals(queries, "recently_funded", [form.recentlyFunded]);
  } else {
    delete queries.recently_funded;
  }
  delete queries["current_employers.recently_funded"];

  const skillsValue = ensureSkillsForFutureJobs(
    keywordToSkills(form.keywordSkills, existingSkills),
    form,
    session
  );
  // Future Jobs requires queries.skills.value with at least one bucket entry.
  queries.skills = { type: "IN", value: skillsValue };

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

function sanitizeJdDetail(jdDetail) {
  const userText =
    jdDetail && typeof jdDetail.userText === "string"
      ? promptForSourcingApi(jdDetail.userText)
      : "";
  const sampleProfileURL =
    jdDetail && typeof jdDetail.sampleProfileURL === "string"
      ? jdDetail.sampleProfileURL.trim()
      : "";
  const out = { userText };
  if (sampleProfileURL) out.sampleProfileURL = sampleProfileURL;
  return out;
}

function buildSessionPayloadForApply(baseSession, form) {
  const merged = mergeFilterFormIntoSession(baseSession, form);
  return {
    sessionTitle: merged.sessionTitle || "",
    jdDetail: sanitizeJdDetail(merged.jdDetail),
    queries: merged.queries || {},
    nuances: Array.isArray(merged.nuances) ? merged.nuances : [],
  };
}

/** Base session shell from prompt only (no hardcoded queries). */
function baseSessionFromPrompt(prompt) {
  const userText = promptForSourcingApi(prompt);
  const sessionTitle = userText
    ? userText.split(/\r?\n/)[0].slice(0, 120).trim()
    : "";
  return {
    sessionTitle,
    jdDetail: sanitizeJdDetail({ userText }),
    queries: {},
    nuances: [],
  };
}

/** Full Future Jobs create body from user prompt + filter drawer form. */
function buildSessionPayloadFromPromptAndFilter(prompt, form) {
  const base = baseSessionFromPrompt(prompt);
  return buildSessionPayloadForApply(base, form);
}

function annotationFieldValues(field, { allowWithoutPresence = false } = {}) {
  if (!field) return [];
  if (!allowWithoutPresence && field.presence !== true) return [];
  const raw = field.value;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((x) => x != null && String(x).trim() !== "")
      .map((x) => String(x).trim());
  }
  return [String(raw).trim()].filter(Boolean);
}

/**
 * Map POST …/get-annotation `data` object → flat filter form for the drawer.
 * Only fields with presence: true are applied.
 */
function filterFormFromAnnotation(annotationData) {
  if (!annotationData || typeof annotationData !== "object") {
    return { ...DEFAULT_FILTER_FORM };
  }

  const form = { ...DEFAULT_FILTER_FORM };

  const industryParts = [
    ...annotationFieldValues(annotationData["current_employers.company_industries"]),
    ...annotationFieldValues(annotationData["all_employers.company_industries"]),
  ];
  if (industryParts.length > 0) {
    form.industry = [...new Set(industryParts)].join(", ");
  }

  const degrees = annotationFieldValues(annotationData["education_background.degree_name"]);
  if (degrees.length > 0) {
    form.degree = degrees[0];
  }

  const fieldsOfStudy = annotationFieldValues(
    annotationData["education_background.field_of_study"]
  );
  if (fieldsOfStudy.length > 0) {
    form.fieldOfStudy = fieldsOfStudy.join(", ");
  }

  const yoe = annotationFieldValues(annotationData.years_of_experience_raw);
  if (yoe.length >= 2) {
    form.yearsExpMin = yoe[0];
    form.yearsExpMax = yoe[1];
  } else if (yoe.length === 1) {
    form.yearsExpMin = yoe[0];
    form.yearsExpMax = yoe[0];
  }

  const titles = annotationFieldValues(annotationData["current_employers.title"]);
  if (titles.length > 0) {
    form.currentTitle = titles.join(", ");
  }

  const regions = annotationFieldValues(annotationData.region, {
    allowWithoutPresence: true,
  });
  if (regions.length > 0) {
    form.location = regions
      .map((r) => normalizeRegionForFutureJobs(r))
      .filter(Boolean);
  }

  const countries = annotationFieldValues(annotationData.country_region, {
    allowWithoutPresence: true,
  });
  if (countries.length > 0) {
    form.selectRegion = countries;
  } else if (regions.length > 0) {
    const derived = selectRegionsFromRegionFallback(regions);
    if (derived.length > 0) {
      form.selectRegion = derived;
    }
  }

  const skillsField = annotationData.skills;
  if (skillsField && skillsField.presence === true && skillsField.value != null) {
    const keyword = skillsToKeyword(skillsField.value);
    if (keyword) form.keywordSkills = keyword;
  }

  const seniority = annotationFieldValues(
    annotationData["current_employers.seniority_level"]
  );
  if (seniority.length > 0) {
    form.seniorityLevel = seniority[0];
  }

  const institutes = annotationFieldValues(
    annotationData["education_background.institute_name"]
  );
  if (institutes.length > 0) {
    form.school = institutes[0];
  }

  const openTo = annotationFieldValues(annotationData.open_to_cards);
  if (openTo.some((c) => String(c).toUpperCase() === OPEN_TO_WORK_CARD)) {
    form.openToWork = true;
  }

  const functionCats = annotationFieldValues(
    annotationData["current_employers.function_category"]
  );
  if (functionCats.length > 0) {
    form.functionCategory = functionCats.join(", ");
  }

  const geo = annotationFieldValues(annotationData.geo_distance);
  if (geo.length > 0) {
    form.geoDistance = geo[0];
  }

  const employment = annotationFieldValues(
    annotationData["current_employers.employment_type"]
  );
  if (employment.length > 0) {
    form.employmentType = employment.join(", ");
  }

  const headcountRange = annotationFieldValues(
    annotationData["current_employers.company_headcount_range"]
  );
  if (headcountRange.length > 0) {
    form.companyHeadcountRange = headcountRange[0];
  }

  return form;
}

module.exports = {
  SOURCING_PROMPT_MAX_LENGTH,
  normalizePromptPlainText,
  promptForSourcingApi,
  DEFAULT_FILTER_FORM,
  normalizeRegionForFutureJobs,
  ensureSkillsForFutureJobs,
  enrichFilterFormSkillsFromPrompt,
  filterFormFromCreateResponse,
  filterFormFromAnnotation,
  normalizeFilterFormForUi,
  FILTER_FORM_RANGE_KEYS,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  baseSessionFromPrompt,
  buildSessionPayloadFromPromptAndFilter,
};
