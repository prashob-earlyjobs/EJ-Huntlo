"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authHeaders, getStoredAuth } from "@/lib/auth";

type CreditLedgerRow = {
  id: string;
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
};

type SourcingSessionRow = {
  id: string;
  futureJobsSessionId: string;
  prompt: string;
  sessionTitle: string;
  usingSessionOverride: boolean;
  futureJobsStatus: string;
  totalDocs: number | null;
  candidateCountFirstPage: number;
  candidatePreview: {
    id: string;
    sourcingSessionId?: string;
    linkedin_profile_url?: string;
    name: string;
    role: string;
    location: string;
    status: string;
  }[];
  profilesFetchError: string | null;
  createdAt: string;
  updatedAt: string;
};

const userSidebarItems = [
  {
    label: "Dashboard",
    subtitle: "Your workspace overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M4 12L12 4L20 12M6 10V20H18V10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Search Candidates",
    subtitle: "Find best talent quickly",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M11 19C15.42 19 19 15.42 19 11C19 6.58 15.42 3 11 3C6.58 3 3 6.58 3 11C3 15.42 6.58 19 11 19Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 21L16.65 16.65"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Search history",
    subtitle: "Past sourcing sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M12 8V12L15 15M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 3V8H8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Candidates",
    subtitle: "View available profiles",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M20 21V19C20 17.34 18.66 16 17 16H7C5.34 16 4 17.34 4 19V21M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Saved",
    subtitle: "Your shortlisted list",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M19 21L12 16L5 21V5C5 4.45 5.45 4 6 4H18C18.55 4 19 4.45 19 5V21Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "People Scout",
    subtitle: "Search LinkedIn profiles",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 19C2 16.79 3.79 15 6 15H10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 15H18C20.21 15 22 16.79 22 19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "My Profile",
    subtitle: "Professional details view",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M12 12C14.76 12 17 9.76 17 7C17 4.24 14.76 2 12 2C9.24 2 7 4.24 7 7C7 9.76 9.24 12 12 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 22C4 18.69 7.58 16 12 16C16.42 16 20 18.69 20 22"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Plans and pricing",
    subtitle: "Compare plans and limits",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M4 7H20V19H4V7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 7V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 11H20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9 15H10.5M13 15H15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Settings",
    subtitle: "Credits & account",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5ZM19.4 15A1.7 1.7 0 0 0 19.74 16.87L19.8 16.93A2 2 0 1 1 16.97 19.76L16.91 19.7A1.7 1.7 0 0 0 15.04 19.36 1.7 1.7 0 0 0 14 20.93V21A2 2 0 1 1 10 21V20.93A1.7 1.7 0 0 0 8.96 19.36 1.7 1.7 0 0 0 7.09 19.7L7.03 19.76A2 2 0 1 1 4.2 16.93L4.26 16.87A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.03 13.96H3A2 2 0 1 1 3 9.96H3.03A1.7 1.7 0 0 0 4.6 8.92 1.7 1.7 0 0 0 4.26 7.05L4.2 6.99A2 2 0 1 1 7.03 4.16L7.09 4.22A1.7 1.7 0 0 0 8.96 4.56H9.03A1.7 1.7 0 0 0 10 3V2.93A2 2 0 1 1 14 2.93V3A1.7 1.7 0 0 0 15.04 4.56 1.7 1.7 0 0 0 16.91 4.22L16.97 4.16A2 2 0 1 1 19.8 6.99L19.74 7.05A1.7 1.7 0 0 0 19.4 8.92V8.96A1.7 1.7 0 0 0 20.97 10H21A2 2 0 1 1 21 14H20.97A1.7 1.7 0 0 0 19.4 15Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

type SessionResultDoc = {
  _id?: string;
  sourcingSessionId?: string;
  finalScore?: number;
  profile?: {
    name?: string;
    region?: string;
    years_of_experience_raw?: number;
    linkedin_profile_url?: string;
    current_employers_object?: { company_name?: string; job_title?: string }[];
  };
  profileAnalysis?: {
    highlights?: { Category?: string; Highlight?: string }[];
    recommendation?: string;
  };
};

type CandidateRow = {
  name: string;
  role: string;
  experience: string;
  location: string;
  skills: string;
  status: string;
  email: string;
  phone: string;
  id?: string;
  sourcingSessionId?: string;
  linkedin_profile_url?: string;
  currentCompany?: string;
  finalScore?: number | null;
  highlights?: string[];
  recommendation?: string;
  rawDoc?: SessionResultDoc | null;
  saveListId?: string;
};

function candidateRowKey(candidate: CandidateRow) {
  return candidate.id ?? candidate.name;
}

function candidateIdentityKey(candidate: {
  id?: string;
  sourcingSessionId?: string;
  linkedin_profile_url?: string;
  name?: string;
}) {
  const id = String(candidate.id || "").trim();
  const source = String(candidate.sourcingSessionId || "").trim();
  if (id) return `id:${source}:${id}`;
  const profile = String(candidate.linkedin_profile_url || "").trim();
  if (profile) return `li:${source}:${profile}`;
  return `name:${String(candidate.name || "").trim().toLowerCase()}`;
}

type SearchSummaryState = {
  candidateCount: number;
  totalDocs: number | null;
  page: number;
  limit: number;
  totalPages: number | null;
  hasNextPage: boolean | null;
  sessionId: string | null;
  sourcingStatus: string | null;
  profilesFetchError: string | null;
};

type RecentSearchItem = {
  id: string;
  text: string;
  createdAt?: string;
};

type SaveListRow = {
  id: string;
  name: string;
};

function parsePricingQuotaFromApi(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (typeof v === "string" && v.trim()) {
    const m = v.replace(/,/g, "").match(/\d+/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

function pricingQuotaDisplayLabel(
  n: number | null | undefined,
  kind: "searches" | "unlocks" | "emails" | "phones"
): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  const q = Math.floor(n);
  if (kind === "searches") return `${q} searches`;
  if (kind === "unlocks") return `${q} candidate unlocks`;
  if (kind === "emails") return `${q} verified emails`;
  return `${q} phone numbers`;
}

type UserPricingTier = {
  id?: string;
  name: string;
  primaryPrice: string;
  secondaryPrice: string;
  description: string;
  searches?: number | null;
  candidateUnlocks?: number | null;
  verifiedEmails?: number | null;
  phoneNumbers?: number | null;
  features: string[];
  isPopular?: boolean;
  popularBadge?: string;
};

type UserPricingPlansPayload = {
  intro: string;
  tiers: UserPricingTier[];
};

type UserUtilisationStats = {
  candidateSearches: number;
  emailUnveils: number;
  candidateUnveils: number;
  mobileUnveils: number;
  linkedinLookups: number;
};

function parseUtilisationPayload(raw: unknown): UserUtilisationStats {
  const empty: UserUtilisationStats = {
    candidateSearches: 0,
    emailUnveils: 0,
    candidateUnveils: 0,
    mobileUnveils: 0,
    linkedinLookups: 0,
  };
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  const n = (key: keyof UserUtilisationStats) => {
    const v = o[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  };
  return {
    candidateSearches: n("candidateSearches"),
    emailUnveils: n("emailUnveils"),
    candidateUnveils: n("candidateUnveils"),
    mobileUnveils: n("mobileUnveils"),
    linkedinLookups: n("linkedinLookups"),
  };
}

/** Remaining / limit from plan quota (e.g. 255/300). No quota → —/— */
function quotaRemainingDisplay(used: number, limit: number | null | undefined): string {
  const u = Math.max(0, Math.floor(Number(used) || 0));
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    const L = Math.floor(limit);
    return `${Math.max(0, L - u)}/${L}`;
  }
  return "—/—";
}

type UtilisationHistoryRow = {
  id: string;
  action: string;
  amount: number;
  createdAt: string;
};

function parseUtilisationHistoryPayload(raw: unknown): UtilisationHistoryRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: UtilisationHistoryRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const action = typeof o.action === "string" ? o.action : "";
    const amount =
      typeof o.amount === "number" && Number.isFinite(o.amount)
        ? Math.max(1, Math.floor(o.amount))
        : 1;
    let createdAt = "";
    const cat = o.createdAt;
    if (typeof cat === "string") createdAt = cat;
    else if (typeof cat === "number" && Number.isFinite(cat))
      createdAt = new Date(cat).toISOString();
    if (!id || !createdAt) continue;
    rows.push({ id, action, amount, createdAt });
  }
  return rows;
}

function utilisationQuotaActionLabel(action: string): string {
  switch (action) {
    case "candidateSearches":
      return "Candidate search";
    case "emailUnveils":
      return "Email unveil";
    case "candidateUnveils":
      return "Candidate unveil";
    case "mobileUnveils":
      return "Mobile unveil";
    case "linkedinLookups":
      return "LinkedIn search";
    default:
      return action ? action.replace(/([A-Z])/g, " $1").trim() : "Activity";
  }
}

type PeopleScoutProfile = {
  name: string;
  profilePhotoUrl: string;
  headline: string;
  location: string;
  connections: string;
  about: string;
  currentCompany: string;
  experiences: {
    title: string;
    company: string;
    duration: string;
    location: string;
    description: string;
  }[];
  education: {
    school: string;
    degree: string;
    duration: string;
  }[];
  skills: string[];
  languages: string[];
  certifications: string[];
  linkedinUrl: string;
  email: string;
  phone: string;
  website: string;
};

const emptyPeopleScoutProfile: PeopleScoutProfile = {
  name: "",
  profilePhotoUrl: "",
  headline: "",
  location: "",
  connections: "—",
  about: "",
  currentCompany: "",
  experiences: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  linkedinUrl: "",
  email: "",
  phone: "",
  website: "",
};

type PeopleScoutRecentUser = {
  id: string;
  name: string;
  role: string;
  location: string;
  company: string;
  lastSearchedAt: string;
  linkedinUrl: string;
  thumbnailUrl?: string;
  /** Raw Future Jobs profile when available (from our DB) */
  profile?: Record<string, unknown> | null;
  /** From recent list — used for traceability */
  scoutId?: string;
};

type MyProfileFormState = {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  location: string;
  role: string;
};

type MyProfileSecurityState = {
  passwordChangedAt: string;
  activeSessions: number;
};

type FjScoutEmployer = {
  employer_name?: string;
  employee_title?: string;
  employee_location?: string;
  start_date?: string;
  end_date?: string | null;
  employee_description?: string;
};

type FjScoutProfile = {
  name?: string;
  headline?: string;
  title?: string;
  location?: string;
  num_of_connections?: number;
  linkedin_flagship_url?: string;
  linkedin_profile_url?: string;
  email?: string | null;
  summary?: string;
  current_employers?: FjScoutEmployer[];
  past_employers?: FjScoutEmployer[];
  education_background?: {
    degree_name?: string;
    institute_name?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
  }[];
  skills?: string[];
  languages?: string[];
  profile_picture_url?: string;
  phone?: string | null;
  mobile?: string | null;
  phone_number?: string | null;
};

function formatScoutEmploymentRange(start?: string, end?: string | null) {
  if (!start) return "—";
  const s = new Date(start);
  const sStr = Number.isNaN(s.getTime())
    ? start
    : s.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  if (end == null || end === "") return `${sStr} – Present`;
  const e = new Date(end);
  const eStr = Number.isNaN(e.getTime())
    ? end
    : e.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  return `${sStr} – ${eStr}`;
}

function mapFjProfileToPeopleScoutProfile(p: FjScoutProfile | null | undefined): PeopleScoutProfile {
  if (!p) {
    return { ...emptyPeopleScoutProfile };
  }
  const current = Array.isArray(p.current_employers) ? p.current_employers : [];
  const past = Array.isArray(p.past_employers) ? p.past_employers : [];
  const experiences: PeopleScoutProfile["experiences"] = [];

  for (const e of [...current, ...past]) {
    experiences.push({
      title: typeof e.employee_title === "string" ? e.employee_title : "",
      company: typeof e.employer_name === "string" ? e.employer_name : "",
      duration: formatScoutEmploymentRange(e.start_date, e.end_date),
      location: typeof e.employee_location === "string" ? e.employee_location : "",
      description: typeof e.employee_description === "string" ? e.employee_description : "",
    });
  }

  const eduRaw = Array.isArray(p.education_background) ? p.education_background : [];
  const education: PeopleScoutProfile["education"] = eduRaw.map((ed) => ({
    school: typeof ed.institute_name === "string" ? ed.institute_name : "",
    degree:
      [ed.degree_name, ed.field_of_study].filter(Boolean).join(" · ") ||
      (typeof ed.field_of_study === "string" ? ed.field_of_study : ""),
    duration: formatScoutEmploymentRange(ed.start_date, ed.end_date ?? undefined),
  }));

  const linkedin =
    (typeof p.linkedin_flagship_url === "string" ? p.linkedin_flagship_url : "") ||
    (typeof p.linkedin_profile_url === "string" ? p.linkedin_profile_url : "");

  return {
    name: typeof p.name === "string" && p.name.trim() ? p.name : "Unknown",
    profilePhotoUrl:
      typeof p.profile_picture_url === "string" && p.profile_picture_url.trim()
        ? p.profile_picture_url.trim()
        : "",
    headline:
      (typeof p.headline === "string" && p.headline.trim()
        ? p.headline
        : typeof p.title === "string"
          ? p.title
          : "") || "",
    location: typeof p.location === "string" ? p.location : "",
    connections:
      typeof p.num_of_connections === "number"
        ? `${p.num_of_connections.toLocaleString()} connections`
        : "—",
    about: typeof p.summary === "string" ? p.summary : "",
    currentCompany:
      current[0] && typeof current[0].employer_name === "string"
        ? current[0].employer_name
        : "",
    experiences: experiences.length > 0 ? experiences : [],
    education: education.length > 0 ? education : [],
    skills: Array.isArray(p.skills) ? p.skills.slice(0, 40) : [],
    languages: Array.isArray(p.languages) ? p.languages : [],
    certifications: [],
    linkedinUrl: linkedin,
    email: typeof p.email === "string" ? p.email : "",
    phone:
      (typeof p.phone === "string" && p.phone.trim()
        ? p.phone.trim()
        : typeof p.mobile === "string" && p.mobile.trim()
          ? p.mobile.trim()
          : typeof p.phone_number === "string" && p.phone_number.trim()
            ? p.phone_number.trim()
            : "") || "",
    website: linkedin,
  };
}

const emptyMyProfileForm: MyProfileFormState = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  location: "",
  role: "User",
};

const buildPeopleScoutProfileFromRecentUser = (
  user: PeopleScoutRecentUser
): PeopleScoutProfile => ({
  ...emptyPeopleScoutProfile,
  name: user.name,
  profilePhotoUrl:
    typeof user.thumbnailUrl === "string" && user.thumbnailUrl.trim()
      ? user.thumbnailUrl.trim()
      : "",
  headline: user.role,
  location: user.location,
  currentCompany: user.company,
  linkedinUrl: user.linkedinUrl,
  email: "",
  phone: "",
  website: user.linkedinUrl,
});

function peopleScoutNameInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function PeopleScoutRecentSearchAvatar({
  name,
  thumbnailUrl,
}: {
  name: string;
  thumbnailUrl?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = typeof thumbnailUrl === "string" ? thumbnailUrl.trim() : "";
  const showImage = Boolean(url) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  if (showImage) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- LinkedIn / scout CDN URLs */}
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-linear-to-br from-slate-100 to-slate-200 text-xs font-semibold tracking-tight text-slate-600"
      aria-hidden
    >
      {peopleScoutNameInitials(name)}
    </div>
  );
}

