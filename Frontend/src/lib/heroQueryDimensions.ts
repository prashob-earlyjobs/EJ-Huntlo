export type HeroQueryDimension = "roles" | "skills" | "location" | "experience";

export type HeroQueryDimensions = Record<HeroQueryDimension, boolean>;

const ROLE_RE =
  /\b(?:backend|front[- ]?end|full[- ]?stack|software|data|devops|platform|cloud|mobile|ios|android|ml|machine learning|ai|product|project|engineering|marketing|sales|hr|finance|ux|ui|qa|test|support|customer success|business|operations|account|recruiter|consultant|analyst|designer|architect|administrator|director|manager|lead|head of|vp|cto|ceo|founder|intern|associate|staff|principal|senior|junior|engineer|developer|devs?|programmer|specialist|scientist|pm|p\.m\.)\b/i;

const SKILL_RE =
  /\b(?:react|node\.?js|nodejs|typescript|javascript|python|java|golang|go\b|rust|c\+\+|c#|\.net|ruby|rails|php|laravel|django|flask|fastapi|spring|kotlin|swift|scala|sql|nosql|postgres(?:ql)?|mysql|mongodb|redis|kafka|spark|hadoop|aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible|jenkins|git|graphql|rest|api|microservices|fintech|b2b|saas|e-?commerce|blockchain|solidity|tensorflow|pytorch|pandas|numpy|tableau|power bi|salesforce|hubspot|seo|sem|crm|erp|sap|excel|figma|sketch|agile|scrum)\b/i;

const SKILL_CONTEXT_RE =
  /\b(?:with|using|know(?:s|ing)?|skilled in|experience (?:in|with)|proficien(?:t|cy) in|background in|expertise in|stack:?)\s+[\w\s,.+#-]{2,}/i;

const LOCATION_RE =
  /\b(?:remote(?:ly)?|hybrid|on[- ]?site|wfh|work from home|anywhere|distributed)\b/i;

const LOCATION_PREP_RE =
  /\b(?:in|at|near|around|from|based in|located in|across)\s+[A-Za-z][A-Za-z\s.'-]{1,}(?:,\s*[A-Za-z][A-Za-z\s.'-]{1,})?/i;

const EXPERIENCE_RE =
  /\b(?:\d+\s*\+?\s*(?:years?|yrs?|yr|yoe)|\d+\s*-\s*\d+\s*(?:years?|yrs?)|\d+\s*\+\s*years?|entry[- ]?level|mid[- ]?level|experienced)\b/i;

/** Rule-based hints only — no AI. Used for live chip feedback in the hero search. */
export function detectHeroQueryDimensions(query: string): HeroQueryDimensions {
  const text = String(query || "").trim();
  if (!text) {
    return { roles: false, skills: false, location: false, experience: false };
  }

  const hasRole = ROLE_RE.test(text);
  const hasSkill = SKILL_RE.test(text) || SKILL_CONTEXT_RE.test(text);
  const hasLocation = LOCATION_RE.test(text) || LOCATION_PREP_RE.test(text);
  const hasExperience = EXPERIENCE_RE.test(text);

  return {
    roles: hasRole,
    skills: hasSkill,
    location: hasLocation,
    experience: hasExperience,
  };
}

export const HERO_TAG_TO_DIMENSION: Record<string, HeroQueryDimension> = {
  Roles: "roles",
  Skills: "skills",
  Location: "location",
  Experience: "experience",
};

export const HERO_DIMENSION_LABELS: Record<HeroQueryDimension, string> = {
  roles: "Roles",
  skills: "Skills",
  location: "Location",
  experience: "Experience",
};

const HERO_DIMENSION_ORDER: HeroQueryDimension[] = [
  "roles",
  "skills",
  "location",
  "experience",
];

export const HERO_MIN_DIMENSIONS = 2;

export function countHeroQueryDimensions(dimensions: HeroQueryDimensions): number {
  return HERO_DIMENSION_ORDER.filter((key) => dimensions[key]).length;
}

export function hasMinimumHeroQueryDimensions(
  dimensions: HeroQueryDimensions,
  min = HERO_MIN_DIMENSIONS
): boolean {
  return countHeroQueryDimensions(dimensions) >= min;
}

export function hasAllHeroQueryDimensions(dimensions: HeroQueryDimensions): boolean {
  return HERO_DIMENSION_ORDER.every((key) => dimensions[key]);
}

export function getMissingHeroQueryDimensions(dimensions: HeroQueryDimensions): string[] {
  return HERO_DIMENSION_ORDER.filter((key) => !dimensions[key]).map(
    (key) => HERO_DIMENSION_LABELS[key]
  );
}
