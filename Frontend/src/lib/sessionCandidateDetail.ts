import { normalizeOpenToCards } from "@/lib/openToWork";

/** Employer row from Future Jobs details API (name/title or company_name/job_title). */
export type SessionEmployerRow = {
  name?: string;
  title?: string;
  company_name?: string;
  job_title?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  employment_type?: string;
  seniority_level?: string;
  company_industries?: string[];
  company_website?: string;
  company_website_domain?: string;
  company_linkedin_profile_url?: string;
  company_hq_location?: string;
  years_at_company?: string;
};

export type SessionEducationRow = {
  degree_name?: string;
  institute_name?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
};

export type SessionHonorRow = {
  title?: string;
  description?: string;
  issuer?: string;
  issued_date?: string;
};

/** Future Jobs may return certification strings or objects (`certifications.name`). */
export type SessionCertificationRow = {
  name?: string;
  title?: string;
  authority?: string;
  organization?: string;
  issuer?: string;
  license_number?: string;
  url?: string;
};

export function formatSessionCertificationLabel(
  cert: string | SessionCertificationRow | null | undefined
): string {
  if (cert == null) return "";
  if (typeof cert === "string") return cert.trim();
  if (typeof cert !== "object") return "";

  const name =
    (typeof cert.name === "string" && cert.name.trim()) ||
    (typeof cert.title === "string" && cert.title.trim()) ||
    "";
  const org =
    (typeof cert.authority === "string" && cert.authority.trim()) ||
    (typeof cert.organization === "string" && cert.organization.trim()) ||
    (typeof cert.issuer === "string" && cert.issuer.trim()) ||
    "";

  if (name && org) return `${name} · ${org}`;
  return name || org;
}

export type SessionResultDoc = {
  _id?: string;
  sourcingSessionId?: string;
  finalScore?: number;
  profile?: {
    _id?: string;
    name?: string;
    headline?: string;
    summary?: string;
    region?: string;
    years_of_experience?: string;
    years_of_experience_raw?: number;
    linkedin_profile_url?: string;
    flagship_profile_url?: string;
    profile_picture_permalink?: string;
    profile_picture_url?: string;
    skills?: string[];
    num_of_connections?: number;
    num_of_followers?: number;
    current_employers_object?: SessionEmployerRow[];
    current_employers?: SessionEmployerRow[];
    past_employers?: SessionEmployerRow[];
    all_employers?: SessionEmployerRow[];
    education_background?: SessionEducationRow[];
    certifications?: Array<string | SessionCertificationRow>;
    honors?: SessionHonorRow[];
    languages?: string[];
    location_details?: {
      city?: string;
      state?: string;
      country?: string;
    };
    totalPositions?: number;
    uniqueCompanies?: number;
    totalUniqueYears?: number;
    averageTenure?: number;
    currentTenure?: number;
    currentCompany?: string;
    open_to_cards?: string[];
  };
  profileAnalysis?: {
    highlights?: {
      Category?: string;
      Highlight?: string;
      ReasonForHighlight?: string;
    }[];
    recommendation?: string;
    analysis?: {
      keyStrengths?: { observation?: string; evidence?: string }[];
      keyWeaknesses?: { observation?: string; evidence?: string }[];
    };
  };
};

/** Placeholder ids from sessionDocToCandidateRow when Future Jobs doc._id is missing. */
export function isSyntheticSessionCandidateId(id: string): boolean {
  const trimmed = id.trim();
  return trimmed.startsWith("session-doc-");
}

/**
 * Future Jobs GET …/sourcing-session/candidate/:id/details expects the session
 * result doc id (profiles list `doc._id`), not `profile._id`.
 */
export function resolveCandidateProfileId(
  doc: SessionResultDoc,
  candidateId?: string
): string {
  const docId = typeof doc._id === "string" ? doc._id.trim() : "";
  if (docId && !isSyntheticSessionCandidateId(docId)) return docId;

  const fromRow =
    typeof candidateId === "string" ? candidateId.trim() : "";
  if (fromRow && !isSyntheticSessionCandidateId(fromRow)) return fromRow;

  const fromProfile =
    typeof doc.profile?._id === "string" ? doc.profile._id.trim() : "";
  if (fromProfile) return fromProfile;

  return docId || fromRow || "";
}