function PeopleScoutProfileSummaryRow({
  name,
  photoUrl,
  location,
  currentCompany,
  connections,
}: {
  name: string;
  photoUrl: string;
  location: string;
  currentCompany: string;
  connections: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const showImage = photoUrl && !imgFailed;

  useEffect(() => {
    if (!photoViewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhotoViewerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoViewerOpen]);

  return (
    <section className="border-b border-slate-100 pb-6">
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 flex-col items-center">
          {showImage ? (
            <button
              type="button"
              onClick={() => setPhotoViewerOpen(true)}
              className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200 ring-offset-2 ring-offset-white transition hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              aria-label={`View ${name} profile photo larger`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external scout URLs (LinkedIn/CDN) */}
              <img
                src={photoUrl}
                alt=""
                className="pointer-events-none h-full w-full object-cover"
                onError={() => setImgFailed(true)}
              />
            </button>
          ) : (
            <div
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200 ring-offset-2 ring-offset-white"
              aria-hidden
            >
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-2xl font-semibold tracking-tight text-slate-600">
                {peopleScoutNameInitials(name)}
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1 pt-0.5 text-sm text-slate-700">
          {location ? <p className="text-slate-600">{location}</p> : null}
          {currentCompany ? <p className="text-slate-600">{currentCompany}</p> : null}
          {connections ? <p className="text-xs text-slate-500">{connections}</p> : null}
        </div>
      </div>

      {photoViewerOpen && showImage ? (
        <div
          className="fixed inset-0 z-130 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo"
        >
          <button
            type="button"
            aria-label="Close photo"
            className="absolute inset-0 bg-slate-950/75"
            onClick={() => setPhotoViewerOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(90vh,900px)] max-w-[min(90vw,720px)] flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={`${name} — profile photo (full size)`}
              className="max-h-[min(85vh,860px)] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPhotoViewerOpen(false)}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState("");
  const [peopleScoutQuery, setPeopleScoutQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Search Candidates");
  const [searchedCandidates, setSearchedCandidates] = useState<CandidateRow[]>(
    []
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [revealedEmail, setRevealedEmail] = useState<string[]>([]);
  const [revealedPhone, setRevealedPhone] = useState<string[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [myCreditLedger, setMyCreditLedger] = useState<CreditLedgerRow[]>([]);
  const [creditHistoryLoading, setCreditHistoryLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [profilesWarning, setProfilesWarning] = useState("");
  const [showSearchSummaryModal, setShowSearchSummaryModal] = useState(false);
  const [searchSummary, setSearchSummary] = useState<SearchSummaryState | null>(
    null
  );
  const [viewResultsLoading, setViewResultsLoading] = useState(false);
  const [sessionResultDocs, setSessionResultDocs] = useState<SessionResultDoc[]>([]);
  const [sessionResultError, setSessionResultError] = useState("");
  const [sessionResultPage, setSessionResultPage] = useState(1);
  const [sessionResultTotalPages, setSessionResultTotalPages] = useState<number | null>(
    null
  );
  const [sessionResultHasNext, setSessionResultHasNext] = useState(false);
  const [sessionResultLoadingMore, setSessionResultLoadingMore] = useState(false);
  const [savedSessionCandidateKeys, setSavedSessionCandidateKeys] = useState<string[]>([]);
  const [savedCandidatesList, setSavedCandidatesList] = useState<CandidateRow[]>([]);
  const [saveCandidateBusyKeys, setSaveCandidateBusyKeys] = useState<string[]>([]);
  const [saveLists, setSaveLists] = useState<SaveListRow[]>([]);
  const [saveListsLoading, setSaveListsLoading] = useState(false);
  const [newSaveListName, setNewSaveListName] = useState("");
  const [createSaveListBusy, setCreateSaveListBusy] = useState(false);
  const [deleteSaveListBusyId, setDeleteSaveListBusyId] = useState<string | null>(null);
  const [saveListFilter, setSaveListFilter] = useState<"__all__" | "__general__" | string>(
    "__all__"
  );
  const [saveTargetListId, setSaveTargetListId] = useState("");
  const [sessionResultsFromDb, setSessionResultsFromDb] = useState(false);
  const [sessionResultsBackTab, setSessionResultsBackTab] = useState("Search Candidates");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isPeopleScoutDrawerOpen, setIsPeopleScoutDrawerOpen] = useState(false);
  const [peopleScoutRevealEmail, setPeopleScoutRevealEmail] = useState(false);
  const [peopleScoutRevealPhone, setPeopleScoutRevealPhone] = useState(false);
  const [peopleScoutLookupId, setPeopleScoutLookupId] = useState<string | null>(null);
  const [peopleScoutRevealEmailBusy, setPeopleScoutRevealEmailBusy] = useState(false);
  const [peopleScoutRevealPhoneBusy, setPeopleScoutRevealPhoneBusy] = useState(false);
  const [sourcingSessions, setSourcingSessions] = useState<SourcingSessionRow[]>(
    []
  );
  const [sourcingSessionsLoading, setSourcingSessionsLoading] = useState(false);
  const [sourcingSessionsError, setSourcingSessionsError] = useState("");
  const [revealedContactValues, setRevealedContactValues] = useState<
    Record<string, { email?: string; phone?: string }>
  >({});
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [highlightSessionId, setHighlightSessionId] = useState("");
  const [peopleScoutLoading, setPeopleScoutLoading] = useState(false);
  const [peopleScoutError, setPeopleScoutError] = useState("");
  const [peopleScoutRecentList, setPeopleScoutRecentList] = useState<PeopleScoutRecentUser[]>([]);
  const [peopleScoutRecentLoading, setPeopleScoutRecentLoading] = useState(false);
  const [userPricingPlans, setUserPricingPlans] = useState<UserPricingPlansPayload | null>(null);
  const [userPricingPlansLoading, setUserPricingPlansLoading] = useState(false);
  const [planUtilisation, setPlanUtilisation] = useState<UserUtilisationStats>(() => ({
    candidateSearches: 0,
    emailUnveils: 0,
    candidateUnveils: 0,
    mobileUnveils: 0,
    linkedinLookups: 0,
  }));
  const [utilisationHistory, setUtilisationHistory] = useState<UtilisationHistoryRow[]>([]);
  const [utilisationHistoryLoading, setUtilisationHistoryLoading] = useState(false);
  const [peopleScoutProfile, setPeopleScoutProfile] = useState<PeopleScoutProfile | null>(
    null
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [myProfileForm, setMyProfileForm] = useState<MyProfileFormState>(emptyMyProfileForm);
  const [myProfileLoading, setMyProfileLoading] = useState(false);
  const [myProfileSaving, setMyProfileSaving] = useState(false);
  const [myProfileError, setMyProfileError] = useState("");
  const [myProfileSuccess, setMyProfileSuccess] = useState("");
  const [myProfileSecurity, setMyProfileSecurity] = useState<MyProfileSecurityState>({
    passwordChangedAt: "",
    activeSessions: 1,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("ejhunter_save_target_list_id");
      if (typeof v === "string") setSaveTargetListId(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "Saved" && activeTab !== "Session Results") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setSaveListsLoading(true);
    fetch(`${apiBase}/api/candidates/save-lists`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.lists)) {
          const lists: SaveListRow[] = data.lists
            .map((row: { id?: unknown; name?: unknown }) => ({
              id: typeof row.id === "string" ? row.id : "",
              name: typeof row.name === "string" ? row.name : "List",
            }))
            .filter((row: SaveListRow) => row.id);
          setSaveLists(lists);
        } else {
          setSaveLists([]);
        }
      })
      .catch(() => setSaveLists([]))
      .finally(() => setSaveListsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!saveTargetListId) return;
    if (saveLists.length === 0) return;
    if (!saveLists.some((l) => l.id === saveTargetListId)) {
      setSaveTargetListId("");
      try {
        localStorage.removeItem("ejhunter_save_target_list_id");
      } catch {
        /* ignore */
      }
    }
  }, [saveLists, saveTargetListId]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setShowAdminLink(auth.role === "admin");
    setCreditBalance(typeof auth.credits === "number" ? auth.credits : 0);
  }, [router]);

  useEffect(() => {
    if (activeTab !== "Settings") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setCreditHistoryLoading(true);
    fetch(`${apiBase}/api/users/me/credits/history?limit=50`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.history)) {
          setMyCreditLedger(data.history);
        } else {
          setMyCreditLedger([]);
        }
      })
      .catch(() => {
        setMyCreditLedger([]);
      })
      .finally(() => {
        setCreditHistoryLoading(false);
      });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "My Profile") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

    setMyProfileLoading(true);
    setMyProfileError("");
    fetch(`${apiBase}/api/users/me`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to load profile"
          );
        }
        setMyProfileForm({
          fullName: typeof data.user.fullName === "string" ? data.user.fullName : "",
          companyName:
            typeof data.user.companyName === "string" ? data.user.companyName : "",
          email: typeof data.user.email === "string" ? data.user.email : "",
          phone: typeof data.user.mobile === "string" ? data.user.mobile : "",
          location: typeof data.user.location === "string" ? data.user.location : "",
          role: data.user.role === "admin" ? "Admin" : "User",
        });
        const passwordChangedAt =
          typeof data.security?.passwordChangedAt === "string"
            ? data.security.passwordChangedAt
            : "";
        const activeSessions =
          typeof data.security?.activeSessions === "number" &&
          Number.isFinite(data.security.activeSessions)
            ? Math.max(1, Math.floor(data.security.activeSessions))
            : 1;
        setMyProfileSecurity({ passwordChangedAt, activeSessions });
      })
      .catch((err) => {
        setMyProfileError(
          err instanceof Error ? err.message : "Could not load profile details"
        );
      })
      .finally(() => {
        setMyProfileLoading(false);
      });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Search history" && activeTab !== "Candidates") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setSourcingSessionsLoading(true);
    setSourcingSessionsError("");
    fetch(`${apiBase}/api/candidates/sessions?limit=50`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !Array.isArray(data.sessions)) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to load sessions"
          );
        }
        setSourcingSessions(data.sessions as SourcingSessionRow[]);
      })
      .catch((err) => {
        setSourcingSessionsError(
          err instanceof Error ? err.message : "Failed to load sessions"
        );
        setSourcingSessions([]);
      })
      .finally(() => {
        setSourcingSessionsLoading(false);
      });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Search Candidates") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

    fetch(`${apiBase}/api/candidates/recent-searches?limit=6`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !Array.isArray(data.searches)) {
          throw new Error("Failed to load recent searches");
        }
        const list = data.searches
          .map((s: { id?: unknown; text?: unknown; createdAt?: unknown }) => ({
            id: typeof s.id === "string" ? s.id : "",
            text: typeof s.text === "string" ? s.text.trim() : "",
            createdAt: typeof s.createdAt === "string" ? s.createdAt : undefined,
          }))
          .filter((x: RecentSearchItem) => x.id && x.text);
        setRecentSearches(list);
      })
      .catch(() => {
        setRecentSearches([]);
      });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "People Scout") return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      setPeopleScoutRecentLoading(false);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setPeopleScoutRecentLoading(true);

    fetch(`${apiBase}/api/candidates/scout-people/recent?limit=12`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !Array.isArray(data.lookups)) {
          setPeopleScoutRecentList([]);
          return;
        }
        const mapped: PeopleScoutRecentUser[] = data.lookups
          .map(
            (row: {
              id?: unknown;
              name?: unknown;
              role?: unknown;
              headline?: unknown;
              company?: unknown;
              location?: unknown;
              linkedinUrl?: unknown;
              thumbnailUrl?: unknown;
              createdAt?: unknown;
              profile?: unknown;
              scoutId?: unknown;
            }) => ({
              id: typeof row.id === "string" ? row.id : "",
              name: typeof row.name === "string" ? row.name : "Unknown",
              role:
                typeof row.role === "string" && row.role
                  ? row.role
                  : typeof row.headline === "string"
                    ? row.headline
                    : "—",
              company: typeof row.company === "string" ? row.company : "—",
              location: typeof row.location === "string" ? row.location : "—",
              linkedinUrl: typeof row.linkedinUrl === "string" ? row.linkedinUrl : "",
              thumbnailUrl: typeof row.thumbnailUrl === "string" ? row.thumbnailUrl : "",
              lastSearchedAt:
                typeof row.createdAt === "string"
                  ? new Date(row.createdAt).toLocaleString()
                  : "",
              scoutId: typeof row.scoutId === "string" ? row.scoutId : "",
              profile:
                row.profile && typeof row.profile === "object"
                  ? (row.profile as Record<string, unknown>)
                  : null,
            })
          )
          .filter((item: PeopleScoutRecentUser) => Boolean(item.id));
        setPeopleScoutRecentList(mapped);
      })
      .catch(() => {
        setPeopleScoutRecentList([]);
      })
      .finally(() => {
        setPeopleScoutRecentLoading(false);
      });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Plans and pricing") return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const auth = getStoredAuth();
    setUserPricingPlansLoading(true);
    setPlanUtilisation({
      candidateSearches: 0,
      emailUnveils: 0,
      candidateUnveils: 0,
      mobileUnveils: 0,
      linkedinLookups: 0,
    });

    const pricingReq = fetch(`${apiBase}/api/pricing-plans`).then((r) => r.json());
    const meReq =
      auth?.token != null
        ? fetch(`${apiBase}/api/users/me`, { headers: authHeaders(auth.token) }).then((r) =>
            r.json()
          )
        : Promise.resolve(null);

    Promise.allSettled([pricingReq, meReq])
      .then((results) => {
        const [priceResult, meResult] = results;

        if (priceResult.status === "fulfilled") {
          const data = priceResult.value as {
            success?: boolean;
            plans?: unknown;
          };
          if (data.success && data.plans && typeof data.plans === "object") {
            const p = data.plans as Record<string, unknown>;
            const intro = typeof p.intro === "string" ? p.intro : "";
            const rawTiers = Array.isArray(p.tiers) ? p.tiers : [];
            const tiers: UserPricingTier[] = rawTiers.map((item: unknown) => {
              const t =
                item && typeof item === "object" ? (item as Record<string, unknown>) : {};
              const features = Array.isArray(t.features) ? t.features : [];
              return {
                id: typeof t.id === "string" ? t.id : undefined,
                name: typeof t.name === "string" ? t.name : "Plan",
                primaryPrice: typeof t.primaryPrice === "string" ? t.primaryPrice : "",
                secondaryPrice: typeof t.secondaryPrice === "string" ? t.secondaryPrice : "",
                description: typeof t.description === "string" ? t.description : "",
                searches: parsePricingQuotaFromApi(t.searches),
                candidateUnlocks: parsePricingQuotaFromApi(t.candidateUnlocks),
                verifiedEmails: parsePricingQuotaFromApi(t.verifiedEmails),
                phoneNumbers: parsePricingQuotaFromApi(t.phoneNumbers),
                features: features
                  .map((f) => String(f ?? "").trim())
                  .filter((line) => line !== ""),
                isPopular: Boolean(t.isPopular),
                popularBadge:
                  typeof t.popularBadge === "string" && t.popularBadge.trim()
                    ? t.popularBadge.trim()
                    : "⭐ Most Popular",
              };
            });
            setUserPricingPlans({ intro, tiers });
          } else {
            setUserPricingPlans(null);
          }
        } else {
          setUserPricingPlans(null);
        }

        if (meResult.status === "fulfilled" && meResult.value) {
          const meData = meResult.value as {
            success?: boolean;
            user?: Record<string, unknown>;
            utilisation?: unknown;
          };
          if (meData.success && meData.user && typeof meData.user === "object") {
            const u = meData.user;
            const creditsRaw = u.credits;
            if (typeof creditsRaw === "number" && Number.isFinite(creditsRaw)) {
              const c = Math.max(0, Math.floor(creditsRaw));
              setCreditBalance(c);
              try {
                const raw = localStorage.getItem("authUser");
                if (raw && auth?.token) {
                  const prev = JSON.parse(raw) as Record<string, unknown>;
                  localStorage.setItem(
                    "authUser",
                    JSON.stringify({ ...prev, credits: c, token: auth.token })
                  );
                }
              } catch {
                /* ignore */
              }
            }
            setPlanUtilisation(parseUtilisationPayload(meData.utilisation));
          }
        }
      })
      .catch(() => {
        setUserPricingPlans(null);
      })
      .finally(() => setUserPricingPlansLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Plans and pricing") return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      setUtilisationHistory([]);
      setUtilisationHistoryLoading(false);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setUtilisationHistoryLoading(true);
    fetch(`${apiBase}/api/users/me/utilisation/history?limit=50`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.history)) {
          setUtilisationHistory(parseUtilisationHistoryPayload(data.history));
        } else {
          setUtilisationHistory([]);
        }
      })
      .catch(() => setUtilisationHistory([]))
      .finally(() => setUtilisationHistoryLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Saved" && activeTab !== "Session Results") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

    fetch(`${apiBase}/api/candidates/saved`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !Array.isArray(data.candidates)) {
          throw new Error("Failed to load saved candidates");
        }
        const mapped = data.candidates.map(
          (row: {
            candidateId?: unknown;
            sourcingSessionId?: unknown;
            linkedin_profile_url?: unknown;
            name?: unknown;
            role?: unknown;
            currentCompany?: unknown;
            location?: unknown;
            experience?: unknown;
            finalScore?: unknown;
            highlights?: unknown;
            recommendation?: unknown;
            rawDoc?: unknown;
            status?: unknown;
            saveListId?: unknown;
          }): CandidateRow => ({
            id: typeof row.candidateId === "string" ? row.candidateId : "",
            sourcingSessionId:
              typeof row.sourcingSessionId === "string" ? row.sourcingSessionId : "",
            linkedin_profile_url:
              typeof row.linkedin_profile_url === "string" ? row.linkedin_profile_url : "",
            name: typeof row.name === "string" ? row.name : "Unnamed candidate",
            role: typeof row.role === "string" ? row.role : "—",
            currentCompany:
              typeof row.currentCompany === "string" ? row.currentCompany : "",
            location: typeof row.location === "string" ? row.location : "—",
            experience: typeof row.experience === "string" ? row.experience : "—",
            skills: "—",
            finalScore:
              typeof row.finalScore === "number" ? row.finalScore : null,
            highlights: Array.isArray(row.highlights)
              ? row.highlights
                  .map((h: unknown) => String(h ?? "").trim())
                  .filter((h: string) => h !== "")
              : [],
            recommendation:
              typeof row.recommendation === "string" ? row.recommendation : "",
            rawDoc:
              row.rawDoc && typeof row.rawDoc === "object"
                ? (row.rawDoc as SessionResultDoc)
                : null,
            status: typeof row.status === "string" ? row.status : "Saved",
            email: "",
            phone: "",
            saveListId: typeof row.saveListId === "string" ? row.saveListId : "",
          })
        );
        setSavedCandidatesList(mapped);
        setSavedSessionCandidateKeys(
          mapped
            .map((row: CandidateRow) => candidateIdentityKey(row))
            .filter(
              (k: string, idx: number, arr: string[]) =>
                k !== "" && arr.indexOf(k) === idx
            )
        );
      })
      .catch(() => {
        if (activeTab === "Saved") {
          setSavedCandidatesList([]);
        }
      });
  }, [activeTab]);

  const savedCandidatesDisplay = savedCandidatesList;

  const savedCandidatesFiltered = (() => {
    const list = savedCandidatesDisplay;
    if (saveListFilter === "__all__") return list;
    if (saveListFilter === "__general__") {
      return list.filter((c) => !String(c.saveListId || "").trim());
    }
    return list.filter((c) => String(c.saveListId || "") === saveListFilter);
  })();

  const allCandidatesByKey = new Map<string, CandidateRow>();
  for (const session of sourcingSessions) {
    for (const c of session.candidatePreview) {
      const row: CandidateRow = {
        id: c.id || undefined,
        sourcingSessionId: c.sourcingSessionId || session.futureJobsSessionId,
        linkedin_profile_url: c.linkedin_profile_url || "",
        name: c.name || "Unknown",
        role: c.role || "—",
        experience: "—",
        location: c.location || "—",
        skills: "—",
        status: c.status || "Available",
        email: "",
        phone: "",
      };
      allCandidatesByKey.set(candidateRowKey(row), row);
    }
  }
  const allCandidatesForWorkspace = Array.from(allCandidatesByKey.values());
  const allCandidatesDisplay = allCandidatesForWorkspace;
  const candidatesPageList = hasSearched ? searchedCandidates : allCandidatesDisplay;

  useEffect(() => {
    if (!showSearchSummaryModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !viewResultsLoading) {
        setShowSearchSummaryModal(false);
        setViewResultsLoading(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSearchSummaryModal, viewResultsLoading]);

  useEffect(() => {
    if (
      activeTab !== "Search history" ||
      !highlightSessionId ||
      sourcingSessionsLoading
    ) {
      return;
    }
    const el = document.getElementById(`history-session-${highlightSessionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setHighlightSessionId(""), 1800);
    return () => window.clearTimeout(timer);
  }, [activeTab, highlightSessionId, sourcingSessionsLoading]);

  const goToSearchHistory = (item: RecentSearchItem) => {
    if (!item.id.startsWith("fallback-")) {
      setHighlightSessionId(item.id);
    }
    setActiveTab("Search history");
  };

  const handlePeopleScoutSearch = async () => {
    const query = peopleScoutQuery.trim();
    if (!query) {
      setPeopleScoutError("Enter an email or LinkedIn profile URL.");
      return;
    }
    const auth = getStoredAuth();
    if (!auth?.token) {
      setPeopleScoutError("Please sign in again to use People Scout.");
      return;
    }
    setPeopleScoutLoading(true);
    setPeopleScoutError("");
    setPeopleScoutRevealEmail(false);
    setPeopleScoutRevealPhone(false);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/candidates/scout-people/lookup`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "People Scout lookup failed"
        );
      }
      const fjData = data.futureJobs?.data as { profile?: FjScoutProfile } | undefined;
      setPeopleScoutProfile(mapFjProfileToPeopleScoutProfile(fjData?.profile));
      setPeopleScoutLookupId(typeof data.lookupId === "string" ? data.lookupId : null);
      setIsPeopleScoutDrawerOpen(true);
      setPeopleScoutQuery("");
      const auth2 = getStoredAuth();
      if (auth2?.token) {
        const recentRes = await fetch(`${apiBase}/api/candidates/scout-people/recent?limit=12`, {
          headers: authHeaders(auth2.token),
        });
        const recentData = await recentRes.json().catch(() => ({}));
        if (recentRes.ok && recentData.success && Array.isArray(recentData.lookups)) {
          const mapped: PeopleScoutRecentUser[] = recentData.lookups
            .map(
              (row: {
                id?: unknown;
                name?: unknown;
                role?: unknown;
                headline?: unknown;
                company?: unknown;
                location?: unknown;
                linkedinUrl?: unknown;
                thumbnailUrl?: unknown;
                createdAt?: unknown;
                profile?: unknown;
                scoutId?: unknown;
              }) => ({
                id: typeof row.id === "string" ? row.id : "",
                name: typeof row.name === "string" ? row.name : "Unknown",
                role:
                  typeof row.role === "string" && row.role
                    ? row.role
                    : typeof row.headline === "string"
                      ? row.headline
                      : "—",
                company: typeof row.company === "string" ? row.company : "—",
                location: typeof row.location === "string" ? row.location : "—",
                linkedinUrl: typeof row.linkedinUrl === "string" ? row.linkedinUrl : "",
                thumbnailUrl:
                  typeof row.thumbnailUrl === "string" ? row.thumbnailUrl : "",
                lastSearchedAt:
                  typeof row.createdAt === "string"
                    ? new Date(row.createdAt).toLocaleString()
                    : "",
                scoutId: typeof row.scoutId === "string" ? row.scoutId : "",
                profile:
                  row.profile && typeof row.profile === "object"
                    ? (row.profile as Record<string, unknown>)
                    : null,
              })
            )
            .filter((x: PeopleScoutRecentUser) => x.id);
          setPeopleScoutRecentList(mapped);
        }
      }
    } catch (err) {
      setPeopleScoutError(err instanceof Error ? err.message : "People Scout lookup failed");
    } finally {
      setPeopleScoutLoading(false);
    }
  };

  const openPeopleScoutDetails = (user: PeopleScoutRecentUser) => {
    setPeopleScoutLoading(true);
    try {
      setPeopleScoutRevealEmail(false);
      setPeopleScoutRevealPhone(false);
      setPeopleScoutLookupId(typeof user.id === "string" && user.id ? user.id : null);
      if (user.profile && typeof user.profile === "object") {
        setPeopleScoutProfile(
          mapFjProfileToPeopleScoutProfile(user.profile as unknown as FjScoutProfile)
        );
      } else {
        setPeopleScoutProfile(buildPeopleScoutProfileFromRecentUser(user));
      }
      setIsPeopleScoutDrawerOpen(true);
    } finally {
      setPeopleScoutLoading(false);
    }
  };

  const revealPeopleScoutContactFromApi = async (revealType: "EMAIL" | "PHONE") => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setProfilesWarning("Please sign in again to reveal contacts.");
      return;
    }
    if (!peopleScoutLookupId?.trim()) {
      setProfilesWarning(
        "Cannot reveal contact for this profile. Run a People Scout search from this tab first."
      );
      return;
    }
    const busySetter =
      revealType === "EMAIL" ? setPeopleScoutRevealEmailBusy : setPeopleScoutRevealPhoneBusy;
    busySetter(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/candidates/scout-people/reveal-contact`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          lookupId: peopleScoutLookupId,
          revealType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Reveal failed"
        );
      }
      const raw =
        typeof data.value === "string"
          ? data.value.trim()
          : Array.isArray(data.values) && data.values.length > 0
            ? String(data.values[0]).trim()
            : "";
      const upstreamMsg =
        typeof data.upstreamMessage === "string" ? data.upstreamMessage.trim() : "";
      if (!raw && upstreamMsg) {
        setProfilesWarning(upstreamMsg);
      }
      setPeopleScoutProfile((prev) =>
        prev
          ? {
              ...prev,
              ...(revealType === "EMAIL" ? { email: raw } : { phone: raw }),
            }
          : null
      );
      if (revealType === "EMAIL") setPeopleScoutRevealEmail(true);
      else setPeopleScoutRevealPhone(true);
    } catch (err) {
      setProfilesWarning(
        err instanceof Error ? err.message : "Could not reveal contact"
      );
    } finally {
      busySetter(false);
    }
  };

  const onMyProfileFieldChange = (field: keyof MyProfileFormState, value: string) => {
    setMyProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const onEditMyProfile = () => {
    setIsEditingProfile(true);
  };

  const onCancelMyProfileEdit = () => {
    setMyProfileSuccess("");
    setMyProfileError("");
    const auth = getStoredAuth();
    setMyProfileForm({
      fullName: auth?.fullName || "",
      companyName: auth?.companyName || "",
      email: auth?.email || "",
      phone: auth?.mobile || "",
      location: auth?.location || "",
      role: auth?.role === "admin" ? "Admin" : "User",
    });
    setIsEditingProfile(false);
  };

  const onSaveMyProfile = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setMyProfileError("Please sign in again to update profile.");
      return;
    }
    setMyProfileError("");
    setMyProfileSuccess("");
    setMyProfileSaving(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/users/me`, {
        method: "PATCH",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          fullName: myProfileForm.fullName,
          companyName: myProfileForm.companyName,
          mobile: myProfileForm.phone,
          email: myProfileForm.email,
          location: myProfileForm.location,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.user) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to save profile"
        );
      }
      const updatedAuth = { ...auth, ...data.user, token: auth.token };
      localStorage.setItem("authUser", JSON.stringify(updatedAuth));
      setMyProfileForm({
        fullName: data.user.fullName || "",
        companyName: data.user.companyName || "",
        email: data.user.email || "",
        phone: data.user.mobile || "",
        location: data.user.location || "",
        role: data.user.role === "admin" ? "Admin" : "User",
      });
      const passwordChangedAt =
        typeof data.security?.passwordChangedAt === "string"
          ? data.security.passwordChangedAt
          : myProfileSecurity.passwordChangedAt;
      const activeSessions =
        typeof data.security?.activeSessions === "number" &&
        Number.isFinite(data.security.activeSessions)
          ? Math.max(1, Math.floor(data.security.activeSessions))
          : myProfileSecurity.activeSessions;
      setMyProfileSecurity({ passwordChangedAt, activeSessions });
      setMyProfileSuccess("Profile updated successfully.");
      setIsEditingProfile(false);
    } catch (err) {
      setMyProfileError(
        err instanceof Error ? err.message : "Could not update profile"
      );
    } finally {
      setMyProfileSaving(false);
    }
  };

  const onPasswordFieldChange = (
    field: "currentPassword" | "newPassword" | "confirmPassword",
    value: string
  ) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdatePassword = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setMyProfileError("Please sign in again to update password.");
      return;
    }
    setMyProfileError("");
    setMyProfileSuccess("");
    setPasswordUpdateLoading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/users/me/password`, {
        method: "PATCH",
        headers: authHeaders(auth.token),
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to update password"
        );
      }
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMyProfileSuccess("Password updated successfully.");
      setMyProfileSecurity((prev) => ({
        passwordChangedAt:
          typeof data.security?.passwordChangedAt === "string"
            ? data.security.passwordChangedAt
            : prev.passwordChangedAt,
        activeSessions:
          typeof data.security?.activeSessions === "number"
            ? Math.max(1, Math.floor(data.security.activeSessions))
            : prev.activeSessions,
      }));
    } catch (err) {
      setMyProfileError(
        err instanceof Error ? err.message : "Could not update password"
      );
    } finally {
      setPasswordUpdateLoading(false);
    }
  };

  const handleSearch = async () => {
    const prompt = aiPrompt.trim();
    setHasSearched(true);
    setSearchError("");
    setProfilesWarning("");

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again to search.");
      setSearchedCandidates([]);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setSearchLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/candidates/search`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Search failed"
        );
      }
      const list = Array.isArray(data.candidates)
        ? (data.candidates as CandidateRow[])
        : [];
      const warn =
        typeof data.profilesFetchError === "string" && data.profilesFetchError
          ? data.profilesFetchError
          : "";
      setProfilesWarning(warn);
      const displayList: CandidateRow[] = list;
      setSearchedCandidates(displayList);

      const pg = data.profilesPagination;
      const totalDisplayCount =
        typeof data.futureJobs?.data?.sourcing?.total_display_count === "number"
          ? data.futureJobs.data.sourcing.total_display_count
          : null;
      setSearchSummary({
        candidateCount: displayList.length,
        totalDocs:
          totalDisplayCount ??
          (typeof pg?.totalDocs === "number" ? pg.totalDocs : null),
        page: typeof data.page === "number" ? data.page : 1,
        limit: typeof data.limit === "number" ? data.limit : 20,
        totalPages:
          typeof pg?.totalPages === "number" ? pg.totalPages : null,
        hasNextPage:
          typeof pg?.hasNextPage === "boolean" ? pg.hasNextPage : null,
        sessionId:
          typeof data.futureJobs?.data?.session?._id === "string"
            ? data.futureJobs.data.session._id
            : null,
        sourcingStatus:
          typeof data.futureJobs?.status === "string"
            ? data.futureJobs.status
            : null,
        profilesFetchError: warn || null,
      });
      setShowSearchSummaryModal(true);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Unable to complete search"
      );
      setSearchedCandidates([]);
      setShowSearchSummaryModal(false);
      setSearchSummary(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const closeSearchSummaryModal = () => {
    setShowSearchSummaryModal(false);
    setViewResultsLoading(false);
  };

  /**
   * Loads profiles from Future Jobs via our backend: POST …/fetch-more (optional) then GET …/profiles.
   */
  const handleViewResults = async () => {
    if (!searchSummary?.sessionId) {
      closeSearchSummaryModal();
      return;
    }

    setViewResultsLoading(true);
    setSessionResultError("");

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again to load profiles.");
      closeSearchSummaryModal();
      setViewResultsLoading(false);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const sid = encodeURIComponent(searchSummary.sessionId);
    const limit = searchSummary.limit;
    const url = `${apiBase}/api/candidates/session/${sid}/profiles?page=1&limit=${limit}&fetchMore=0`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to load profiles"
        );
      }

      const docs = Array.isArray(data.futureJobsProfiles?.data?.docs)
        ? (data.futureJobsProfiles.data.docs as SessionResultDoc[])
        : [];
      setSessionResultDocs(docs);
      setSessionResultsFromDb(false);
      const pg = data.profilesPagination;
      const initialPage = typeof data.page === "number" ? data.page : 1;
      setSessionResultPage(initialPage);
      setSessionResultTotalPages(
        typeof pg?.totalPages === "number" ? pg.totalPages : null
      );
      setSessionResultHasNext(
        typeof pg?.hasNextPage === "boolean"
          ? pg.hasNextPage
          : typeof pg?.totalPages === "number"
            ? initialPage < pg.totalPages
            : false
      );

      const list = Array.isArray(data.candidates)
        ? (data.candidates as CandidateRow[])
        : [];
      setSearchedCandidates(list);

      const warn =
        (typeof data.profilesFetchError === "string" && data.profilesFetchError) ||
        (typeof data.fetchMoreError === "string" && data.fetchMoreError
          ? `fetch-more: ${data.fetchMoreError}`
          : "");
      setProfilesWarning(warn);

      setSearchSummary((prev) =>
        prev
          ? {
              ...prev,
              candidateCount: list.length,
              totalDocs:
                typeof prev.totalDocs === "number"
                  ? prev.totalDocs
                  : typeof pg?.totalDocs === "number"
                    ? pg.totalDocs
                    : prev.totalDocs,
              page: typeof data.page === "number" ? data.page : 1,
              limit: typeof data.limit === "number" ? data.limit : prev.limit,
              totalPages:
                typeof pg?.totalPages === "number" ? pg.totalPages : null,
              hasNextPage:
                typeof pg?.hasNextPage === "boolean" ? pg.hasNextPage : null,
              profilesFetchError: warn || null,
            }
          : prev
      );

      setHasSearched(true);
      setSessionResultsBackTab(activeTab);
      setActiveTab("Session Results");
      closeSearchSummaryModal();
    } catch (err) {
      setSessionResultError(
        err instanceof Error ? err.message : "Could not load session profiles"
      );
      closeSearchSummaryModal();
    } finally {
      setViewResultsLoading(false);
    }
  };

  const handleViewMoreSessionResults = async () => {
    if (!searchSummary?.sessionId || !sessionResultHasNext || sessionResultLoadingMore) {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSessionResultError("Please sign in again to load more results.");
      return;
    }

    const nextPage = sessionResultPage + 1;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const sid = encodeURIComponent(searchSummary.sessionId);
    const limit = searchSummary.limit;
    const url = sessionResultsFromDb
      ? `${apiBase}/api/candidates/session/${sid}/stored-candidates?page=${nextPage}&limit=${limit}`
      : `${apiBase}/api/candidates/session/${sid}/profiles?page=${nextPage}&limit=${limit}&fetchMore=1`;

    setSessionResultLoadingMore(true);
    setSessionResultError("");
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to load more profiles"
        );
      }

      const docs = sessionResultsFromDb
        ? Array.isArray(data.detailedDocs)
          ? (data.detailedDocs as SessionResultDoc[])
          : []
        : Array.isArray(data.futureJobsProfiles?.data?.docs)
          ? (data.futureJobsProfiles.data.docs as SessionResultDoc[])
          : [];
      setSessionResultDocs((prev) => {
        const seen = new Set(prev.map((d) => d._id).filter(Boolean));
        const merged = [...prev];
        for (const d of docs) {
          if (!d._id || !seen.has(d._id)) {
            merged.push(d);
            if (d._id) seen.add(d._id);
          }
        }
        return merged;
      });

      const pg = data.profilesPagination;
      const pageNow = typeof data.page === "number" ? data.page : nextPage;
      setSessionResultPage(pageNow);
      setSessionResultTotalPages(
        typeof pg?.totalPages === "number" ? pg.totalPages : sessionResultTotalPages
      );
      setSessionResultHasNext(
        typeof pg?.hasNextPage === "boolean"
          ? pg.hasNextPage
          : typeof pg?.totalPages === "number"
            ? pageNow < pg.totalPages
            : false
      );
    } catch (err) {
      setSessionResultError(
        err instanceof Error ? err.message : "Could not load more session profiles"
      );
    } finally {
      setSessionResultLoadingMore(false);
    }
  };

  const openSessionFromHistory = async (row: SourcingSessionRow) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again.");
      return;
    }
    setSessionResultsBackTab("Search history");
    setActiveTab("Session Results");
    setSearchLoading(true);
    setProfilesWarning("");
    setSearchError("");
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const limit = 20;
    try {
      const sid = encodeURIComponent(row.futureJobsSessionId);
      const url = `${apiBase}/api/candidates/session/${sid}/stored-candidates?page=1&limit=${limit}`;
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to load session"
        );
      }
      const list = Array.isArray(data.candidates)
        ? (data.candidates as CandidateRow[])
        : [];
      setSearchedCandidates(list);
      setHasSearched(true);
      const detailedDocs = Array.isArray(data.detailedDocs)
        ? (data.detailedDocs as SessionResultDoc[])
        : [];
      setSessionResultDocs(detailedDocs);
      setSessionResultsFromDb(true);
      const pg = data.profilesPagination;
      const warn =
        (typeof data.profilesFetchError === "string" && data.profilesFetchError) ||
        (typeof data.fetchMoreError === "string"
          ? `fetch-more: ${data.fetchMoreError}`
          : "");
      setProfilesWarning(warn);
      setSearchSummary({
        candidateCount: list.length,
        totalDocs:
          typeof row.totalDocs === "number"
            ? row.totalDocs
            : typeof pg?.totalDocs === "number"
              ? pg.totalDocs
              : null,
        page: typeof data.page === "number" ? data.page : 1,
        limit: typeof data.limit === "number" ? data.limit : limit,
        totalPages:
          typeof pg?.totalPages === "number" ? pg.totalPages : null,
        hasNextPage:
          typeof pg?.hasNextPage === "boolean" ? pg.hasNextPage : null,
        sessionId: row.futureJobsSessionId,
        sourcingStatus: row.futureJobsStatus || null,
        profilesFetchError: warn || row.profilesFetchError || null,
      });
      setAiPrompt(row.prompt || row.sessionTitle || "");
      setSessionResultPage(typeof data.page === "number" ? data.page : 1);
      setSessionResultTotalPages(
        typeof pg?.totalPages === "number" ? pg.totalPages : null
      );
      setSessionResultHasNext(
        typeof pg?.hasNextPage === "boolean"
          ? pg.hasNextPage
          : typeof pg?.totalPages === "number"
            ? (typeof data.page === "number" ? data.page : 1) < pg.totalPages
            : false
      );
      setActiveTab("Session Results");
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Could not open this session"
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSaveCandidate = async (candidate: CandidateRow) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again to save candidates.");
      return;
    }
    const key = candidateIdentityKey(candidate);
    if (!key) return;
    const isSaved = savedSessionCandidateKeys.includes(key);
    setSaveCandidateBusyKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/candidates/saved`, {
        method: isSaved ? "DELETE" : "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          candidateId: candidate.id || "",
          sourcingSessionId: candidate.sourcingSessionId || "",
          linkedin_profile_url: candidate.linkedin_profile_url || "",
          name: candidate.name || "",
          role: candidate.role || "",
          currentCompany: candidate.currentCompany || "",
          location: candidate.location || "",
          experience: candidate.experience || "",
          finalScore:
            typeof candidate.finalScore === "number" ? candidate.finalScore : null,
          highlights: Array.isArray(candidate.highlights) ? candidate.highlights : [],
          recommendation: candidate.recommendation || "",
          rawDoc: candidate.rawDoc || null,
          status: "Saved",
          ...(!isSaved && saveTargetListId.trim()
            ? { saveListId: saveTargetListId.trim() }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to update saved candidate"
        );
      }

      setSavedSessionCandidateKeys((prev) =>
        isSaved ? prev.filter((x) => x !== key) : [...prev, key]
      );
      setSavedCandidatesList((prev) => {
        if (isSaved) {
          return prev.filter((row) => candidateIdentityKey(row) !== key);
        }
        if (prev.some((row) => candidateIdentityKey(row) === key)) {
          return prev;
        }
        const nextSaveListId =
          typeof data.candidate?.saveListId === "string"
            ? data.candidate.saveListId
            : saveTargetListId.trim() || "";
        return [
          {
            ...candidate,
            status: "Saved",
            saveListId: nextSaveListId,
          },
          ...prev,
        ];
      });
    } catch (err) {
      setProfilesWarning(
        err instanceof Error ? err.message : "Could not update saved candidate"
      );
    } finally {
      setSaveCandidateBusyKeys((prev) => prev.filter((x) => x !== key));
    }
  };

  const handleCreateSaveList = async () => {
    const name = newSaveListName.trim();
    if (!name || createSaveListBusy) return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      setProfilesWarning("Please sign in again to create a list.");
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setCreateSaveListBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/candidates/save-lists`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to create list"
        );
      }
      const id = typeof data.list?.id === "string" ? data.list.id : "";
      const listName = typeof data.list?.name === "string" ? data.list.name : name;
      if (id) {
        setSaveLists((prev) => [{ id, name: listName }, ...prev]);
        setNewSaveListName("");
        setSaveListFilter(id);
      }
    } catch (err) {
      setProfilesWarning(err instanceof Error ? err.message : "Could not create list");
    } finally {
      setCreateSaveListBusy(false);
    }
  };

  const handleDeleteSaveList = async (listId: string) => {
    if (!listId) return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      setProfilesWarning("Please sign in again to delete a list.");
      return;
    }
    const ok = window.confirm(
      "Delete this list? Candidates in it will move to General (not removed)."
    );
    if (!ok) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setDeleteSaveListBusyId(listId);
    try {
      const res = await fetch(`${apiBase}/api/candidates/save-lists/${encodeURIComponent(listId)}`, {
        method: "DELETE",
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to delete list"
        );
      }
      setSaveLists((prev) => prev.filter((l) => l.id !== listId));
      setSavedCandidatesList((prev) =>
        prev.map((row) =>
          String(row.saveListId || "") === listId ? { ...row, saveListId: "" } : row
        )
      );
      if (saveListFilter === listId) setSaveListFilter("__all__");
      if (saveTargetListId === listId) {
        setSaveTargetListId("");
        try {
          localStorage.removeItem("ejhunter_save_target_list_id");
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setProfilesWarning(err instanceof Error ? err.message : "Could not delete list");
    } finally {
      setDeleteSaveListBusyId(null);
    }
  };

  const moveCandidateToSaveList = async (candidate: CandidateRow, nextListId: string) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setProfilesWarning("Please sign in again to move candidates.");
      return;
    }
    const key = candidateIdentityKey(candidate);
    if (!key) return;
    setSaveCandidateBusyKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/candidates/saved`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          candidateId: candidate.id || "",
          sourcingSessionId: candidate.sourcingSessionId || "",
          linkedin_profile_url: candidate.linkedin_profile_url || "",
          name: candidate.name || "",
          role: candidate.role || "",
          currentCompany: candidate.currentCompany || "",
          location: candidate.location || "",
          experience: candidate.experience || "",
          finalScore:
            typeof candidate.finalScore === "number" ? candidate.finalScore : null,
          highlights: Array.isArray(candidate.highlights) ? candidate.highlights : [],
          recommendation: candidate.recommendation || "",
          rawDoc: candidate.rawDoc || null,
          status: candidate.status || "Saved",
          saveListId: nextListId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to move candidate"
        );
      }
      const resolved =
        typeof data.candidate?.saveListId === "string" ? data.candidate.saveListId : "";
      setSavedCandidatesList((prev) =>
        prev.map((row) =>
          candidateIdentityKey(row) === key ? { ...row, saveListId: resolved } : row
        )
      );
    } catch (err) {
      setProfilesWarning(err instanceof Error ? err.message : "Could not move candidate");
    } finally {
      setSaveCandidateBusyKeys((prev) => prev.filter((x) => x !== key));
    }
  };

  const revealContact = async (
    candidate: CandidateRow,
    revealType: "EMAIL" | "PHONE"
  ) => {
    const key = candidateRowKey(candidate);
    if (revealType === "EMAIL") {
      setRevealedEmail((prev) => (prev.includes(key) ? prev : [...prev, key]));
    } else {
      setRevealedPhone((prev) => (prev.includes(key) ? prev : [...prev, key]));
    }

    const cached = revealedContactValues[key];
    if (
      (revealType === "EMAIL" && cached?.email) ||
      (revealType === "PHONE" && cached?.phone)
    ) {
      return;
    }

    if (!candidate.sourcingSessionId || !candidate.linkedin_profile_url) {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again to reveal contacts.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/candidates/reveal-contact`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          sourcingSessionId: candidate.sourcingSessionId,
          linkedin_profile_url: candidate.linkedin_profile_url,
          revealType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Reveal failed"
        );
      }
      const value =
        typeof data.value === "string"
          ? data.value
          : Array.isArray(data.values) && data.values.length > 0
            ? String(data.values[0])
            : "";

      setRevealedContactValues((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          email:
            revealType === "EMAIL"
              ? value || prev[key]?.email
              : prev[key]?.email,
          phone:
            revealType === "PHONE"
              ? value || prev[key]?.phone
              : prev[key]?.phone,
        },
      }));
    } catch (err) {
      setProfilesWarning(
        err instanceof Error ? err.message : "Could not reveal contact"
      );
    }
  };

  const revealEmail = (candidate: CandidateRow) => {
    void revealContact(candidate, "EMAIL");
  };

  const revealPhone = (candidate: CandidateRow) => {
    void revealContact(candidate, "PHONE");
  };

  const getDisplayedEmail = (candidate: CandidateRow) => {
    const key = candidateRowKey(candidate);
    return revealedContactValues[key]?.email || candidate.email || "";
  };

  const getDisplayedPhone = (candidate: CandidateRow) => {
    const key = candidateRowKey(candidate);
    return revealedContactValues[key]?.phone || candidate.phone || "";
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const auth = getStoredAuth();

      await fetch(`${apiBase}/api/users/logout`, {
        method: "POST",
        headers: auth?.token
          ? authHeaders(auth.token)
          : {
              "Content-Type": "application/json",
            },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      localStorage.removeItem("authUser");
      router.push("/login");
    }
  };

  return (
    <main className="premium-shell min-h-screen text-slate-900">
      <div className="flex min-h-screen min-w-0 w-full">
        <aside className="hidden min-h-screen w-72 flex-col border-r border-slate-200 bg-white/90 p-6 backdrop-blur lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              User Panel
            </p>
            <h1 className="mt-2 text-xl font-semibold text-black">EJHunter</h1>
          </div>

          <nav className="mt-8 flex-1 space-y-2">
            {userSidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveTab(item.label)}
                className={`w-full rounded-xl px-3 py-3 text-left transition ${
                  activeTab === item.label
                    ? "bg-black text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-md border p-1.5 ${
                      activeTab === item.label
                        ? "border-white/40 text-white"
                        : "border-slate-300 text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span
                      className={`block text-xs ${
                        activeTab === item.label ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Credits
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-black">
              {creditBalance}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Available balance</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  User Workspace
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-black">{activeTab}</h2>
                <p className="mt-2 text-xs text-slate-500 lg:hidden">
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 font-semibold tabular-nums text-slate-900">
                    Credits: {creditBalance}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {showAdminLink ? (
                  <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Admin panel
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M9 21H5C4.45 21 4 20.55 4 20V4C4 3.45 4.45 3 5 3H9M16 17L21 12L16 7M21 12H9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          </header>

          <div className="flex min-w-0 flex-1 p-6">
            {activeTab === "Search Candidates" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M11 19C15.42 19 19 15.42 19 11C19 6.58 15.42 3 11 3C6.58 3 3 6.58 3 11C3 15.42 6.58 19 11 19Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 21L16.65 16.65"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Search Candidates
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Give AI prompt and search candidate keywords.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Results:{" "}
                    {hasSearched
                      ? (searchSummary?.totalDocs ?? searchedCandidates.length)
                      : 0}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="aiPrompt"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                          <path
                            d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        AI prompt
                      </span>
                    </label>
                    <textarea
                      id="aiPrompt"
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder="Example: Find candidates with 3+ years Node.js experience in Hyderabad who can join in 30 days."
                      rows={6}
                      disabled={searchLoading}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-4 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSearch()}
                      disabled={searchLoading || aiPrompt.trim().length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path
                          d="M11 19C15.42 19 19 15.42 19 11C19 6.58 15.42 3 11 3C6.58 3 3 6.58 3 11C3 15.42 6.58 19 11 19Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 21L16.65 16.65"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {searchLoading ? "Searching…" : "Search"}
                    </button>
                  </div>

                  {searchError ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {searchError}
                    </p>
                  ) : null}
                  {profilesWarning ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      Session created, but profiles could not be loaded:{" "}
                      {profilesWarning}
                    </p>
                  ) : null}

                  {searchLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Searching candidates with AI
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Analyzing prompt, creating sourcing session, and matching profiles.
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-500" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-8 w-full min-w-0 border-t border-slate-200 pt-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M12 8V12L15 15M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Recent Searches
                  </h4>
                  {recentSearches.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No recent searches yet.</p>
                  ) : (
                  <ul className="mt-3 w-full min-w-0 space-y-2">
                    {recentSearches.map((item) => (
                      <li
                        key={item.id}
                        className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <button
                          type="button"
                          onClick={() => goToSearchHistory(item)}
                          className="grid min-w-0 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-4 w-4 shrink-0 text-slate-500"
                          >
                            <path
                              d="M9 18L15 12L9 6"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="min-w-0 truncate">{item.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  )}
                </div>
              </section>
            ) : activeTab === "Session Results" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-black">Session Results</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Detailed candidate results loaded from the selected sourcing session.
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>
                        Page {sessionResultPage}
                        {sessionResultTotalPages != null ? ` of ${sessionResultTotalPages}` : ""}
                      </span>
                      <select
                        value={saveTargetListId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSaveTargetListId(v);
                          try {
                            if (!v) localStorage.removeItem("ejhunter_save_target_list_id");
                            else localStorage.setItem("ejhunter_save_target_list_id", v);
                          } catch {
                            /* ignore */
                          }
                        }}
                        disabled={saveListsLoading}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-800"
                        aria-label="List for new saves"
                      >
                        <option value="">Save to: General</option>
                        {saveLists.map((l) => (
                          <option key={l.id} value={l.id}>
                            Save to: {l.name}
                          </option>
                        ))}
                      </select>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFilterDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                        <path
                          d="M4 6H20M7 12H17M10 18H14"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit filter
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(sessionResultsBackTab)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                          <path
                            d="M15 18L9 12L15 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Back
                      </span>
                    </button>
                  </div>
                </div>

                {sessionResultError ? (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {sessionResultError}
                  </p>
                ) : null}

                {sessionResultDocs.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">
                    No detailed profile docs found for this session.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {sessionResultDocs.map((doc, idx) => {
                        const highlights = doc.profileAnalysis?.highlights ?? [];
                        const current = doc.profile?.current_employers_object?.[0];
                        const revealCandidate: CandidateRow = {
                          id: doc._id || `session-doc-${idx}`,
                          sourcingSessionId: doc.sourcingSessionId || searchSummary?.sessionId || "",
                          linkedin_profile_url: doc.profile?.linkedin_profile_url || "",
                          name: doc.profile?.name || "Unnamed candidate",
                          role: current?.job_title || "Role unavailable",
                          currentCompany: current?.company_name || "",
                          experience:
                            typeof doc.profile?.years_of_experience_raw === "number"
                              ? `${doc.profile.years_of_experience_raw} years`
                              : "—",
                          location: doc.profile?.region || "Location unavailable",
                          skills: "—",
                          finalScore: typeof doc.finalScore === "number" ? doc.finalScore : null,
                          highlights: highlights
                            .map((h) => String(h.Highlight || "").trim())
                            .filter((h) => h !== ""),
                          recommendation: doc.profileAnalysis?.recommendation || "",
                          rawDoc: doc,
                          status: "Available",
                          email: "",
                          phone: "",
                        };
                        const sessionCandidateKey = candidateIdentityKey(revealCandidate);
                        const isSavedSessionCandidate =
                          savedSessionCandidateKeys.includes(sessionCandidateKey);
                        const isSaveBusy = saveCandidateBusyKeys.includes(sessionCandidateKey);
                        return (
                          <article
                            key={doc._id || `session-doc-${idx}`}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-base font-semibold text-slate-900">
                                  {doc.profile?.name || "Unnamed candidate"}
                                </h4>
                                <p className="mt-1 text-xs text-slate-600">
                                  {current?.job_title || "Role unavailable"}
                                  {current?.company_name ? ` · ${current.company_name}` : ""}
                                </p>
                              </div>
                              {typeof doc.finalScore === "number" ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                  Score {doc.finalScore}/5
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 text-xs text-slate-600">
                              {doc.profile?.region || "Location unavailable"}
                              {typeof doc.profile?.years_of_experience_raw === "number"
                                ? ` · ${doc.profile.years_of_experience_raw} years`
                                : ""}
                            </p>

                            {highlights.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {highlights.slice(0, 4).map((h, i) => (
                                  <span
                                    key={`${h.Category || "highlight"}-${i}`}
                                    className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                                  >
                                    {h.Category ? `${h.Category}: ` : ""}
                                    {h.Highlight || "—"}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {doc.profileAnalysis?.recommendation ? (
                              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
                                {doc.profileAnalysis.recommendation}
                              </p>
                            ) : null}

                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void toggleSaveCandidate(revealCandidate)}
                                  disabled={isSaveBusy}
                                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                                    isSavedSessionCandidate
                                      ? "border-black bg-black text-white hover:bg-slate-900"
                                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                  } disabled:opacity-60`}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                    <path
                                      d="M19 21L12 16L5 21V5C5 4.45 5.45 4 6 4H18C18.55 4 19 4.45 19 5V21Z"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  {isSaveBusy
                                    ? "Saving..."
                                    : isSavedSessionCandidate
                                      ? "Saved"
                                      : "Save Candidate"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => revealEmail(revealCandidate)}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                    <path
                                      d="M4 6H20V18H4V6ZM4 7L12 13L20 7"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Reveal Email
                                </button>
                                <button
                                  type="button"
                                  onClick={() => revealPhone(revealCandidate)}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                    <path
                                      d="M22 16.92V19.92C22 20.47 21.55 20.92 21 20.92C10.51 20.92 2 12.41 2 1.92C2 1.37 2.45 0.92 3 0.92H6C6.47 0.92 6.88 1.25 6.98 1.71L7.78 5.31C7.86 5.7 7.74 6.11 7.46 6.39L5.42 8.43C6.76 11.13 8.95 13.32 11.65 14.66L13.69 12.62C13.97 12.34 14.38 12.22 14.77 12.3L18.37 13.1C18.83 13.2 19.16 13.61 19.16 14.08V16.92"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Reveal Mobile
                                </button>
                              </div>
                              {revealedEmail.includes(candidateRowKey(revealCandidate)) ? (
                                <p className="mt-2 text-xs text-slate-600">
                                  {getDisplayedEmail(revealCandidate) || "—"}
                                </p>
                              ) : null}
                              {revealedPhone.includes(candidateRowKey(revealCandidate)) ? (
                                <p className="mt-1 text-xs text-slate-600">
                                  {getDisplayedPhone(revealCandidate) || "—"}
                                </p>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {sessionResultHasNext ? (
                      <div className="mt-5 flex justify-center">
                        <button
                          type="button"
                          onClick={() => void handleViewMoreSessionResults()}
                          disabled={sessionResultLoadingMore}
                          className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path
                              d="M12 5V19M5 12H19"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {sessionResultLoadingMore ? "Loading more..." : "View More"}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            ) : activeTab === "People Scout" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 19C2 16.79 3.79 15 6 15H10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 15H18C20.21 15 22 16.79 22 19"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    People Scout
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Hey username, who are you looking for?
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Paste a LinkedIn URL or type a username / email to find any
                    professional
                  </p>
                </div>

                <div className="mt-6 w-full">
                  <label
                    htmlFor="peopleScoutQuery"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Search professional
                  </label>
                  <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                      id="peopleScoutQuery"
                      type="text"
                      value={peopleScoutQuery}
                      onChange={(event) => setPeopleScoutQuery(event.target.value)}
                      placeholder="Paste a LinkedIn URL or type a username / email"
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300 lg:flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => void handlePeopleScoutSearch()}
                      disabled={peopleScoutLoading || peopleScoutQuery.trim().length === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 lg:w-52"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path
                          d="M11 19C15.42 19 19 15.42 19 11C19 6.58 15.42 3 11 3C6.58 3 3 6.58 3 11C3 15.42 6.58 19 11 19Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 21L16.65 16.65"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {peopleScoutLoading ? "Searching…" : "Search"}
                    </button>
                  </div>
                  {peopleScoutError ? (
                    <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {peopleScoutError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Recent Searches
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Recently searched professionals from People Scout (stored per account).
                  </p>
                  {peopleScoutRecentLoading ? (
                    <div
                      className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                      aria-busy="true"
                      aria-label="Loading recent searches"
                    >
                      {Array.from({ length: 6 }, (_, i) => (
                        <div
                          key={`people-scout-skeleton-${i}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="people-scout-shimmer h-10 w-10 shrink-0 rounded-lg" />
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="people-scout-shimmer h-4 w-[85%] max-w-44 rounded" />
                                <div className="people-scout-shimmer h-3 w-[60%] max-w-32 rounded" />
                              </div>
                            </div>
                            <div className="people-scout-shimmer h-5 w-14 shrink-0 rounded-full" />
                          </div>
                          <div className="people-scout-shimmer mt-3 h-3 w-[75%] max-w-56 rounded" />
                          <div className="people-scout-shimmer mt-3 h-8 w-24 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : peopleScoutRecentList.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      No People Scout lookups yet. Search by email or LinkedIn URL above.
                    </p>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {peopleScoutRecentList.map((user) => (
                        <article
                          key={user.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <PeopleScoutRecentSearchAvatar
                                name={user.name}
                                thumbnailUrl={user.thumbnailUrl}
                              />
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900">
                                  {user.name}
                                </h5>
                                <p className="text-xs text-slate-600">{user.role}</p>
                              </div>
                            </div>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {user.lastSearchedAt}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-slate-600">
                            {user.company} • {user.location}
                          </p>
                          <button
                            type="button"
                            onClick={() => openPeopleScoutDetails(user)}
                            className="mt-3 inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            View details
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : activeTab === "My Profile" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Account
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-black">My Profile</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Manage your personal details, work preferences, and security settings.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingProfile ? (
                      <button
                        type="button"
                        onClick={onCancelMyProfileEdit}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        isEditingProfile ? void onSaveMyProfile() : onEditMyProfile()
                      }
                      disabled={myProfileSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isEditingProfile
                        ? myProfileSaving
                          ? "Saving..."
                          : "Save changes"
                        : "Edit profile"}
                    </button>
                  </div>
                </div>

                {myProfileError ? (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {myProfileError}
                  </p>
                ) : null}
                {myProfileSuccess ? (
                  <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {myProfileSuccess}
                  </p>
                ) : null}

                <div className="mt-6">
                  <div className="space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Basic Information
                      </h4>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="text-sm text-slate-700">
                          Full name
                          <input
                            type="text"
                            value={myProfileForm.fullName}
                            onChange={(event) =>
                              onMyProfileFieldChange("fullName", event.target.value)
                            }
                            readOnly={!isEditingProfile}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                              isEditingProfile
                                ? "border-slate-300 bg-white focus:border-black"
                                : "border-slate-300 bg-slate-50"
                            }`}
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          Work email
                          <input
                            type="email"
                            value={myProfileForm.email}
                            onChange={(event) =>
                              onMyProfileFieldChange("email", event.target.value)
                            }
                            readOnly={!isEditingProfile}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                              isEditingProfile
                                ? "border-slate-300 bg-white focus:border-black"
                                : "border-slate-300 bg-slate-50"
                            }`}
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          Company name
                          <input
                            type="text"
                            value={myProfileForm.companyName}
                            onChange={(event) =>
                              onMyProfileFieldChange("companyName", event.target.value)
                            }
                            readOnly={!isEditingProfile}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                              isEditingProfile
                                ? "border-slate-300 bg-white focus:border-black"
                                : "border-slate-300 bg-slate-50"
                            }`}
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          Phone
                          <input
                            type="text"
                            value={myProfileForm.phone}
                            onChange={(event) =>
                              onMyProfileFieldChange("phone", event.target.value)
                            }
                            readOnly={!isEditingProfile}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                              isEditingProfile
                                ? "border-slate-300 bg-white focus:border-black"
                                : "border-slate-300 bg-slate-50"
                            }`}
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          Location
                          <input
                            type="text"
                            value={myProfileForm.location}
                            onChange={(event) =>
                              onMyProfileFieldChange("location", event.target.value)
                            }
                            readOnly={!isEditingProfile}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                              isEditingProfile
                                ? "border-slate-300 bg-white focus:border-black"
                                : "border-slate-300 bg-slate-50"
                            }`}
                          />
                        </label>
                      </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Security
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          <li>
                            Password last changed:{" "}
                            {myProfileSecurity.passwordChangedAt
                              ? new Date(myProfileSecurity.passwordChangedAt).toLocaleString()
                              : "Not available"}
                          </li>
                          <li>Active sessions: {myProfileSecurity.activeSessions} devices</li>
                        </ul>
                        <div className="mt-3 space-y-2">
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(event) =>
                              onPasswordFieldChange("currentPassword", event.target.value)
                            }
                            placeholder="Current password"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-black"
                          />
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(event) =>
                              onPasswordFieldChange("newPassword", event.target.value)
                            }
                            placeholder="New password"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-black"
                          />
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) =>
                              onPasswordFieldChange("confirmPassword", event.target.value)
                            }
                            placeholder="Confirm new password"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-black"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleUpdatePassword()}
                          disabled={passwordUpdateLoading}
                          className="mt-3 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          {passwordUpdateLoading ? "Updating..." : "Update password"}
                        </button>
                      </div>
                    </section>
                  </div>
                </div>

                {peopleScoutProfile ? (
                  <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Last Scout Activity
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Last viewed profile:{" "}
                      <span className="font-medium text-slate-900">{peopleScoutProfile.name}</span>
                      {peopleScoutLoading ? " (loading...)" : ""}
                    </p>
                  </section>
                ) : null}
                {myProfileLoading ? (
                  <p className="mt-4 text-sm text-slate-500">Loading profile from server...</p>
                ) : null}
              </section>
            ) : activeTab === "Search history" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M12 8V12L15 15M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 3V8H8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Search history
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Each search is saved as one sourcing session. Open a row to load
                      profiles into Search Candidates.
                    </p>
                  </div>
                </div>

                {sourcingSessionsLoading ? (
                  <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-3 pl-4 font-semibold">When</th>
                          <th className="py-3 font-semibold">Prompt / title</th>
                          <th className="py-3 font-semibold">Candidates</th>
                          <th className="py-3 font-semibold tabular-nums">Total</th>
                          <th className="py-3 font-semibold tabular-nums">Page 1</th>
                          <th className="py-3 font-semibold">Status</th>
                          <th className="py-3 pr-4 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <tr
                            key={`history-skeleton-${idx}`}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="py-3 pl-4">
                              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                            </td>
                            <td className="py-3">
                              <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                              <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100" />
                            </td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
                                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
                            </td>
                            <td className="py-3">
                              <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
                            </td>
                            <td className="py-3">
                              <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                            </td>
                            <td className="py-3 pr-4">
                              <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {sourcingSessionsError ? (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {sourcingSessionsError}
                  </p>
                ) : null}

                {!sourcingSessionsLoading && sourcingSessions.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-600">
                    No saved sessions yet. Run a search from{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("Search Candidates")}
                      className="font-medium text-black underline decoration-slate-400 underline-offset-2 hover:decoration-black"
                    >
                      Search Candidates
                    </button>{" "}
                    to create one.
                  </p>
                ) : null}

                {!sourcingSessionsLoading && sourcingSessions.length > 0 ? (
                  <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-3 pl-4 font-semibold">When</th>
                          <th className="py-3 font-semibold">Prompt / title</th>
                          <th className="py-3 font-semibold">Candidates</th>
                          <th className="py-3 font-semibold tabular-nums">Total</th>
                          <th className="py-3 font-semibold tabular-nums">Page 1</th>
                          <th className="py-3 font-semibold">Status</th>
                          <th className="py-3 pr-4 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourcingSessions.map((row) => (
                          <tr
                            id={`history-session-${row.id}`}
                            key={row.id}
                            className={`border-b text-slate-800 last:border-b-0 ${
                              highlightSessionId === row.id
                                ? "border-slate-300 bg-slate-100"
                                : "border-slate-100"
                            }`}
                          >
                            <td className="whitespace-nowrap py-3 pl-4 text-xs text-slate-600">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td className="max-w-[280px] py-3">
                              <p className="line-clamp-2 text-slate-900">
                                {row.prompt ||
                                  row.sessionTitle ||
                                  (row.usingSessionOverride
                                    ? "(Custom session payload)"
                                    : "—")}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                                {row.futureJobsSessionId}
                              </p>
                            </td>
                            <td className="max-w-[280px] py-3">
                              {row.candidatePreview.length === 0 ? (
                                <p className="text-xs text-slate-500">No candidates saved</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {row.candidatePreview.slice(0, 4).map((c) => (
                                    <span
                                      key={`${row.id}:${c.id || c.name}`}
                                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                                      title={`${c.name}${c.role ? ` — ${c.role}` : ""}${c.location ? ` (${c.location})` : ""}`}
                                    >
                                      {c.name || "Unknown"}
                                    </span>
                                  ))}
                                  {row.candidatePreview.length > 4 ? (
                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
                                      +{row.candidatePreview.length - 4}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </td>
                            <td className="py-3 tabular-nums text-slate-700">
                              {row.totalDocs != null ? row.totalDocs : "—"}
                            </td>
                            <td className="py-3 tabular-nums text-slate-700">
                              {row.candidateCountFirstPage}
                            </td>
                            <td className="py-3 text-xs text-slate-600">
                              {row.futureJobsStatus || "—"}
                              {row.profilesFetchError ? (
                                <span className="mt-1 block text-amber-800">
                                  Profiles warning
                                </span>
                              ) : null}
                            </td>
                            <td className="py-3 pr-4">
                              <button
                                type="button"
                                onClick={() => void openSessionFromHistory(row)}
                                disabled={searchLoading}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                View candidates
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            ) : activeTab === "Candidates" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M20 21V19C20 17.34 18.66 16 17 16H7C5.34 16 4 17.34 4 19V21M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {hasSearched ? "Search result candidates" : "All candidates"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {hasSearched
                        ? "Candidates loaded from your selected search/session."
                        : "Browse every candidate in your workspace. Reveal contact details when needed."}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Total: {candidatesPageList.length}
                  </span>
                </div>

                <div className="mt-6 flex-1 overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                        <th className="py-3 pl-2 font-semibold">Candidate</th>
                        <th className="py-3 font-semibold">Role</th>
                        <th className="py-3 font-semibold">Experience</th>
                        <th className="py-3 font-semibold">Location</th>
                        <th className="py-3 font-semibold">Skills</th>
                        <th className="py-3 font-semibold">Status</th>
                        <th className="py-3 pr-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatesPageList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-sm text-slate-600"
                          >
                            No candidates to show yet. Run a search or open a session from Search
                            history.
                          </td>
                        </tr>
                      ) : (
                        candidatesPageList.map((candidate) => (
                        <tr
                          key={candidateRowKey(candidate)}
                          className="border-b border-slate-100 text-sm last:border-b-0"
                        >
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-500">
                                IMG
                              </div>
                              <span className="font-medium text-slate-900">{candidate.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-slate-700">{candidate.role}</td>
                          <td className="py-4 text-slate-700">{candidate.experience}</td>
                          <td className="py-4 text-slate-700">{candidate.location}</td>
                          <td className="max-w-[220px] truncate py-4 text-slate-600" title={candidate.skills}>
                            {candidate.skills}
                          </td>
                          <td className="py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {candidate.status}
                            </span>
                          </td>
                          <td className="py-4 pr-2 align-top">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => revealEmail(candidate)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                                    <path
                                      d="M4 5H20V19H4V5ZM4 7L12 13L20 7"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Email
                                </button>
                                <button
                                  type="button"
                                  onClick={() => revealPhone(candidate)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                                    <path
                                      d="M22 16.92V20A2 2 0 0 1 19.82 22C10.98 22 2 13.02 2 4.18A2 2 0 0 1 4 2H7.09A2 2 0 0 1 9.08 3.72C9.2 4.62 9.42 5.51 9.73 6.36A2 2 0 0 1 9.28 8.47L7.94 9.81A16 16 0 0 0 14.19 16.06L15.53 14.72A2 2 0 0 1 17.64 14.27C18.49 14.58 19.38 14.8 20.28 14.92A2 2 0 0 1 22 16.92Z"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Phone
                                </button>
                              </div>
                              {revealedEmail.includes(candidateRowKey(candidate)) ? (
                                <p className="text-xs text-slate-600">
                                  {getDisplayedEmail(candidate) || "—"}
                                </p>
                              ) : null}
                              {revealedPhone.includes(candidateRowKey(candidate)) ? (
                                <p className="text-xs text-slate-600">
                                  {getDisplayedPhone(candidate) || "—"}
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : activeTab === "Saved" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M19 21L12 16L5 21V5C5 4.45 5.45 4 6 4H18C18.55 4 19 4.45 19 5V21Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Saved candidates
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Shortlisted profiles you marked for follow-up.
                    </p>
                  </div>
                  <span
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    title={
                      saveListFilter === "__all__"
                        ? "Total saved"
                        : "Matching list / total saved"
                    }
                  >
                    {saveListFilter === "__all__"
                      ? `${savedCandidatesDisplay.length}`
                      : `${savedCandidatesFiltered.length}/${savedCandidatesDisplay.length}`}
                  </span>
                </div>

                <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
                  <select
                    value={saveListFilter}
                    onChange={(e) => setSaveListFilter(e.target.value)}
                    className="max-w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                    aria-label="Filter by list"
                  >
                    <option value="__all__">All</option>
                    <option value="__general__">General</option>
                    {saveLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSaveListName}
                    onChange={(e) => setNewSaveListName(e.target.value)}
                    placeholder="New list"
                    maxLength={120}
                    className="w-32 min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 sm:w-40"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateSaveList()}
                    disabled={createSaveListBusy || !newSaveListName.trim()}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                    title="Add list"
                  >
                    {createSaveListBusy ? "…" : "+"}
                  </button>
                  {saveListFilter !== "__all__" && saveListFilter !== "__general__" ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteSaveList(saveListFilter)}
                      disabled={deleteSaveListBusyId === saveListFilter}
                      className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:text-red-600 disabled:opacity-40"
                      title="Delete this list"
                    >
                      ×
                    </button>
                  ) : null}
                  <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
                  <select
                    value={saveTargetListId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSaveTargetListId(v);
                      try {
                        if (!v) localStorage.removeItem("ejhunter_save_target_list_id");
                        else localStorage.setItem("ejhunter_save_target_list_id", v);
                      } catch {
                        /* ignore */
                      }
                    }}
                    disabled={saveListsLoading}
                    className="max-w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 disabled:opacity-50"
                    aria-label="Default list for new saves"
                  >
                    <option value="">New saves → General</option>
                    {saveLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        New saves → {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                {savedCandidatesDisplay.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">No saved candidates yet.</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Save candidates from Session Results to see them here.
                    </p>
                  </div>
                ) : savedCandidatesFiltered.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">No candidates in this list.</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try another list or save profiles into this list from Session Results.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSaveListFilter("__all__")}
                      className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      View all saved
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {savedCandidatesFiltered.map((candidate) => (
                      <article
                        key={candidateIdentityKey(candidate) || candidate.name}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        {(() => {
                          const savedKey = candidateIdentityKey(candidate);
                          const isUnsaveBusy = saveCandidateBusyKeys.includes(savedKey);
                          return (
                            <>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-300 bg-white text-[10px] font-medium text-slate-500">
                              IMG
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{candidate.name}</h4>
                              <p className="text-sm text-slate-700">
                                {candidate.role}
                                {candidate.currentCompany ? ` · ${candidate.currentCompany}` : ""}
                              </p>
                            </div>
                          </div>
                          {typeof candidate.finalScore === "number" ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              Score {candidate.finalScore}/5
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600">
                          {candidate.experience} • {candidate.location}
                        </p>
                        {Array.isArray(candidate.highlights) && candidate.highlights.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {candidate.highlights.slice(0, 4).map((highlight, idx) => (
                              <span
                                key={`${highlight}-${idx}`}
                                className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-slate-600">{candidate.skills}</p>
                        )}
                        {candidate.recommendation ? (
                          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
                            {candidate.recommendation}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                            {candidate.status}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
                            <select
                              value={String(candidate.saveListId || "")}
                              onChange={(e) =>
                                void moveCandidateToSaveList(candidate, e.target.value)
                              }
                              disabled={isUnsaveBusy}
                              className="min-w-0 max-w-40 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-800 sm:max-w-48 disabled:opacity-60"
                              aria-label={`List for ${candidate.name}`}
                            >
                              <option value="">General</option>
                              {saveLists.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void toggleSaveCandidate(candidate)}
                              disabled={isUnsaveBusy}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                <path
                                  d="M19 21L12 16L5 21V5C5 4.45 5.45 4 6 4H18C18.55 4 19 4.45 19 5V21Z"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M4 4L20 20"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                              {isUnsaveBusy ? "Removing..." : "Unsave"}
                            </button>
                            <button
                              type="button"
                              onClick={() => revealEmail(candidate)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                <path
                                  d="M4 6H20V18H4V6ZM4 7L12 13L20 7"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Email
                            </button>
                            <button
                              type="button"
                              onClick={() => revealPhone(candidate)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                <path
                                  d="M22 16.92V19.92C22 20.47 21.55 20.92 21 20.92C10.51 20.92 2 12.41 2 1.92C2 1.37 2.45 0.92 3 0.92H6C6.47 0.92 6.88 1.25 6.98 1.71L7.78 5.31C7.86 5.7 7.74 6.11 7.46 6.39L5.42 8.43C6.76 11.13 8.95 13.32 11.65 14.66L13.69 12.62C13.97 12.34 14.38 12.22 14.77 12.3L18.37 13.1C18.83 13.2 19.16 13.61 19.16 14.08V16.92"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Phone
                            </button>
                          </div>
                        </div>
                        {revealedEmail.includes(candidateRowKey(candidate)) ? (
                          <p className="mt-2 text-xs text-slate-600">
                            {getDisplayedEmail(candidate) || "—"}
                          </p>
                        ) : null}
                        {revealedPhone.includes(candidateRowKey(candidate)) ? (
                          <p className="mt-1 text-xs text-slate-600">
                            {getDisplayedPhone(candidate) || "—"}
                          </p>
                        ) : null}
                            </>
                          );
                        })()}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : activeTab === "Plans and pricing" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Pricing
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-black">Plans and pricing</h3>
                  </div>
                </div>
                {userPricingPlansLoading ? (
                  <p className="mt-8 text-sm text-slate-500">Loading pricing and account…</p>
                ) : (
                  <>
                    {userPricingPlans && userPricingPlans.tiers.length > 0 ? (
                      <>
                    <p className="mt-4 max-w-2xl text-sm text-slate-600">{userPricingPlans.intro}</p>
                    <div className="mt-8 grid gap-6 lg:grid-cols-3">
                      {userPricingPlans.tiers.map((tier) => {
                        const quotaLines = [
                          pricingQuotaDisplayLabel(tier.searches, "searches"),
                          pricingQuotaDisplayLabel(tier.candidateUnlocks, "unlocks"),
                          pricingQuotaDisplayLabel(tier.verifiedEmails, "emails"),
                          pricingQuotaDisplayLabel(tier.phoneNumbers, "phones"),
                        ].filter((line): line is string => line !== null);
                        return (
                        <article
                          key={tier.id || tier.name}
                          className={
                            tier.isPopular
                              ? "relative flex flex-col rounded-2xl border-2 border-black bg-slate-50 p-6 shadow-md ring-1 ring-black/5"
                              : "flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                          }
                        >
                          {tier.isPopular ? (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                              {tier.popularBadge || "⭐ Most Popular"}
                            </span>
                          ) : null}
                          <h4
                            className={
                              tier.isPopular
                                ? "mt-2 text-base font-semibold text-black"
                                : "text-base font-semibold text-black"
                            }
                          >
                            {tier.name}
                          </h4>
                          <p className="mt-3 text-2xl font-semibold tabular-nums text-black">
                            {tier.primaryPrice}
                          </p>
                          {tier.secondaryPrice ? (
                            <p className="mt-1 text-sm text-slate-600">{tier.secondaryPrice}</p>
                          ) : null}
                          {tier.description ? (
                            <p className="mt-4 text-sm leading-relaxed text-slate-600">
                              {tier.description}
                            </p>
                          ) : null}
                          {quotaLines.length > 0 || tier.features.length > 0 ? (
                            <>
                          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Includes
                          </p>
                          <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
                            {quotaLines.map((line, qIdx) => (
                              <li
                                key={`${tier.id || tier.name}-q-${qIdx}`}
                                className="flex gap-2"
                              >
                                <span className="mt-0.5 text-emerald-600" aria-hidden>
                                  ✓
                                </span>
                                <span>{line}</span>
                              </li>
                            ))}
                            {tier.features.map((line, fIdx) => (
                              <li key={`${tier.id || tier.name}-f-${fIdx}`} className="flex gap-2">
                                <span className="mt-0.5 text-emerald-600" aria-hidden>
                                  ✓
                                </span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                            </>
                          ) : null}
                        </article>
                        );
                      })}
                    </div>
                      </>
                    ) : (
                      <p className="mt-8 text-sm text-slate-600">
                        Pricing is temporarily unavailable. Please try again later.
                      </p>
                    )}

                    <div className="mt-10 border-t border-slate-200 pt-10">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Utilisation
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Remaining allowance vs your plan quota (Starter limits, or the first plan if
                        Starter is not listed). Each value is{" "}
                        <span className="font-medium text-slate-700">remaining / limit</span>.
                      </p>
                      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                              <th className="py-3 pl-4 font-semibold">Activity</th>
                              <th className="py-3 pr-4 text-right font-semibold">Remaining / limit</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-800">
                            {(() => {
                              const quotaTier =
                                userPricingPlans?.tiers.find((t) => t.id === "starter") ??
                                userPricingPlans?.tiers[0] ??
                                null;
                              return (
                                <>
                            <tr className="border-b border-slate-100">
                              <td className="py-3 pl-4">Candidate search</td>
                              <td className="py-3 pr-4 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  planUtilisation.candidateSearches,
                                  quotaTier?.searches
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-3 pl-4">Email unveil</td>
                              <td className="py-3 pr-4 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  planUtilisation.emailUnveils,
                                  quotaTier?.verifiedEmails
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-3 pl-4">Candidate unveil</td>
                              <td className="py-3 pr-4 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  planUtilisation.candidateUnveils,
                                  quotaTier?.candidateUnlocks
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-3 pl-4">Mobile unveil</td>
                              <td className="py-3 pr-4 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  planUtilisation.mobileUnveils,
                                  quotaTier?.phoneNumbers
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100 last:border-b-0">
                              <td className="py-3 pl-4">LinkedIn search</td>
                              <td className="py-3 pr-4 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  planUtilisation.linkedinLookups,
                                  quotaTier?.searches
                                )}
                              </td>
                            </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-10 border-t border-slate-200 pt-10">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Credit utilisation history
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Log of plan quota usage (searches and contact unveils). Only events recorded
                        after this feature shipped appear here.
                      </p>
                      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                              <th className="py-3 pl-4 font-semibold">Date</th>
                              <th className="py-3 font-semibold">Activity</th>
                              <th className="py-3 pr-4 text-right font-semibold">Units</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-800">
                            {utilisationHistoryLoading ? (
                              <tr>
                                <td colSpan={3} className="py-10 text-center text-slate-500">
                                  Loading history…
                                </td>
                              </tr>
                            ) : utilisationHistory.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="py-10 text-center text-sm text-slate-500">
                                  No quota usage logged yet.
                                </td>
                              </tr>
                            ) : (
                              utilisationHistory.map((row) => (
                                <tr
                                  key={row.id}
                                  className="border-b border-slate-100 last:border-b-0"
                                >
                                  <td className="py-3 pl-4 whitespace-nowrap text-xs">
                                    {new Date(row.createdAt).toLocaleString()}
                                  </td>
                                  <td className="py-3">
                                    {utilisationQuotaActionLabel(row.action)}
                                  </td>
                                  <td className="py-3 pr-4 text-right tabular-nums font-medium text-red-600">
                                    −{row.amount}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </>
                )}
              </section>
            ) : activeTab === "Settings" ? (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5ZM19.4 15A1.7 1.7 0 0 0 19.74 16.87L19.8 16.93A2 2 0 1 1 16.97 19.76L16.91 19.7A1.7 1.7 0 0 0 15.04 19.36 1.7 1.7 0 0 0 14 20.93V21A2 2 0 1 1 10 21V20.93A1.7 1.7 0 0 0 8.96 19.36 1.7 1.7 0 0 0 7.09 19.7L7.03 19.76A2 2 0 1 1 4.2 16.93L4.26 16.87A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.03 13.96H3A2 2 0 1 1 3 9.96H3.03A1.7 1.7 0 0 0 4.6 8.92 1.7 1.7 0 0 0 4.26 7.05L4.2 6.99A2 2 0 1 1 7.03 4.16L7.09 4.22A1.7 1.7 0 0 0 8.96 4.56H9.03A1.7 1.7 0 0 0 10 3V2.93A2 2 0 1 1 14 2.93V3A1.7 1.7 0 0 0 15.04 4.56 1.7 1.7 0 0 0 16.91 4.22L16.97 4.16A2 2 0 1 1 19.8 6.99L19.74 7.05A1.7 1.7 0 0 0 19.4 8.92V8.96A1.7 1.7 0 0 0 20.97 10H21A2 2 0 1 1 21 14H20.97A1.7 1.7 0 0 0 19.4 15Z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Settings
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Credits and account activity. Open this tab to refresh your ledger from the server.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Current balance
                    </p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-black">
                      {creditBalance}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">credits</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-sm font-semibold text-black">Credit history</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Each change to your balance is recorded here (signup, admin updates, and future usage).
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-3 pl-4 font-semibold">Date</th>
                          <th className="py-3 font-semibold">Change</th>
                          <th className="py-3 font-semibold">Balance</th>
                          <th className="py-3 pr-4 font-semibold">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditHistoryLoading ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-slate-500">
                              Loading history…
                            </td>
                          </tr>
                        ) : myCreditLedger.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                              No credit activity yet.
                            </td>
                          </tr>
                        ) : (
                          myCreditLedger.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-slate-100 text-slate-800 last:border-b-0"
                            >
                              <td className="py-3 pl-4 whitespace-nowrap text-xs">
                                {new Date(row.createdAt).toLocaleString()}
                              </td>
                              <td className="py-3 font-medium tabular-nums">
                                {row.delta > 0 ? `+${row.delta}` : row.delta}
                              </td>
                              <td className="py-3 tabular-nums text-slate-600">
                                {row.balanceBefore} → {row.balanceAfter}
                              </td>
                              <td className="py-3 pr-4 capitalize text-slate-600">
                                {row.reason.replace(/_/g, " ")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : (
              <section className="premium-card flex h-full min-w-0 max-w-full w-full flex-col rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-black">{activeTab}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This section is coming soon.
                </p>
              </section>
            )}

          </div>
        </section>
      </div>

      {showSearchSummaryModal && searchSummary ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-summary-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => (viewResultsLoading ? undefined : closeSearchSummaryModal())}
            aria-label="Close dialog"
            disabled={viewResultsLoading}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Search complete
                </p>
                <h2
                  id="search-summary-title"
                  className="mt-1 text-xl font-semibold text-black"
                >
                  {(searchSummary.totalDocs ?? searchSummary.candidateCount)}{" "}
                  {(searchSummary.totalDocs ?? searchSummary.candidateCount) === 1
                    ? "candidate"
                    : "candidates"}{" "}
                  found
                </h2>
                {searchSummary.totalDocs != null &&
                searchSummary.totalDocs > searchSummary.candidateCount ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Showing {searchSummary.candidateCount} of{" "}
                    {searchSummary.totalDocs} in this sourcing session.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => (viewResultsLoading ? undefined : closeSearchSummaryModal())}
                disabled={viewResultsLoading}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden
                >
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

            {searchSummary.profilesFetchError ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                Session was created, but profiles could not be loaded:{" "}
                {searchSummary.profilesFetchError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void handleViewResults()}
                disabled={viewResultsLoading}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {viewResultsLoading ? "Loading profiles…" : "View results"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`fixed inset-0 z-110 transition-opacity duration-300 ${
          isFilterDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isFilterDrawerOpen}
      >
          <button
            type="button"
            aria-label="Close filter panel"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
              isFilterDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Candidate filters
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-black">Edit filter</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
              <section className="rounded-xl border border-slate-200">
                <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                  General
                </h4>
                <div className="space-y-4 px-4 py-4">
                  <label className="block text-sm text-slate-700">
                    Search Type
                    <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black">
                      <option>Flexible</option>
                      <option>Strict</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-700">
                    Select Region
                    <input
                      type="text"
                      defaultValue="India"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Current Title
                    <input
                      type="text"
                      defaultValue="DevOps Engineer"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Years of Experience
                    <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="number"
                        defaultValue={4}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="number"
                        defaultValue={6}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                  </label>
                  <label className="block text-sm text-slate-700">
                    Keyword (Skills)
                    <input
                      type="text"
                      defaultValue="DevOps"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Seniority Level
                    <input
                      type="text"
                      placeholder="e.g. Senior"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
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
                    <input
                      type="text"
                      defaultValue="Hyderabad, Telangana, India"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Search other regions too
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
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Field of Study"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Degree"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Certifications"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Honors & Awards"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200">
                <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Company
                </h4>
                <div className="space-y-4 px-4 py-4">
                  <input
                    type="text"
                    placeholder="Current Company"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Years at Company"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Past Company"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Past Title"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Company Type"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Company Headquarters"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Company Focus"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Funding Stage"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <label className="block text-sm text-slate-700">
                    Headcount Growth (6-month %)
                    <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                  </label>
                  <label className="block text-sm text-slate-700">
                    Company Headcount
                    <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                  </label>
                  <input
                    type="text"
                    placeholder="Annual Revenue"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Total Funding Raised"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <label className="block text-sm text-slate-700">
                    Year Founded
                    <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                  </label>
                  <input
                    type="text"
                    placeholder="Recently Funded"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200">
                <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Nuances
                </h4>
                <div className="space-y-2 px-4 py-4 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Frequent Job Switch
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Recently Changed Job
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Large Employment Gaps
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    No Career Progression
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Grammar & Spelling Issues in Profile
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Overlapping Full-Time Jobs
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Unspecified Dates or Locations
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterDrawerOpen(false);
                    setActiveTab("Search Candidates");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Apply filters
                </button>
              </div>
            </div>
          </aside>
        </div>

      {peopleScoutProfile ? (
        <div
          className={`fixed inset-0 z-112 transition-opacity duration-300 ${
            isPeopleScoutDrawerOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="People Scout profile"
          aria-hidden={!isPeopleScoutDrawerOpen}
        >
          <button
            type="button"
            aria-label="Close profile panel"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setIsPeopleScoutDrawerOpen(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
              isPeopleScoutDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    People Scout
                  </p>
                  <h3 className="mt-1 truncate text-lg font-semibold text-black">
                    {peopleScoutProfile.name}
                  </h3>
                  {peopleScoutProfile.headline ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                      {peopleScoutProfile.headline}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPeopleScoutDrawerOpen(false)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close profile panel"
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
              <div
                className={`mt-3 grid w-full gap-2 ${
                  peopleScoutProfile.linkedinUrl ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                {peopleScoutProfile.linkedinUrl ? (
                  <a
                    href={peopleScoutProfile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight text-slate-800 transition hover:bg-slate-100 sm:text-xs"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="min-w-0 truncate sm:whitespace-normal">Open LinkedIn</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void revealPeopleScoutContactFromApi("EMAIL")}
                  disabled={peopleScoutRevealEmailBusy}
                  className="inline-flex min-w-0 w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-[11px] font-semibold leading-tight text-slate-800 transition hover:bg-slate-50 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:text-xs"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0">
                    <path
                      d="M4 5H20V19H4V5ZM4 7L12 13L20 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="min-w-0 truncate sm:whitespace-normal">
                    {peopleScoutRevealEmailBusy ? "…" : "Reveal email"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void revealPeopleScoutContactFromApi("PHONE")}
                  disabled={peopleScoutRevealPhoneBusy}
                  className="inline-flex min-w-0 w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-[11px] font-semibold leading-tight text-slate-800 transition hover:bg-slate-50 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:text-xs"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0">
                    <path
                      d="M22 16.92V20A2 2 0 0 1 19.82 22C10.98 22 2 13.02 2 4.18A2 2 0 0 1 4 2H7.09A2 2 0 0 1 9.08 3.72C9.2 4.62 9.42 5.51 9.73 6.36A2 2 0 0 1 9.28 8.47L7.94 9.81A16 16 0 0 0 14.19 16.06L15.53 14.72A2 2 0 0 1 17.64 14.27C18.49 14.58 19.38 14.8 20.28 14.92A2 2 0 0 1 22 16.92Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="min-w-0 truncate sm:whitespace-normal">
                    {peopleScoutRevealPhoneBusy ? "…" : "Reveal phone"}
                  </span>
                </button>
              </div>
              {peopleScoutRevealEmail || peopleScoutRevealPhone ? (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-700">
                  {peopleScoutRevealEmail ? (
                    <p>
                      <span className="font-semibold text-slate-500">Email </span>
                      {peopleScoutProfile.email.trim() ? (
                        <a
                          href={`mailto:${peopleScoutProfile.email}`}
                          className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                        >
                          {peopleScoutProfile.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">Not available</span>
                      )}
                    </p>
                  ) : null}
                  {peopleScoutRevealPhone ? (
                    <p>
                      <span className="font-semibold text-slate-500">Phone </span>
                      {peopleScoutProfile.phone.trim() ? (
                        <a
                          href={`tel:${peopleScoutProfile.phone.replace(/\s/g, "")}`}
                          className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                        >
                          {peopleScoutProfile.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">Not available</span>
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-6 px-5 py-5 pb-10">
              <PeopleScoutProfileSummaryRow
                key={`${peopleScoutProfile.name}-${peopleScoutProfile.profilePhotoUrl}`}
                name={peopleScoutProfile.name}
                photoUrl={peopleScoutProfile.profilePhotoUrl}
                location={peopleScoutProfile.location}
                currentCompany={peopleScoutProfile.currentCompany}
                connections={peopleScoutProfile.connections}
              />

              {peopleScoutProfile.about ? (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    About
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {peopleScoutProfile.about}
                  </p>
                </section>
              ) : null}

              {peopleScoutProfile.experiences.length > 0 ? (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Experience
                  </h4>
                  <ul className="mt-3 space-y-4">
                    {peopleScoutProfile.experiences.map((exp, idx) => (
                      <li
                        key={`${exp.company}-${exp.title}-${idx}`}
                        className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                      >
                        <p className="font-semibold text-slate-900">{exp.title}</p>
                        <p className="mt-0.5 text-sm text-slate-700">{exp.company}</p>
                        <p className="mt-1 text-xs text-slate-500">{exp.duration}</p>
                        {exp.location ? (
                          <p className="mt-0.5 text-xs text-slate-500">{exp.location}</p>
                        ) : null}
                        {exp.description ? (
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {exp.description}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {peopleScoutProfile.education.length > 0 ? (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Education
                  </h4>
                  <ul className="mt-3 space-y-3">
                    {peopleScoutProfile.education.map((ed, idx) => (
                      <li key={`${ed.school}-${idx}`}>
                        <p className="font-medium text-slate-900">{ed.school}</p>
                        {ed.degree ? (
                          <p className="mt-0.5 text-sm text-slate-700">{ed.degree}</p>
                        ) : null}
                        {ed.duration ? (
                          <p className="mt-1 text-xs text-slate-500">{ed.duration}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {peopleScoutProfile.skills.length > 0 ? (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Skills
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {peopleScoutProfile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {(peopleScoutProfile.languages.length > 0 ||
                peopleScoutProfile.certifications.length > 0) ? (
                <section className="space-y-4">
                  {peopleScoutProfile.languages.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Languages
                      </h4>
                      <p className="mt-2 text-sm text-slate-700">
                        {peopleScoutProfile.languages.join(", ")}
                      </p>
                    </div>
                  ) : null}
                  {peopleScoutProfile.certifications.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Certifications
                      </h4>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                        {peopleScoutProfile.certifications.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {peopleScoutProfile.website &&
              peopleScoutProfile.website !== peopleScoutProfile.linkedinUrl ? (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p>
                    <span className="font-medium text-slate-600">Website: </span>
                    <a
                      href={
                        peopleScoutProfile.website.startsWith("http")
                          ? peopleScoutProfile.website
                          : `https://${peopleScoutProfile.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                    >
                      {peopleScoutProfile.website}
                    </a>
                  </p>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

    </main>
  );
}
