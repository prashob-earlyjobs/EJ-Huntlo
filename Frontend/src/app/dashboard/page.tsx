"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CandidateFilterDrawer } from "@/components/CandidateFilterDrawer";
import {
  SessionResultCandidateCard,
  type SessionResultCardData,
} from "@/components/dashboard/SessionResultCandidateCard";
import { SearchHistoryTable } from "@/components/dashboard/SearchHistoryTable";
import { SessionResultsSkeleton } from "@/components/dashboard/SessionResultsSkeleton";
import {
  PeopleScoutPanel,
  type PeopleScoutRecentUser,
} from "@/components/dashboard/PeopleScoutPanel";
import {
  MyProfilePanel,
  type MyProfileFormState,
  type MyProfileSecurityState,
} from "@/components/dashboard/MyProfilePanel";
import { DashboardOverviewPanel } from "@/components/dashboard/DashboardOverviewPanel";
import { PlansPricingPanel } from "@/components/dashboard/PlansPricingPanel";
import { SavedCandidatesPanel } from "@/components/dashboard/SavedCandidatesPanel";
import { WorkspaceCandidatesTable } from "@/components/dashboard/WorkspaceCandidatesTable";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  parseDashboardOverviewPayload,
  type DashboardOverviewData,
} from "@/lib/dashboardOverview";
import {
  parseUtilisationHistoryPagination,
  parseUtilisationHistoryPayload,
  parseUtilisationPayload,
  UTILISATION_HISTORY_PAGE_SIZE,
  type UserUtilisationStats,
  type UtilisationHistoryRow,
} from "@/lib/planUtilisation";
import {
  parsePricingPlansFromApi,
  type PricingPlansPayload,
} from "@/lib/pricingPlans";
import { postAuthPath } from "@/lib/onboarding";
import { candidateScoreBadgeClass, formatCandidateScore } from "@/lib/sessionResultUi";
import {
  DEFAULT_CANDIDATE_FILTER_FORM,
  mergeFilterForm,
  type CandidateFilterForm,
} from "@/lib/sourcingFilters";

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
];

const userProfileSidebarItem = {
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
};