function mapEmployerRow(raw: Record<string, unknown>): SessionEmployerRow {
  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    title: typeof raw.title === "string" ? raw.title : undefined,
    company_name:
      typeof raw.company_name === "string"
        ? raw.company_name
        : typeof raw.name === "string"
          ? raw.name
          : undefined,
    job_title:
      typeof raw.job_title === "string"
        ? raw.job_title
        : typeof raw.title === "string"
          ? raw.title
          : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
    start_date: typeof raw.start_date === "string" ? raw.start_date : undefined,
    end_date: typeof raw.end_date === "string" ? raw.end_date : undefined,
    employment_type:
      typeof raw.employment_type === "string" ? raw.employment_type : undefined,
    seniority_level:
      typeof raw.seniority_level === "string" ? raw.seniority_level : undefined,
    company_industries: Array.isArray(raw.company_industries)
      ? raw.company_industries.map((x) => String(x)).filter(Boolean)
      : undefined,
    company_website:
      typeof raw.company_website === "string" ? raw.company_website : undefined,
    company_website_domain:
      typeof raw.company_website_domain === "string"
        ? raw.company_website_domain
        : undefined,
    company_linkedin_profile_url:
      typeof raw.company_linkedin_profile_url === "string"
        ? raw.company_linkedin_profile_url
        : undefined,
    company_hq_location:
      typeof raw.company_hq_location === "string" ? raw.company_hq_location : undefined,
    years_at_company:
      typeof raw.years_at_company === "string" ? raw.years_at_company : undefined,
  };
}

function mapEmployers(raw: unknown): SessionEmployerRow[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw
    .filter((e) => e && typeof e === "object")
    .map((e) => mapEmployerRow(e as Record<string, unknown>));
}

/** Prefer the longest non-empty employer list (details often richer than list cards). */
function pickRicherEmployers(
  ...lists: (SessionEmployerRow[] | undefined)[]
): SessionEmployerRow[] | undefined {
  let best: SessionEmployerRow[] | undefined;
  for (const list of lists) {
    if (!list || list.length === 0) continue;
    if (!best || list.length > best.length) best = list;
  }
  return best;
}

function employerIdentityKey(emp: SessionEmployerRow): string {
  const company = String(emp.company_name || emp.name || "")
    .trim()
    .toLowerCase();
  const title = String(emp.job_title || emp.title || "")
    .trim()
    .toLowerCase();
  const start = String(emp.start_date || "").trim();
  return `${company}|${title}|${start}`;
}

/**
 * When past_employers is missing, derive past roles from all_employers minus current.
 */
function pastEmployersFromAll(
  all: SessionEmployerRow[] | undefined,
  current: SessionEmployerRow[] | undefined
): SessionEmployerRow[] | undefined {
  if (!all || all.length === 0) return undefined;
  const currentKeys = new Set((current || []).map(employerIdentityKey));
  const past = all.filter((emp) => !currentKeys.has(employerIdentityKey(emp)));
  return past.length > 0 ? past : undefined;
}

