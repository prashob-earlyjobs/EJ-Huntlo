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

const HERO_DIMENSION_ORDER = ["roles", "skills", "location", "experience"];
const HERO_MIN_DIMENSIONS = 2;

/** Rule-based hints — mirrors Frontend/src/lib/heroQueryDimensions.ts */
function detectHeroQueryDimensions(query) {
  const text = String(query || "").trim();
  if (!text) {
    return { roles: false, skills: false, location: false, experience: false };
  }

  return {
    roles: ROLE_RE.test(text),
    skills: SKILL_RE.test(text) || SKILL_CONTEXT_RE.test(text),
    location: LOCATION_RE.test(text) || LOCATION_PREP_RE.test(text),
    experience: EXPERIENCE_RE.test(text),
  };
}

function countHeroQueryDimensions(dimensions) {
  return HERO_DIMENSION_ORDER.filter((key) => Boolean(dimensions[key])).length;
}

function hasMinimumHeroQueryDimensions(dimensions, min = HERO_MIN_DIMENSIONS) {
  return countHeroQueryDimensions(dimensions) >= min;
}

function hasAllHeroQueryDimensions(dimensions) {
  return HERO_DIMENSION_ORDER.every((key) => Boolean(dimensions[key]));
}

module.exports = {
  HERO_MIN_DIMENSIONS,
  detectHeroQueryDimensions,
  countHeroQueryDimensions,
  hasMinimumHeroQueryDimensions,
  hasAllHeroQueryDimensions,
};