type SessionResultDoc = {
  _id?: string;
  sourcingSessionId?: string;
  finalScore?: number;
  profile?: {
    name?: string;
    region?: string;
    years_of_experience_raw?: number;
    linkedin_profile_url?: string;
    profile_picture_permalink?: string;
    skills?: string[];
    current_employers_object?: {
      company_name?: string;
      job_title?: string;
      company_linkedin_profile_url?: string;
    }[];
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

function sessionDocToCandidateRow(
  doc: SessionResultDoc,
  idx: number,
  sessionId: string | null
): CandidateRow {
  const highlights = doc.profileAnalysis?.highlights ?? [];
  const current = doc.profile?.current_employers_object?.[0];
  return {
    id: doc._id || `session-doc-${idx}`,
    sourcingSessionId: doc.sourcingSessionId || sessionId || "",
    linkedin_profile_url: doc.profile?.linkedin_profile_url || "",
    name: doc.profile?.name || "Unnamed candidate",
    role: current?.job_title || "Role unavailable",
    currentCompany: current?.company_name || "",
    experience:
      typeof doc.profile?.years_of_experience_raw === "number"
        ? `${doc.profile.years_of_experience_raw} years`
        : "—",
    location: doc.profile?.region || "Location unavailable",
    skills:
      Array.isArray(doc.profile?.skills) && doc.profile.skills.length > 0
        ? doc.profile.skills.slice(0, 8).join(", ")
        : "—",
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
}

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

function mapSavedApiRowToCandidate(row: {
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
}): CandidateRow {
  return {
    id: typeof row.candidateId === "string" ? row.candidateId : "",
    sourcingSessionId:
      typeof row.sourcingSessionId === "string" ? row.sourcingSessionId : "",
    linkedin_profile_url:
      typeof row.linkedin_profile_url === "string" ? row.linkedin_profile_url : "",
    name: typeof row.name === "string" ? row.name : "Unnamed candidate",
    role: typeof row.role === "string" ? row.role : "—",
    currentCompany: typeof row.currentCompany === "string" ? row.currentCompany : "",
    location: typeof row.location === "string" ? row.location : "—",
    experience: typeof row.experience === "string" ? row.experience : "—",
    skills: "—",
    finalScore: typeof row.finalScore === "number" ? row.finalScore : null,
    highlights: Array.isArray(row.highlights)
      ? row.highlights
          .map((h: unknown) => String(h ?? "").trim())
          .filter((h: string) => h !== "")
      : [],
    recommendation: typeof row.recommendation === "string" ? row.recommendation : "",
    rawDoc:
      row.rawDoc && typeof row.rawDoc === "object"
        ? (row.rawDoc as SessionResultDoc)
        : null,
    status: typeof row.status === "string" ? row.status : "Saved",
    email: "",
    phone: "",
    saveListId: typeof row.saveListId === "string" ? row.saveListId : "",
  };
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

function sessionDocToCardData(doc: SessionResultDoc, idx: number): SessionResultCardData {
  const current = doc.profile?.current_employers_object?.[0];
  return {
    id: doc._id || `session-doc-${idx}`,
    name: doc.profile?.name || "Unnamed candidate",
    role: current?.job_title,
    company: current?.company_name,
    region: doc.profile?.region,
    yearsExperience: doc.profile?.years_of_experience_raw,
    finalScore: doc.finalScore,
    photoUrl: doc.profile?.profile_picture_permalink,
    linkedinUrl: doc.profile?.linkedin_profile_url,
    highlights: doc.profileAnalysis?.highlights,
    recommendation: doc.profileAnalysis?.recommendation,
    strengths: doc.profileAnalysis?.analysis?.keyStrengths,
  };
}

function AiGeneratedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ${className}`}
      title="This text was generated by AI and may need verification"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden>
        <path
          d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M19 14L19.8 17L22 17.8L19.8 18.6L19 21.5L18.2 18.6L16 17.8L18.2 17L19 14Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      AI generated
    </span>
  );
}

function AiRecommendationBlock({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="dashboard-ai-insight-label">
        <span>AI recommendation</span>
        <AiGeneratedBadge />
      </div>
      <p className="dashboard-ai-insight">{text}</p>
    </div>
  );
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

function SessionCandidateGridAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = typeof photoUrl === "string" ? photoUrl.trim() : "";
  const showImage = Boolean(url) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  if (showImage) {
    return (
      <div
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200 ring-offset-2 ring-offset-white"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- external profile CDN URLs */}
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
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-slate-100 to-slate-200 text-sm font-semibold tracking-tight text-slate-600 ring-2 ring-slate-200 ring-offset-2 ring-offset-white"
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

function SessionCandidateDetailDrawer({
  open,
  doc,
  candidate,
  onClose,
  onRevealEmail,
  onRevealPhone,
  onToggleSave,
  isSaved,
  isSaveBusy,
  displayedEmail,
  displayedPhone,
  emailRevealed,
  phoneRevealed,
}: {
  open: boolean;
  doc: SessionResultDoc;
  candidate: CandidateRow;
  onClose: () => void;
  onRevealEmail: () => void;
  onRevealPhone: () => void;
  onToggleSave: () => void;
  isSaved: boolean;
  isSaveBusy: boolean;
  displayedEmail: string;
  displayedPhone: string;
  emailRevealed: boolean;
  phoneRevealed: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const profile = doc.profile;
  const name = profile?.name || "Unnamed candidate";
  const photoUrl =
    typeof profile?.profile_picture_permalink === "string"
      ? profile.profile_picture_permalink.trim()
      : "";
  const linkedinUrl =
    typeof profile?.linkedin_profile_url === "string"
      ? profile.linkedin_profile_url.trim()
      : "";
  const employers = Array.isArray(profile?.current_employers_object)
    ? profile.current_employers_object
    : [];
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const highlights = doc.profileAnalysis?.highlights ?? [];
  const strengths = doc.profileAnalysis?.analysis?.keyStrengths ?? [];
  const weaknesses = doc.profileAnalysis?.analysis?.keyWeaknesses ?? [];
  const showImage = Boolean(photoUrl) && !imgFailed;

  useEffect(() => {
    if (!open) return;
    setImgFailed(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const primaryRole = employers[0]?.job_title || candidate.role;
  const primaryCompany = employers[0]?.company_name || candidate.currentCompany;
  const headline =
    [primaryRole, primaryCompany].filter(Boolean).join(" · ") || candidate.location || "";

  return (
    <div
      className={`dashboard-overlay fixed inset-0 transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} profile details`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close candidate details"
        className="dashboard-drawer-overlay absolute inset-0"
        onClick={onClose}
      />
      <aside
        className={`dashboard-drawer-panel dashboard-drawer-panel--scout absolute right-0 top-0 h-full w-full overflow-y-auto transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--dash-outline)_40%,transparent)] bg-white/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="dashboard-label-upper">Session candidate</p>
              <h3 className="mt-1 truncate dashboard-section-title">{name}</h3>
              {headline ? (
                <p className="mt-0.5 line-clamp-2 dashboard-text-body">{headline}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {typeof doc.finalScore === "number" ? (
                <span className={candidateScoreBadgeClass(doc.finalScore)}>
                  {formatCandidateScore(doc.finalScore)}/5
                </span>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="dashboard-btn-ghost shrink-0 p-1.5"
                aria-label="Close"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
          </div>
          <div
            className={`dashboard-drawer-actions ${
              linkedinUrl ? "dashboard-drawer-actions--cols-3" : "dashboard-drawer-actions--cols-2"
            }`}
            role="group"
            aria-label="Candidate actions"
          >
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-drawer-action dashboard-drawer-action--linkedin"
              >
                <span className="dashboard-drawer-action-icon" aria-hidden>
                  <MaterialIcon name="work" className="text-[20px]" />
                </span>
                <span className="dashboard-drawer-action-body">
                  <span className="dashboard-drawer-action-label">Open LinkedIn</span>
                  <span className="dashboard-drawer-action-hint">View public profile</span>
                </span>
                <MaterialIcon
                  name="open_in_new"
                  className="dashboard-drawer-action-trail text-[18px]"
                  aria-hidden
                />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onRevealEmail}
              className={`dashboard-drawer-action${emailRevealed ? " dashboard-drawer-action--active" : ""}`}
            >
              <span className="dashboard-drawer-action-icon" aria-hidden>
                <MaterialIcon name="mail" className="text-[20px]" />
              </span>
              <span className="dashboard-drawer-action-body">
                <span className="dashboard-drawer-action-label">
                  {emailRevealed ? "Email revealed" : "Reveal email"}
                </span>
                <span className="dashboard-drawer-action-hint">
                  {emailRevealed ? "Shown below" : "Tap to reveal"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={onRevealPhone}
              className={`dashboard-drawer-action${phoneRevealed ? " dashboard-drawer-action--active" : ""}`}
            >
              <span className="dashboard-drawer-action-icon" aria-hidden>
                <MaterialIcon name="call" className="text-[20px]" />
              </span>
              <span className="dashboard-drawer-action-body">
                <span className="dashboard-drawer-action-label">
                  {phoneRevealed ? "Phone revealed" : "Reveal phone"}
                </span>
                <span className="dashboard-drawer-action-hint">
                  {phoneRevealed ? "Shown below" : "Tap to reveal"}
                </span>
              </span>
            </button>
          </div>
          {(emailRevealed && displayedEmail) || (phoneRevealed && displayedPhone) ? (
            <div className="dashboard-drawer-revealed-card">
              {emailRevealed && displayedEmail ? (
                <div className="dashboard-drawer-revealed-row">
                  <span className="dashboard-drawer-action-icon" aria-hidden>
                    <MaterialIcon name="mail" className="text-base" />
                  </span>
                  <span className="dashboard-drawer-revealed-label">Email</span>
                  <span className="dashboard-drawer-revealed-value">
                    <a href={`mailto:${displayedEmail}`}>{displayedEmail}</a>
                  </span>
                </div>
              ) : null}
              {phoneRevealed && displayedPhone ? (
                <div className="dashboard-drawer-revealed-row">
                  <span className="dashboard-drawer-action-icon" aria-hidden>
                    <MaterialIcon name="call" className="text-base" />
                  </span>
                  <span className="dashboard-drawer-revealed-label">Phone</span>
                  <span className="dashboard-drawer-revealed-value">
                    <a href={`tel:${displayedPhone.replace(/\s/g, "")}`}>{displayedPhone}</a>
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-6 px-5 py-5 pb-10">
          <section className="flex items-start gap-4 border-b border-[color-mix(in_srgb,var(--dash-outline)_25%,transparent)] pb-6">
            {showImage ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-600">
                {peopleScoutNameInitials(name)}
              </div>
            )}
            <div className="min-w-0 flex-1 dashboard-text-body">
              <p>{profile?.region || candidate.location}</p>
              {typeof profile?.years_of_experience_raw === "number" ? (
                <p className="mt-1">{profile.years_of_experience_raw} years experience</p>
              ) : null}
            </div>
          </section>

          {employers.length > 0 ? (
            <section>
              <h4 className="dashboard-label-upper">Current roles</h4>
              <ul className="mt-3 space-y-3">
                {employers.map((emp, i) => (
                  <li
                    key={`${emp.company_name}-${emp.job_title}-${i}`}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <p className="font-medium text-slate-900">{emp.job_title || "—"}</p>
                    <p className="text-sm text-slate-700">{emp.company_name || "—"}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {skills.length > 0 ? (
            <section>
              <h4 className="dashboard-label-upper">Skills</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="dashboard-chip">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {highlights.length > 0 ? (
            <section>
              <h4 className="dashboard-label-upper">Highlights</h4>
              <ul className="mt-3 space-y-2">
                {highlights.map((h, i) => (
                  <li
                    key={`${h.Category}-${i}`}
                    className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm"
                  >
                    {h.Category ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                        {h.Category}
                      </span>
                    ) : null}
                    <p className="font-medium text-slate-900">{h.Highlight || "—"}</p>
                    {h.ReasonForHighlight ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {h.ReasonForHighlight}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {doc.profileAnalysis?.recommendation ? (
            <section>
              <AiRecommendationBlock text={doc.profileAnalysis.recommendation} />
            </section>
          ) : null}

          {strengths.length > 0 ? (
            <section>
              <h4 className="dashboard-label-upper">Key strengths</h4>
              <ul className="mt-3 space-y-3">
                {strengths.map((s, i) => (
                  <li key={`strength-${i}`} className="text-sm">
                    {s.observation ? (
                      <p className="font-medium text-slate-900">{s.observation}</p>
                    ) : null}
                    {s.evidence ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {s.evidence}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {weaknesses.length > 0 ? (
            <section>
              <h4 className="dashboard-label-upper">Areas to review</h4>
              <ul className="mt-3 space-y-3">
                {weaknesses.map((w, i) => (
                  <li key={`weakness-${i}`} className="text-sm">
                    {w.observation ? (
                      <p className="font-medium text-slate-900">{w.observation}</p>
                    ) : null}
                    {w.evidence ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {w.evidence}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-t border-[color-mix(in_srgb,var(--dash-outline)_35%,transparent)] pt-4">
            <button
              type="button"
              onClick={onToggleSave}
              disabled={isSaveBusy}
              className={`dashboard-btn-secondary w-full justify-center py-2.5 disabled:opacity-60 ${
                isSaved ? "dashboard-btn-toggle-active !border-[#0050cb] !bg-[#0050cb] !text-white" : ""
              }`}
            >
              {isSaveBusy ? "Saving…" : isSaved ? "Saved to list" : "Save candidate"}
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState("");
  const [peopleScoutQuery, setPeopleScoutQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [searchedCandidates, setSearchedCandidates] = useState<CandidateRow[]>(
    []
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [revealedEmail, setRevealedEmail] = useState<string[]>([]);
  const [revealedPhone, setRevealedPhone] = useState<string[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [profilesWarning, setProfilesWarning] = useState("");
  const [searchSummary, setSearchSummary] = useState<SearchSummaryState | null>(
    null
  );
  const [sessionResultDocs, setSessionResultDocs] = useState<SessionResultDoc[]>([]);
  const [selectedSessionDetailDoc, setSelectedSessionDetailDoc] =
    useState<SessionResultDoc | null>(null);
  const [selectedSessionDetailCandidate, setSelectedSessionDetailCandidate] =
    useState<CandidateRow | null>(null);
  const [isSessionCandidateDrawerOpen, setIsSessionCandidateDrawerOpen] =
    useState(false);
  const [sessionResultError, setSessionResultError] = useState("");
  const [sessionResultPage, setSessionResultPage] = useState(1);
  const [sessionResultTotalPages, setSessionResultTotalPages] = useState<number | null>(
    null
  );
  const [sessionResultHasNext, setSessionResultHasNext] = useState(false);
  const [sessionResultLoadingMore, setSessionResultLoadingMore] = useState(false);
  const [savedSessionCandidateKeys, setSavedSessionCandidateKeys] = useState<string[]>([]);
  const [savedCandidatesList, setSavedCandidatesList] = useState<CandidateRow[]>([]);
  const [savedCandidatesLoading, setSavedCandidatesLoading] = useState(false);
  const [savedCandidatesPage, setSavedCandidatesPage] = useState(1);
  const [savedCandidatesTotalDocs, setSavedCandidatesTotalDocs] = useState(0);
  const [savedCandidatesTotalPages, setSavedCandidatesTotalPages] = useState(1);
  const [savedCandidatesTotalSavedCount, setSavedCandidatesTotalSavedCount] = useState(0);
  const SAVED_CANDIDATES_LIMIT = 12;
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
  const [candidateFilterForm, setCandidateFilterForm] = useState<CandidateFilterForm>(
    DEFAULT_CANDIDATE_FILTER_FORM
  );
  const [filterSearchPrompt, setFilterSearchPrompt] = useState("");
  const [pendingSearchSessionId, setPendingSearchSessionId] = useState<string | null>(null);
  const [pendingSessionPayload, setPendingSessionPayload] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [applyFiltersLoading, setApplyFiltersLoading] = useState(false);
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
  const [workspaceCandidates, setWorkspaceCandidates] = useState<CandidateRow[]>([]);
  const [workspaceCandidatesPage, setWorkspaceCandidatesPage] = useState(1);
  const [workspaceCandidatesTotalDocs, setWorkspaceCandidatesTotalDocs] = useState(0);
  const [workspaceCandidatesTotalPages, setWorkspaceCandidatesTotalPages] = useState(1);
  const [workspaceCandidatesLoading, setWorkspaceCandidatesLoading] = useState(false);
  const [workspaceCandidatesError, setWorkspaceCandidatesError] = useState("");
  const [workspaceCandidatesRefresh, setWorkspaceCandidatesRefresh] = useState(0);
  const WORKSPACE_CANDIDATES_LIMIT = 20;
  const [revealedContactValues, setRevealedContactValues] = useState<
    Record<string, { email?: string; phone?: string }>
  >({});
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [highlightSessionId, setHighlightSessionId] = useState("");
  const [peopleScoutLoading, setPeopleScoutLoading] = useState(false);
  const [peopleScoutError, setPeopleScoutError] = useState("");
  const [peopleScoutRecentList, setPeopleScoutRecentList] = useState<PeopleScoutRecentUser[]>([]);
  const [peopleScoutRecentLoading, setPeopleScoutRecentLoading] = useState(false);
  const [userPricingPlans, setUserPricingPlans] = useState<PricingPlansPayload | null>(null);
  const [userPricingPlansLoading, setUserPricingPlansLoading] = useState(false);
  const [planUtilisation, setPlanUtilisation] = useState<UserUtilisationStats>(() => ({
    candidateSearches: 0,
    emailUnveils: 0,
    candidateUnveils: 0,
    mobileUnveils: 0,
    linkedinLookups: 0,
  }));
  const [userPlanId, setUserPlanId] = useState("starter");
  const [userPlanName, setUserPlanName] = useState("Starter");
  const [utilisationHistory, setUtilisationHistory] = useState<UtilisationHistoryRow[]>([]);
  const [utilisationHistoryLoading, setUtilisationHistoryLoading] = useState(false);
  const [utilisationHistoryPage, setUtilisationHistoryPage] = useState(1);
  const [utilisationHistoryTotalDocs, setUtilisationHistoryTotalDocs] = useState(0);
  const [utilisationHistoryTotalPages, setUtilisationHistoryTotalPages] = useState(1);
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverviewData | null>(
    null
  );
  const [dashboardOverviewLoading, setDashboardOverviewLoading] = useState(false);
  const [dashboardOverviewError, setDashboardOverviewError] = useState("");
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
    if (activeTab !== "Dashboard") return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      setDashboardOverview(null);
      setDashboardOverviewLoading(false);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setDashboardOverviewLoading(true);
    setDashboardOverviewError("");
    fetch(`${apiBase}/api/users/me/dashboard`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to load dashboard"
          );
        }
        const parsed = parseDashboardOverviewPayload(data);
        if (!parsed) {
          throw new Error("Invalid dashboard response");
        }
        setDashboardOverview(parsed);
      })
      .catch((err) => {
        setDashboardOverview(null);
        setDashboardOverviewError(
          err instanceof Error ? err.message : "Could not load dashboard"
        );
      })
      .finally(() => {
        setDashboardOverviewLoading(false);
      });
  }, [activeTab]);

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
    if (!auth.onboardingCompleted && auth.role !== "admin") {
      router.replace("/onboarding");
      return;
    }
    setShowAdminLink(auth.role === "admin");
  }, [router]);

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
          if (data.success && data.plans) {
            setUserPricingPlans(parsePricingPlansFromApi(data.plans));
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
            plan?: { planId?: unknown; planName?: unknown };
          };
          if (meData.success && meData.utilisation != null) {
            setPlanUtilisation(parseUtilisationPayload(meData.utilisation));
          }
          if (meData.success) {
            const pid =
              typeof meData.plan?.planId === "string"
                ? meData.plan.planId
                : typeof meData.user?.planId === "string"
                  ? meData.user.planId
                  : "starter";
            const pname =
              typeof meData.plan?.planName === "string"
                ? meData.plan.planName
                : pid;
            setUserPlanId(pid);
            setUserPlanName(pname);
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
      setUtilisationHistoryTotalDocs(0);
      setUtilisationHistoryTotalPages(1);
      setUtilisationHistoryLoading(false);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setUtilisationHistoryLoading(true);
    setUtilisationHistory([]);
    const params = new URLSearchParams({
      page: String(utilisationHistoryPage),
      limit: String(UTILISATION_HISTORY_PAGE_SIZE),
    });
    fetch(`${apiBase}/api/users/me/utilisation/history?${params.toString()}`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.history)) {
          setUtilisationHistory(parseUtilisationHistoryPayload(data.history));
          const pagination = parseUtilisationHistoryPagination(data.pagination);
          setUtilisationHistoryTotalDocs(pagination.totalDocs);
          setUtilisationHistoryTotalPages(pagination.totalPages);
          if (pagination.page !== utilisationHistoryPage) {
            setUtilisationHistoryPage(pagination.page);
          }
        } else {
          setUtilisationHistory([]);
          setUtilisationHistoryTotalDocs(0);
          setUtilisationHistoryTotalPages(1);
        }
      })
      .catch(() => {
        setUtilisationHistory([]);
        setUtilisationHistoryTotalDocs(0);
        setUtilisationHistoryTotalPages(1);
      })
      .finally(() => setUtilisationHistoryLoading(false));
  }, [activeTab, utilisationHistoryPage]);

  useEffect(() => {
    if (activeTab === "Plans and pricing") {
      setUtilisationHistoryPage(1);
    }
  }, [activeTab]);

  const loadSavedCandidateKeys = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/candidates/saved?keysOnly=1`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.keyRows)) {
        throw new Error("Failed to load saved keys");
      }
      const keys = (data.keyRows as Parameters<typeof mapSavedApiRowToCandidate>[0][])
        .map((row) => candidateIdentityKey(mapSavedApiRowToCandidate(row)))
        .filter((k: string, idx: number, arr: string[]) => k !== "" && arr.indexOf(k) === idx);
      setSavedSessionCandidateKeys(keys);
    } catch {
      setSavedSessionCandidateKeys([]);
    }
  };

  const loadSavedCandidates = async (page: number, listFilter: string) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setSavedCandidatesList([]);
      setSavedCandidatesTotalDocs(0);
      setSavedCandidatesTotalPages(1);
      setSavedCandidatesTotalSavedCount(0);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setSavedCandidatesLoading(true);
    setSavedCandidatesList([]);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(SAVED_CANDIDATES_LIMIT),
        listFilter,
      });
      const res = await fetch(`${apiBase}/api/candidates/saved?${params}`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.candidates)) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to load saved candidates"
        );
      }
      const mapped = (data.candidates as Parameters<typeof mapSavedApiRowToCandidate>[0][]).map(
        mapSavedApiRowToCandidate
      );
      setSavedCandidatesList(mapped);
      setSavedCandidatesTotalSavedCount(
        typeof data.totalSavedCount === "number" ? data.totalSavedCount : mapped.length
      );
      const pg = data.pagination as
        | { totalDocs?: number; totalPages?: number; page?: number }
        | undefined;
      const totalDocs = typeof pg?.totalDocs === "number" ? pg.totalDocs : mapped.length;
      const totalPages =
        typeof pg?.totalPages === "number" ? Math.max(1, pg.totalPages) : 1;
      const serverPage = typeof pg?.page === "number" ? pg.page : page;
      setSavedCandidatesTotalDocs(totalDocs);
      setSavedCandidatesTotalPages(totalPages);
      setSavedCandidatesPage(serverPage);
    } catch {
      setSavedCandidatesList([]);
      setSavedCandidatesTotalDocs(0);
      setSavedCandidatesTotalPages(1);
    } finally {
      setSavedCandidatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "Session Results") return;
    void loadSavedCandidateKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh keys when opening session results
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Saved") return;
    void loadSavedCandidates(savedCandidatesPage, saveListFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- page/filter driven fetch
  }, [activeTab, savedCandidatesPage, saveListFilter]);

  const handleSaveListFilterChange = (value: string) => {
    setSaveListFilter(value);
    setSavedCandidatesPage(1);
  };

  const loadWorkspaceCandidates = async (page: number) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setWorkspaceCandidates([]);
      setWorkspaceCandidatesError("Please sign in again.");
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setWorkspaceCandidatesLoading(true);
    setWorkspaceCandidatesError("");
    try {
      const url = `${apiBase}/api/candidates/all?page=${page}&limit=${WORKSPACE_CANDIDATES_LIMIT}`;
      const res = await fetch(url, { headers: authHeaders(auth.token) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to load candidates"
        );
      }
      const list = Array.isArray(data.candidates)
        ? (data.candidates as CandidateRow[])
        : [];
      setWorkspaceCandidates(list);
      const pg = data.profilesPagination as
        | {
            totalDocs?: number;
            totalPages?: number;
            page?: number;
          }
        | undefined;
      setWorkspaceCandidatesTotalDocs(
        typeof pg?.totalDocs === "number" ? pg.totalDocs : list.length
      );
      setWorkspaceCandidatesTotalPages(
        typeof pg?.totalPages === "number" ? Math.max(1, pg.totalPages) : 1
      );
      setWorkspaceCandidatesPage(typeof pg?.page === "number" ? pg.page : page);
    } catch (err) {
      setWorkspaceCandidates([]);
      setWorkspaceCandidatesError(
        err instanceof Error ? err.message : "Could not load candidates"
      );
    } finally {
      setWorkspaceCandidatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "Candidates") return;
    void loadWorkspaceCandidates(workspaceCandidatesPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when search completes
  }, [activeTab, workspaceCandidatesPage, workspaceCandidatesRefresh]);

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
      const fjRoot = data.futureJobs as
        | { data?: { profile?: FjScoutProfile }; profile?: FjScoutProfile }
        | undefined;
      const fjProfile = fjRoot?.data?.profile ?? fjRoot?.profile;
      setPeopleScoutProfile(mapFjProfileToPeopleScoutProfile(fjProfile));
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

  const applySessionProfilesFromSearchResponse = (
    data: Record<string, unknown>,
    backTab: string
  ) => {
    const fjProfiles = data.futureJobsProfiles as
      | { data?: { docs?: SessionResultDoc[] } }
      | undefined;
    const docs = Array.isArray(fjProfiles?.data?.docs) ? fjProfiles.data.docs : [];
    setSessionResultDocs(docs);
    setSessionResultsFromDb(false);

    const pg = data.profilesPagination as
      | {
          totalPages?: number;
          hasNextPage?: boolean;
          totalDocs?: number;
        }
      | undefined;
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
    if (warn) setProfilesWarning(warn);

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
            profilesFetchError: warn || prev.profilesFetchError,
          }
        : prev
    );

    setHasSearched(true);
    setSessionResultsBackTab(backTab);
    setActiveTab("Session Results");
    setSessionResultError("");
    setWorkspaceCandidatesPage(1);
    setWorkspaceCandidatesRefresh((n) => n + 1);
  };

  const loadSessionProfilesFirstPage = async (
    sessionId: string,
    limit: number,
    token: string,
    backTab: string
  ) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const sid = encodeURIComponent(sessionId);
    const url = `${apiBase}/api/candidates/session/${sid}/profiles?page=1&limit=${limit}&fetchMore=0`;
    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(
        typeof data.message === "string" ? data.message : "Failed to load profiles"
      );
    }
    applySessionProfilesFromSearchResponse(data as Record<string, unknown>, backTab);
  };

  const handleSearch = () => {
    const prompt = aiPrompt.trim();
    setSearchError("");
    setSessionResultError("");

    if (!prompt) {
      setSearchError("Enter a search prompt first.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again to search.");
      return;
    }

    setFilterSearchPrompt(prompt);
    setCandidateFilterForm(DEFAULT_CANDIDATE_FILTER_FORM);
    setPendingSearchSessionId(null);
    setPendingSessionPayload(null);
    setIsFilterDrawerOpen(true);
  };

  const handleApplySearchFilters = async () => {
    const prompt = (filterSearchPrompt || aiPrompt).trim();
    if (!prompt) {
      setSearchError("Enter a search prompt first.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again to search.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const backTab = activeTab === "Session Results" ? sessionResultsBackTab : activeTab;
    setApplyFiltersLoading(true);
    setSearchError("");
    setSessionResultError("");
    setProfilesWarning("");

    try {
      const res = await fetch(`${apiBase}/api/candidates/search/apply`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          prompt,
          filterForm: candidateFilterForm,
          page: 1,
          limit: searchSummary?.limit ?? 20,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to load candidates"
        );
      }

      const sessionId =
        typeof data.sessionId === "string"
          ? data.sessionId
          : typeof data.futureJobs?.data?.session?._id === "string"
            ? data.futureJobs.data.session._id
            : null;

      if (!sessionId) {
        setSearchError("Search completed but no sourcing session was returned.");
        return;
      }

      if (typeof data.profilesFetchError === "string" && data.profilesFetchError) {
        setProfilesWarning(data.profilesFetchError);
      }

      setPendingSearchSessionId(sessionId);
      if (data.sessionPayload && typeof data.sessionPayload === "object") {
        setPendingSessionPayload(data.sessionPayload as Record<string, unknown>);
      }
      if (data.filterForm && typeof data.filterForm === "object") {
        setCandidateFilterForm(
          mergeFilterForm(
            DEFAULT_CANDIDATE_FILTER_FORM,
            data.filterForm as Partial<CandidateFilterForm>
          )
        );
      }

      const docsFromApply = Array.isArray(
        (data as { futureJobsProfiles?: { data?: { docs?: unknown[] } } })
          .futureJobsProfiles?.data?.docs
      )
        ? ((data as { futureJobsProfiles: { data: { docs: SessionResultDoc[] } } })
            .futureJobsProfiles.data.docs)
        : [];

      if (docsFromApply.length > 0) {
        applySessionProfilesFromSearchResponse(
          data as Record<string, unknown>,
          backTab
        );
      } else {
        await loadSessionProfilesFirstPage(
          sessionId,
          typeof data.limit === "number" ? data.limit : 20,
          auth.token,
          backTab
        );
      }

      setIsFilterDrawerOpen(false);
      setHasSearched(true);
      setWorkspaceCandidatesRefresh((n) => n + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not apply filters";
      setSessionResultError(message);
      setSearchError(message);
    } finally {
      setApplyFiltersLoading(false);
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

  const openSessionFromHistory = async (
    row: SourcingSessionRow,
    backTab = "Search history"
  ) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setSearchError("Please sign in again.");
      return;
    }
    setSessionResultsBackTab(backTab);
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
      if (activeTab === "Saved") {
        const nextPage =
          isSaved && savedCandidatesList.length <= 1 && savedCandidatesPage > 1
            ? savedCandidatesPage - 1
            : savedCandidatesPage;
        if (nextPage !== savedCandidatesPage) {
          setSavedCandidatesPage(nextPage);
        } else {
          void loadSavedCandidates(savedCandidatesPage, saveListFilter);
        }
      } else {
        void loadSavedCandidateKeys();
      }
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
        setSavedCandidatesPage(1);
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
      if (saveListFilter === listId) {
        setSavedCandidatesPage(1);
        setSaveListFilter("__all__");
      }
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
      if (activeTab === "Saved") {
        void loadSavedCandidates(savedCandidatesPage, saveListFilter);
      }
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

  const openSessionCandidateDetail = (doc: SessionResultDoc, candidate: CandidateRow) => {
    setSelectedSessionDetailDoc(doc);
    setSelectedSessionDetailCandidate(candidate);
    setIsSessionCandidateDrawerOpen(true);
  };

  const closeSessionCandidateDetail = () => {
    setIsSessionCandidateDrawerOpen(false);
    setSelectedSessionDetailDoc(null);
    setSelectedSessionDetailCandidate(null);
  };

  const getDisplayedEmail = (candidate: CandidateRow) => {
    const key = candidateRowKey(candidate);
    return revealedContactValues[key]?.email || candidate.email || "";
  };

  const getDisplayedPhone = (candidate: CandidateRow) => {
    const key = candidateRowKey(candidate);
    return revealedContactValues[key]?.phone || candidate.phone || "";
  };

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
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
    <main className="dashboard-page">
      <div className="dashboard-shell flex min-w-0 w-full">
        <aside className="dashboard-sidebar hidden flex-col lg:flex">
          <div className="dashboard-sidebar-brand">
            <Link href="/dashboard" className="inline-block">
              <LandingLogo className="h-10 w-auto" priority />
            </Link>
          </div>

          <nav className="dashboard-sidebar-nav mt-8">
            <div className="dashboard-sidebar-nav-scroll">
              <div className="space-y-2">
              {userSidebarItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveTab(item.label)}
                  className={`dashboard-nav-item w-full ${
                    activeTab === item.label ? "dashboard-nav-item--active" : ""
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`dashboard-nav-icon ${
                        activeTab === item.label ? "dashboard-nav-icon--active" : ""
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="dashboard-nav-subtitle">{item.subtitle}</span>
                    </span>
                  </span>
                </button>
              ))}
              </div>
            </div>

            <div className="dashboard-sidebar-footer" ref={profileMenuRef}>
              <div className="dashboard-sidebar-profile-row">
                <button
                  type="button"
                  onClick={() => setActiveTab(userProfileSidebarItem.label)}
                  className={`dashboard-nav-item min-w-0 flex-1 ${
                    activeTab === userProfileSidebarItem.label
                      ? "dashboard-nav-item--active"
                      : ""
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`dashboard-nav-icon ${
                        activeTab === userProfileSidebarItem.label
                          ? "dashboard-nav-icon--active"
                          : ""
                      }`}
                    >
                      {userProfileSidebarItem.icon}
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-sm font-medium">
                        {userProfileSidebarItem.label}
                      </span>
                      <span className="dashboard-nav-subtitle block truncate">
                        {userProfileSidebarItem.subtitle}
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className={`dashboard-sidebar-menu-trigger${
                    profileMenuOpen ? " dashboard-sidebar-menu-trigger--open" : ""
                  }`}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Account options"
                >
                  <MaterialIcon name="more_vert" className="text-[1.25rem]" />
                </button>

                {profileMenuOpen ? (
                  <div className="dashboard-sidebar-menu" role="menu">
                    {showAdminLink ? (
                      <Link
                        href="/admin/dashboard"
                        role="menuitem"
                        className="dashboard-sidebar-menu-item"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <MaterialIcon name="admin_panel_settings" className="text-base" />
                        Admin panel
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      disabled={isLoggingOut}
                      className="dashboard-sidebar-menu-item dashboard-sidebar-menu-item--danger w-full disabled:opacity-55"
                    >
                      <MaterialIcon name="logout" className="text-base" />
                      {isLoggingOut ? "Logging out…" : "Logout"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </nav>

        </aside>

        <section className="dashboard-main-panel">
          <header className="dashboard-header shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="dashboard-header-eyebrow">User Workspace</p>
                <h2 className="dashboard-header-title">{activeTab}</h2>
              </div>
              {showAdminLink ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:hidden">
                  <Link href="/admin/dashboard" className="dashboard-btn-secondary">
                    Admin panel
                  </Link>
                </div>
              ) : null}
            </div>
          </header>

          <div className="dashboard-main-scroll">
            {activeTab === "Dashboard" ? (
              <DashboardOverviewPanel
                loading={dashboardOverviewLoading}
                error={dashboardOverviewError}
                data={dashboardOverview}
                onNavigate={setActiveTab}
                onOpenSession={(session) => {
                  if (!session.futureJobsSessionId.trim()) return;
                  void openSessionFromHistory(
                    {
                      id: session.id,
                      futureJobsSessionId: session.futureJobsSessionId,
                      prompt: session.prompt,
                      sessionTitle: session.sessionTitle,
                      usingSessionOverride: false,
                      futureJobsStatus: session.futureJobsStatus,
                      totalDocs: session.totalDocs,
                      candidateCountFirstPage: session.candidateCountFirstPage,
                      candidatePreview: [],
                      profilesFetchError: null,
                      createdAt: session.createdAt,
                      updatedAt: session.createdAt,
                    },
                    "Dashboard"
                  );
                }}
              />
            ) : activeTab === "Search Candidates" ? (
              <section className="dashboard-card flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 dashboard-section-title">
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
                    <p className="mt-1 dashboard-text-body">
                      Give AI prompt and search candidate keywords.
                    </p>
                  </div>
                  <span className="dashboard-badge">
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
                      className="w-full dashboard-textarea text-sm disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={aiPrompt.trim().length === 0}
                      className="dashboard-btn-primary px-5 py-2.5 disabled:opacity-60"
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
                    <p className="dashboard-alert-error">
                      {searchError}
                    </p>
                  ) : null}
                  {profilesWarning ? (
                    <p className="dashboard-alert-warning">
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
              <section className="dashboard-card flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <div className="dashboard-results-toolbar">
                  <div>
                    <h3 className="flex items-center gap-2 dashboard-section-title">
                      <MaterialIcon name="groups" className="text-xl text-[#0050cb]" />
                      Session results
                    </h3>
                    <p className="mt-1 dashboard-text-body">
                      Candidates from your selected sourcing session.
                      {searchSummary?.sessionId ? (
                        <span className="mt-1 block font-mono text-[10px] text-[#424656]/75">
                          {searchSummary.sessionId}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {searchSummary?.totalDocs != null ? (
                      <span className="dashboard-badge tabular-nums">
                        {searchSummary.totalDocs.toLocaleString()} total
                      </span>
                    ) : null}
                    {sessionResultDocs.length > 0 ? (
                      <span className="dashboard-badge tabular-nums">
                        Showing {sessionResultDocs.length}
                        {sessionResultHasNext ? "+" : ""}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsFilterDrawerOpen(true)}
                      className="dashboard-btn-secondary px-3 py-1.5 text-xs"
                    >
                      <MaterialIcon name="tune" className="text-sm" />
                      Edit filter
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(sessionResultsBackTab)}
                      className="dashboard-btn-secondary px-3 py-1.5 text-xs"
                    >
                      <MaterialIcon name="arrow_back" className="text-sm" />
                      Back
                    </button>
                  </div>
                </div>

                {sessionResultError ? (
                  <p className="mt-4 dashboard-alert-error">
                    {sessionResultError}
                  </p>
                ) : null}

                {searchLoading && sessionResultDocs.length === 0 ? (
                  <SessionResultsSkeleton count={4} />
                ) : null}

                {!searchLoading && sessionResultDocs.length === 0 && !sessionResultError ? (
                  <div className="dashboard-empty-state">
                    <div className="dashboard-empty-state-icon">
                      <MaterialIcon name="person_off" className="text-[28px]" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-[#141b2b]">
                      No candidates in this session
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-[#424656]">
                      Try another search from history or run a new AI search.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("Search history")}
                      className="dashboard-btn-primary mt-6"
                    >
                      <MaterialIcon name="history" className="text-base" />
                      View search history
                    </button>
                  </div>
                ) : null}

                {sessionResultDocs.length > 0 ? (
                  <>
                    <div className="dashboard-results-grid mt-4">
                      {sessionResultDocs.map((doc, idx) => {
                        const highlights = doc.profileAnalysis?.highlights ?? [];
                        const current = doc.profile?.current_employers_object?.[0];
                        const revealCandidate = sessionDocToCandidateRow(
                          doc,
                          idx,
                          searchSummary?.sessionId ?? null
                        );
                        const sessionCandidateKey = candidateIdentityKey(revealCandidate);
                        const isSavedSessionCandidate =
                          savedSessionCandidateKeys.includes(sessionCandidateKey);
                        const isSaveBusy = saveCandidateBusyKeys.includes(sessionCandidateKey);
                        const isDetailOpen =
                          isSessionCandidateDrawerOpen &&
                          selectedSessionDetailDoc?._id === doc._id;
                        const candidateName = doc.profile?.name || "Unnamed candidate";
                        const candidatePhotoUrl =
                          typeof doc.profile?.profile_picture_permalink === "string"
                            ? doc.profile.profile_picture_permalink.trim()
                            : "";
                        const sessionLinkedinUrl =
                          typeof revealCandidate.linkedin_profile_url === "string"
                            ? revealCandidate.linkedin_profile_url.trim()
                            : "";
                        return (
                          <article
                            key={doc._id || `session-doc-${idx}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => openSessionCandidateDetail(doc, revealCandidate)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openSessionCandidateDetail(doc, revealCandidate);
                              }
                            }}
                            className={`dashboard-candidate-card ${
                              isDetailOpen ? "dashboard-candidate-card--active" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <SessionCandidateGridAvatar
                                name={candidateName}
                                photoUrl={candidatePhotoUrl}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4 className="text-base font-semibold text-slate-900">
                                      {candidateName}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {current?.job_title || "Role unavailable"}
                                      {current?.company_name ? ` · ${current.company_name}` : ""}
                                    </p>
                                  </div>
                                  {typeof doc.finalScore === "number" ? (
                                    <span
                                      className={`shrink-0 ${candidateScoreBadgeClass(doc.finalScore)}`}
                                    >
                                      Score {formatCandidateScore(doc.finalScore)}/5
                                    </span>
                                  ) : null}
                                </div>
                              </div>
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
                                    className="dashboard-chip"
                                  >
                                    {h.Category ? `${h.Category}: ` : ""}
                                    {h.Highlight || "—"}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {doc.profileAnalysis?.recommendation ? (
                              <AiRecommendationBlock
                                text={doc.profileAnalysis.recommendation}
                                compact
                              />
                            ) : null}

                            <div
                              className="dashboard-candidate-actions"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div
                                className={`grid gap-1.5 ${
                                  sessionLinkedinUrl ? "grid-cols-4" : "grid-cols-3"
                                }`}
                              >
                                <button
                                  type="button"
                                  title="Save candidate"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void toggleSaveCandidate(revealCandidate);
                                  }}
                                  disabled={isSaveBusy}
                                  className={`inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 py-1.5 text-[10px] font-medium leading-tight transition sm:text-[11px] ${
                                    isSavedSessionCandidate
                                      ? "dashboard-btn-toggle-active"
                                      : "dashboard-btn-toggle-inactive"
                                  } disabled:opacity-60`}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden
                                  >
                                    <path
                                      d="M19 21L12 16L5 21V5C5 4.45 5.45 4 6 4H18C18.55 4 19 4.45 19 5V21Z"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span className="min-w-0 truncate">
                                    {isSaveBusy
                                      ? "Saving..."
                                      : isSavedSessionCandidate
                                        ? "Saved"
                                        : "Save Candidate"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  title="Reveal email"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revealEmail(revealCandidate);
                                  }}
                                  className="dashboard-btn-secondary w-full min-w-0 px-1.5 py-1.5 text-[10px] sm:text-[11px]"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden
                                  >
                                    <path
                                      d="M4 6H20V18H4V6ZM4 7L12 13L20 7"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span className="min-w-0 truncate">Reveal Email</span>
                                </button>
                                <button
                                  type="button"
                                  title="Reveal mobile"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revealPhone(revealCandidate);
                                  }}
                                  className="inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-[10px] font-medium leading-tight text-slate-700 transition hover:bg-slate-100 sm:text-[11px]"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden
                                  >
                                    <path
                                      d="M22 16.92V19.92C22 20.47 21.55 20.92 21 20.92C10.51 20.92 2 12.41 2 1.92C2 1.37 2.45 0.92 3 0.92H6C6.47 0.92 6.88 1.25 6.98 1.71L7.78 5.31C7.86 5.7 7.74 6.11 7.46 6.39L5.42 8.43C6.76 11.13 8.95 13.32 11.65 14.66L13.69 12.62C13.97 12.34 14.38 12.22 14.77 12.3L18.37 13.1C18.83 13.2 19.16 13.61 19.16 14.08V16.92"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span className="min-w-0 truncate">Reveal Mobile</span>
                                </button>
                                {sessionLinkedinUrl ? (
                                  <a
                                    href={sessionLinkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open LinkedIn profile"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1.5 text-[10px] font-medium leading-tight text-slate-700 transition hover:bg-slate-100 sm:text-[11px]"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5 shrink-0"
                                      fill="currentColor"
                                      aria-hidden
                                    >
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    <span className="min-w-0 truncate">LinkedIn</span>
                                  </a>
                                ) : null}
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
                          className="dashboard-btn-primary px-5 py-2.5 disabled:opacity-60"
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
                ) : null}
              </section>
            ) : activeTab === "People Scout" ? (
              <PeopleScoutPanel
                userDisplayName={myProfileForm.fullName}
                query={peopleScoutQuery}
                onQueryChange={setPeopleScoutQuery}
                onSearch={() => void handlePeopleScoutSearch()}
                loading={peopleScoutLoading}
                error={peopleScoutError}
                recentList={peopleScoutRecentList}
                recentLoading={peopleScoutRecentLoading}
                onOpenRecent={openPeopleScoutDetails}
              />
            ) : activeTab === "My Profile" ? (
              <MyProfilePanel
                form={myProfileForm}
                security={myProfileSecurity}
                loading={myProfileLoading}
                saving={myProfileSaving}
                error={myProfileError}
                success={myProfileSuccess}
                isEditing={isEditingProfile}
                passwordForm={passwordForm}
                passwordUpdateLoading={passwordUpdateLoading}
                peopleScoutProfileName={peopleScoutProfile?.name}
                peopleScoutLoading={peopleScoutLoading}
                onFieldChange={onMyProfileFieldChange}
                onEdit={onEditMyProfile}
                onCancel={onCancelMyProfileEdit}
                onSave={() => void onSaveMyProfile()}
                onPasswordFieldChange={onPasswordFieldChange}
                onUpdatePassword={() => void handleUpdatePassword()}
              />
            ) : activeTab === "Search history" ? (
              <section className="dashboard-card flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 dashboard-section-title">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#0050cb]">
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
                    <p className="mt-1 dashboard-text-body">
                      Every AI search is saved as a sourcing session. Open a session to review
                      candidates in Search Candidates.
                    </p>
                  </div>
                  {!sourcingSessionsLoading && sourcingSessions.length > 0 ? (
                    <span className="dashboard-badge tabular-nums">
                      {sourcingSessions.length} session
                      {sourcingSessions.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>

                <SearchHistoryTable
                  rows={sourcingSessions}
                  loading={sourcingSessionsLoading}
                  error={sourcingSessionsError}
                  highlightSessionId={highlightSessionId}
                  actionLoading={searchLoading}
                  onOpenSession={(row) => void openSessionFromHistory(row)}
                  onGoToSearch={() => setActiveTab("Search Candidates")}
                />

              </section>
            ) : activeTab === "Candidates" ? (
              <section className="dashboard-card flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <div className="dashboard-results-toolbar">
                  <div>
                    <h3 className="flex items-center gap-2 dashboard-section-title">
                      <MaterialIcon name="groups" className="text-xl text-[#0050cb]" />
                      All searched candidates
                    </h3>
                    <p className="mt-1 dashboard-text-body">
                      Every candidate from all your sourcing searches, newest first.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="dashboard-badge tabular-nums">
                      {workspaceCandidatesTotalDocs.toLocaleString()} total
                    </span>
                    {workspaceCandidatesTotalPages > 1 ? (
                      <span className="dashboard-badge tabular-nums">
                        Page {workspaceCandidatesPage} of {workspaceCandidatesTotalPages}
                      </span>
                    ) : null}
                  </div>
                </div>

                <WorkspaceCandidatesTable
                  candidates={workspaceCandidates}
                  loading={workspaceCandidatesLoading}
                  error={workspaceCandidatesError}
                  totalDocs={workspaceCandidatesTotalDocs}
                  page={workspaceCandidatesPage}
                  totalPages={workspaceCandidatesTotalPages}
                  onPageChange={setWorkspaceCandidatesPage}
                  rowKey={candidateRowKey}
                  revealedEmailKeys={revealedEmail}
                  revealedPhoneKeys={revealedPhone}
                  onRevealEmail={revealEmail}
                  onRevealPhone={revealPhone}
                  getDisplayedEmail={getDisplayedEmail}
                  getDisplayedPhone={getDisplayedPhone}
                  onOpenDetail={(candidate) => {
                    if (candidate.rawDoc) {
                      openSessionCandidateDetail(
                        candidate.rawDoc as SessionResultDoc,
                        candidate as CandidateRow
                      );
                    }
                  }}
                  onGoToSearch={() => setActiveTab("Search Candidates")}
                />
              </section>
            ) : activeTab === "Saved" ? (
              <SavedCandidatesPanel
                candidates={savedCandidatesList}
                totalSavedCount={savedCandidatesTotalSavedCount}
                filteredTotalDocs={savedCandidatesTotalDocs}
                loading={savedCandidatesLoading}
                page={savedCandidatesPage}
                totalPages={savedCandidatesTotalPages}
                onPageChange={setSavedCandidatesPage}
                saveListFilter={saveListFilter}
                onSaveListFilterChange={handleSaveListFilterChange}
                saveLists={saveLists}
                saveListsLoading={saveListsLoading}
                newSaveListName={newSaveListName}
                onNewSaveListNameChange={setNewSaveListName}
                onCreateSaveList={() => void handleCreateSaveList()}
                createSaveListBusy={createSaveListBusy}
                onDeleteSaveList={(listId) => void handleDeleteSaveList(listId)}
                deleteSaveListBusyId={deleteSaveListBusyId}
                saveTargetListId={saveTargetListId}
                onSaveTargetListChange={(listId) => {
                  setSaveTargetListId(listId);
                  try {
                    if (!listId) localStorage.removeItem("ejhunter_save_target_list_id");
                    else localStorage.setItem("ejhunter_save_target_list_id", listId);
                  } catch {
                    /* ignore */
                  }
                }}
                rowKey={candidateRowKey}
                identityKey={candidateIdentityKey}
                saveBusyKeys={saveCandidateBusyKeys}
                revealedEmailKeys={revealedEmail}
                revealedPhoneKeys={revealedPhone}
                onOpenDetail={(candidate) => {
                  if (candidate.rawDoc) {
                    openSessionCandidateDetail(
                      candidate.rawDoc as SessionResultDoc,
                      candidate as CandidateRow
                    );
                  }
                }}
                onUnsave={(candidate) => void toggleSaveCandidate(candidate as CandidateRow)}
                onMoveList={(candidate, listId) =>
                  void moveCandidateToSaveList(candidate as CandidateRow, listId)
                }
                onRevealEmail={(candidate) => revealEmail(candidate as CandidateRow)}
                onRevealPhone={(candidate) => revealPhone(candidate as CandidateRow)}
                getDisplayedEmail={(candidate) => getDisplayedEmail(candidate as CandidateRow)}
                getDisplayedPhone={(candidate) => getDisplayedPhone(candidate as CandidateRow)}
                onGoToSessionResults={() => setActiveTab("Session Results")}
              />
            ) : activeTab === "Plans and pricing" ? (
              <PlansPricingPanel
                loading={userPricingPlansLoading}
                plans={userPricingPlans}
                currentPlanId={userPlanId}
                currentPlanName={userPlanName}
                utilisation={planUtilisation}
                history={utilisationHistory}
                historyLoading={utilisationHistoryLoading}
                historyPage={utilisationHistoryPage}
                historyTotalDocs={utilisationHistoryTotalDocs}
                historyTotalPages={utilisationHistoryTotalPages}
                onHistoryPageChange={setUtilisationHistoryPage}
              />
            ) : (
              <section className="dashboard-card flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <h3 className="dashboard-section-title">{activeTab}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This section is coming soon.
                </p>
              </section>
            )}

          </div>
        </section>
      </div>

      <CandidateFilterDrawer
        open={isFilterDrawerOpen}
        form={candidateFilterForm}
        searchPrompt={filterSearchPrompt || aiPrompt}
        onChange={(patch) =>
          setCandidateFilterForm((prev) => mergeFilterForm(prev, patch))
        }
        onClose={() => {
          if (!applyFiltersLoading) setIsFilterDrawerOpen(false);
        }}
        onApply={() => void handleApplySearchFilters()}
        applyLoading={applyFiltersLoading}
        title="Set search filters"
      />

      {selectedSessionDetailDoc && selectedSessionDetailCandidate ? (
        <SessionCandidateDetailDrawer
          open={isSessionCandidateDrawerOpen}
          doc={selectedSessionDetailDoc}
          candidate={selectedSessionDetailCandidate}
          onClose={closeSessionCandidateDetail}
          onRevealEmail={() => revealEmail(selectedSessionDetailCandidate)}
          onRevealPhone={() => revealPhone(selectedSessionDetailCandidate)}
          onToggleSave={() => void toggleSaveCandidate(selectedSessionDetailCandidate)}
          isSaved={savedSessionCandidateKeys.includes(
            candidateIdentityKey(selectedSessionDetailCandidate)
          )}
          isSaveBusy={saveCandidateBusyKeys.includes(
            candidateIdentityKey(selectedSessionDetailCandidate)
          )}
          displayedEmail={getDisplayedEmail(selectedSessionDetailCandidate)}
          displayedPhone={getDisplayedPhone(selectedSessionDetailCandidate)}
          emailRevealed={revealedEmail.includes(
            candidateRowKey(selectedSessionDetailCandidate)
          )}
          phoneRevealed={revealedPhone.includes(
            candidateRowKey(selectedSessionDetailCandidate)
          )}
        />
      ) : null}

      {peopleScoutProfile ? (
        <div
          className={`dashboard-overlay fixed inset-0 transition-opacity duration-300 ${
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
            className="dashboard-drawer-overlay absolute inset-0"
            onClick={() => setIsPeopleScoutDrawerOpen(false)}
          />
          <aside
            className={`dashboard-drawer-panel dashboard-drawer-panel--scout absolute right-0 top-0 h-full w-full overflow-y-auto transition-transform duration-300 ease-out ${
              isPeopleScoutDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--dash-outline)_40%,transparent)] bg-white/95 px-5 py-4 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="dashboard-label-upper">People Scout</p>
                  <h3 className="mt-1 truncate dashboard-section-title">
                    {peopleScoutProfile.name}
                  </h3>
                  {peopleScoutProfile.headline ? (
                    <p className="mt-0.5 line-clamp-2 dashboard-text-body">
                      {peopleScoutProfile.headline}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPeopleScoutDrawerOpen(false)}
                  className="dashboard-btn-ghost shrink-0 p-1.5"
                  aria-label="Close profile panel"
                >
                  <MaterialIcon name="close" className="text-xl" />
                </button>
              </div>
              <div
                className={`dashboard-drawer-actions ${
                  peopleScoutProfile.linkedinUrl
                    ? "dashboard-drawer-actions--cols-3"
                    : "dashboard-drawer-actions--cols-2"
                }`}
                role="group"
                aria-label="Profile actions"
              >
                {peopleScoutProfile.linkedinUrl ? (
                  <a
                    href={peopleScoutProfile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dashboard-drawer-action dashboard-drawer-action--linkedin"
                  >
                    <span className="dashboard-drawer-action-icon" aria-hidden>
                      <MaterialIcon name="work" className="text-[20px]" />
                    </span>
                    <span className="dashboard-drawer-action-body">
                      <span className="dashboard-drawer-action-label">Open LinkedIn</span>
                      <span className="dashboard-drawer-action-hint">View public profile</span>
                    </span>
                    <MaterialIcon
                      name="open_in_new"
                      className="dashboard-drawer-action-trail text-[18px]"
                      aria-hidden
                    />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void revealPeopleScoutContactFromApi("EMAIL")}
                  disabled={peopleScoutRevealEmailBusy}
                  className={`dashboard-drawer-action${
                    peopleScoutRevealEmail ? " dashboard-drawer-action--active" : ""
                  }`}
                >
                  <span className="dashboard-drawer-action-icon" aria-hidden>
                    <MaterialIcon name="mail" className="text-[20px]" />
                  </span>
                  <span className="dashboard-drawer-action-body">
                    <span className="dashboard-drawer-action-label">
                      {peopleScoutRevealEmailBusy
                        ? "Revealing…"
                        : peopleScoutRevealEmail
                          ? "Email revealed"
                          : "Reveal email"}
                    </span>
                    <span className="dashboard-drawer-action-hint">
                      {peopleScoutRevealEmail ? "Shown below" : "Uses lookup credit"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void revealPeopleScoutContactFromApi("PHONE")}
                  disabled={peopleScoutRevealPhoneBusy}
                  className={`dashboard-drawer-action${
                    peopleScoutRevealPhone ? " dashboard-drawer-action--active" : ""
                  }`}
                >
                  <span className="dashboard-drawer-action-icon" aria-hidden>
                    <MaterialIcon name="call" className="text-[20px]" />
                  </span>
                  <span className="dashboard-drawer-action-body">
                    <span className="dashboard-drawer-action-label">
                      {peopleScoutRevealPhoneBusy
                        ? "Revealing…"
                        : peopleScoutRevealPhone
                          ? "Phone revealed"
                          : "Reveal phone"}
                    </span>
                    <span className="dashboard-drawer-action-hint">
                      {peopleScoutRevealPhone ? "Shown below" : "Uses lookup credit"}
                    </span>
                  </span>
                </button>
              </div>
              {peopleScoutRevealEmail || peopleScoutRevealPhone ? (
                <div className="dashboard-drawer-revealed-card">
                  {peopleScoutRevealEmail ? (
                    <div className="dashboard-drawer-revealed-row">
                      <span className="dashboard-drawer-action-icon" aria-hidden>
                        <MaterialIcon name="mail" className="text-base" />
                      </span>
                      <span className="dashboard-drawer-revealed-label">Email</span>
                      <span className="dashboard-drawer-revealed-value">
                        {peopleScoutProfile.email.trim() ? (
                          <a href={`mailto:${peopleScoutProfile.email}`}>
                            {peopleScoutProfile.email}
                          </a>
                        ) : (
                          <span className="text-[#424656]/70">Not available</span>
                        )}
                      </span>
                    </div>
                  ) : null}
                  {peopleScoutRevealPhone ? (
                    <div className="dashboard-drawer-revealed-row">
                      <span className="dashboard-drawer-action-icon" aria-hidden>
                        <MaterialIcon name="call" className="text-base" />
                      </span>
                      <span className="dashboard-drawer-revealed-label">Phone</span>
                      <span className="dashboard-drawer-revealed-value">
                        {peopleScoutProfile.phone.trim() ? (
                          <a href={`tel:${peopleScoutProfile.phone.replace(/\s/g, "")}`}>
                            {peopleScoutProfile.phone}
                          </a>
                        ) : (
                          <span className="text-[#424656]/70">Not available</span>
                        )}
                      </span>
                    </div>
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