export function formatEmployerDateRange(
  start?: string,
  end?: string
): string | null {
  const fmt = (iso?: string) => {
    if (!iso || typeof iso !== "string") return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `${s} – Present`;
  if (e) return e;
  return null;
}

function employerDateMs(iso?: string): number | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

/**
 * Newest-first career order: current / open-ended roles first, then by end date,
 * then start date. Roles with no dates keep relative order at the end.
 */
export function sortEmployersChronologically(
  employers: SessionEmployerRow[]
): SessionEmployerRow[] {
  return [...employers].sort((a, b) => {
    const aEnd = employerDateMs(a.end_date);
    const bEnd = employerDateMs(b.end_date);
    const aCurrent = aEnd == null;
    const bCurrent = bEnd == null;

    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    if (aEnd != null && bEnd != null && aEnd !== bEnd) return bEnd - aEnd;

    const aStart = employerDateMs(a.start_date);
    const bStart = employerDateMs(b.start_date);
    if (aStart != null && bStart != null && aStart !== bStart) {
      return bStart - aStart;
    }
    if (aStart != null && bStart == null) return -1;
    if (aStart == null && bStart != null) return 1;
    return 0;
  });
}

export function mergeSessionDetailFromFj(
  base: SessionResultDoc,
  detailPayload: unknown
): SessionResultDoc {
  if (!detailPayload || typeof detailPayload !== "object") {
    return base;
  }
  const payload = detailPayload as Record<string, unknown>;
  // Details may nest under `candidate` or `profile`; stored fallback uses `candidate`.
  const candidate =
    payload.candidate && typeof payload.candidate === "object"
      ? payload.candidate
      : payload.profile && typeof payload.profile === "object"
        ? payload.profile
        : null;
  if (!candidate) {
    return {
      ...base,
      finalScore:
        typeof payload.finalScore === "number"
          ? payload.finalScore
          : base.finalScore,
      profileAnalysis:
        payload.profileAnalysis && typeof payload.profileAnalysis === "object"
          ? (payload.profileAnalysis as SessionResultDoc["profileAnalysis"])
          : base.profileAnalysis,
    };
  }

  const c = candidate as Record<string, unknown>;
  const currentEmployers = pickRicherEmployers(
    mapEmployers(c.current_employers),
    mapEmployers(c.current_employers_object),
    base.profile?.current_employers_object,
    base.profile?.current_employers
  );
  const allEmployers = pickRicherEmployers(
    mapEmployers(c.all_employers),
    base.profile?.all_employers
  );
  const pastEmployers = pickRicherEmployers(
    mapEmployers(c.past_employers),
    base.profile?.past_employers,
    pastEmployersFromAll(allEmployers, currentEmployers)
  );

  const profileAnalysis =
    payload.profileAnalysis && typeof payload.profileAnalysis === "object"
      ? (payload.profileAnalysis as SessionResultDoc["profileAnalysis"])
      : base.profileAnalysis;

  return {
    ...base,
    _id: typeof c._id === "string" ? c._id : base._id,
    finalScore:
      typeof payload.finalScore === "number"
        ? payload.finalScore
        : base.finalScore,
    profile: {
      ...base.profile,
      _id: typeof c._id === "string" ? c._id : base.profile?._id,
      name: typeof c.name === "string" ? c.name : base.profile?.name,
      headline:
        typeof c.headline === "string" ? c.headline : base.profile?.headline,
      summary:
        typeof c.summary === "string" ? c.summary : base.profile?.summary,
      region: typeof c.region === "string" ? c.region : base.profile?.region,
      years_of_experience:
        typeof c.years_of_experience === "string"
          ? c.years_of_experience
          : base.profile?.years_of_experience,
      years_of_experience_raw:
        typeof c.years_of_experience_raw === "number"
          ? c.years_of_experience_raw
          : base.profile?.years_of_experience_raw,
      linkedin_profile_url:
        typeof c.linkedin_profile_url === "string"
          ? c.linkedin_profile_url
          : base.profile?.linkedin_profile_url,
      flagship_profile_url:
        typeof c.flagship_profile_url === "string"
          ? c.flagship_profile_url
          : base.profile?.flagship_profile_url,
      profile_picture_permalink:
        typeof c.profile_picture_permalink === "string"
          ? c.profile_picture_permalink
          : base.profile?.profile_picture_permalink,
      profile_picture_url:
        typeof c.profile_picture_url === "string"
          ? c.profile_picture_url
          : base.profile?.profile_picture_url,
      skills: Array.isArray(c.skills)
        ? (c.skills as string[])
        : base.profile?.skills,
      num_of_connections:
        typeof c.num_of_connections === "number"
          ? c.num_of_connections
          : base.profile?.num_of_connections,
      num_of_followers:
        typeof c.num_of_followers === "number"
          ? c.num_of_followers
          : base.profile?.num_of_followers,
      current_employers_object: currentEmployers,
      current_employers: currentEmployers,
      past_employers: pastEmployers,
      all_employers: allEmployers,
      education_background: Array.isArray(c.education_background)
        ? (c.education_background as SessionEducationRow[])
        : base.profile?.education_background,
      certifications: Array.isArray(c.certifications)
        ? (c.certifications as Array<string | SessionCertificationRow>)
        : base.profile?.certifications,
      honors: Array.isArray(c.honors)
        ? (c.honors as SessionHonorRow[])
        : base.profile?.honors,
      languages: Array.isArray(c.languages)
        ? (c.languages as string[])
        : base.profile?.languages,
      location_details:
        c.location_details && typeof c.location_details === "object"
          ? (c.location_details as NonNullable<SessionResultDoc["profile"]>["location_details"])
          : base.profile?.location_details,
      totalPositions:
        typeof c.totalPositions === "number"
          ? c.totalPositions
          : base.profile?.totalPositions,
      uniqueCompanies:
        typeof c.uniqueCompanies === "number"
          ? c.uniqueCompanies
          : base.profile?.uniqueCompanies,
      totalUniqueYears:
        typeof c.totalUniqueYears === "number"
          ? c.totalUniqueYears
          : base.profile?.totalUniqueYears,
      averageTenure:
        typeof c.averageTenure === "number"
          ? c.averageTenure
          : base.profile?.averageTenure,
      currentTenure:
        typeof c.currentTenure === "number"
          ? c.currentTenure
          : base.profile?.currentTenure,
      currentCompany:
        typeof c.currentCompany === "string"
          ? c.currentCompany
          : base.profile?.currentCompany,
      open_to_cards: Array.isArray(c.open_to_cards)
        ? normalizeOpenToCards(c.open_to_cards)
        : base.profile?.open_to_cards,
    },
    profileAnalysis,
  };
}
