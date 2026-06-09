"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { CandidateFilterDrawer } from "@/components/CandidateFilterDrawer";
import {
  PeopleScoutDetailDrawer,
  type PeopleScoutProfile,
} from "@/components/dashboard/PeopleScoutDetailDrawer";
import { SessionCandidateDetailDrawer } from "@/components/dashboard/SessionCandidateDetailDrawer";
import {
  CandidateRoleCompanyLine,
  SessionResultCandidateCard,
  type SessionResultCardData,
} from "@/components/dashboard/SessionResultCandidateCard";
import { OpenToWorkBadge } from "@/components/dashboard/OpenToWorkBadge";
import { isOpenToWork } from "@/lib/openToWork";
import {
  mergeSessionDetailFromFj,
  isSyntheticSessionCandidateId,
  resolveCandidateProfileId,
} from "@/lib/sessionCandidateDetail";
import { SearchHistoryTable } from "@/components/dashboard/SearchHistoryTable";
import { SessionResultsSkeleton } from "@/components/dashboard/SessionResultsSkeleton";
import {
  PeopleScoutPanel,
  type PeopleScoutRecentUser,
} from "@/components/dashboard/PeopleScoutPanel";
import {
  MyProfilePanel,
  parseWorkspaceOwner,
  type MyProfileFormState,
  type MyProfileSecurityState,
  type MyProfileWorkspaceOwner,
} from "@/components/dashboard/MyProfilePanel";
import { DashboardOverviewPanel } from "@/components/dashboard/DashboardOverviewPanel";
import { BlockedAccountModal } from "@/components/dashboard/BlockedAccountModal";
import { TeamManagementPanel } from "@/components/dashboard/TeamManagementPanel";
import { PlansPricingPanel } from "@/components/dashboard/PlansPricingPanel";
import {
  ApplyFiltersSessionChoiceModal,
  type ApplyFiltersSessionMode,
} from "@/components/dashboard/ApplyFiltersSessionChoiceModal";
import {
  DashboardToast,
  type DashboardToastVariant,
} from "@/components/dashboard/DashboardToast";
import { UserActionAlertModal } from "@/components/dashboard/UserActionAlertModal";
import { CandidatePoolPanel } from "@/components/dashboard/CandidatePoolPanel";
import {
  SearchCandidatesPanel,
  type RecentAiSearchItem,
} from "@/components/dashboard/SearchCandidatesPanel";
import { AddToCampaignModal } from "@/components/dashboard/AddToCampaignModal";
import { CampaignsPanel } from "@/components/dashboard/CampaignsPanel";
import { IntegrationsPanel } from "@/components/dashboard/IntegrationsPanel";
import { OutreachesPanel } from "@/components/dashboard/OutreachesPanel";
import { SavedCandidatesPanel } from "@/components/dashboard/SavedCandidatesPanel";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import { authUploadHeaders, resolveProfilePhotoUrl } from "@/lib/profilePhoto";
import {
  parseDashboardOverviewPayload,
  type DashboardOverviewData,
} from "@/lib/dashboardOverview";
import {
  parsePlanFromMeResponse,
  parseUtilisationHistoryPagination,
  parseUtilisationHistoryPayload,
  parseUtilisationPayload,
  UTILISATION_HISTORY_PAGE_SIZE,
  type OutreachThreadStats,
  type UserUtilisationStats,
  type UtilisationHistoryRow,
} from "@/lib/planUtilisation";
import {
  parsePricingPlansFromApi,
  type PricingPlansPayload,
} from "@/lib/pricingPlans";
import { hasCampaignsAccess } from "@/lib/planAccess";
import { mergeStoredAuthUser, postAuthPath } from "@/lib/onboarding";
import { isBlockedAccountResponse, isBlockedMemberStatus } from "@/lib/sessionLogout";
import {
  revealContactErrorMessage,
  revealContactNotFoundMessage,
  type RevealContactType,
} from "@/lib/revealContactMessages";
import {
  FUTURE_JOBS_UPSTREAM_ERROR_CODE,
  FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE,
  isFutureJobsUpstreamApiError,
} from "@/lib/apiErrors";
import { useUserActionAlert } from "@/lib/useUserActionAlert";
import type { CampaignContact, CampaignRecord } from "@/lib/campaigns";
import {
  CAMPAIGN_CONTACTS_LOCKED_MESSAGE,
  isCampaignLaunched,
  validateCampaignContactBatch,
} from "@/lib/campaignContactLimits";
import {
  addContactsToCampaignApi,
  createCampaign,
  fetchCampaign,
  fetchCampaignsPage,
} from "@/lib/campaignsApi";
import { realtimeClient } from "@/lib/realtime/client";
import {
  lookupRevealedContacts,
  mergeRevealedLookupIntoContacts,
  normalizeLinkedinUrl,
} from "@/lib/revealContactsApi";
import type { CampaignWorkspaceTab } from "@/lib/campaignRoutes";
import {
  pathForDashboardTab,
  tabFromPathSegments,
  tabKeyFromSidebarLabel,
  type DashboardTabKey,
} from "@/lib/dashboardRoutes";
import {
  candidateScoreBadgeClass,
  dedupeSessionResultDocs,
  formatCandidateScore,
} from "@/lib/sessionResultUi";
import {
  DEFAULT_CANDIDATE_FILTER_FORM,
  mergeFilterForm,
  mergeFilterFormPreserveFilled,
  normalizeFilterForm,
  type CandidateFilterForm,
} from "@/lib/sourcingFilters";

const TEMPORARY_SEARCH_FAILURE_MESSAGE =
  "We couldn’t complete the search right now. Please try again shortly.";

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
  filterForm?: Partial<CandidateFilterForm> | null;
  createdAt: string;
  updatedAt: string;
};

type UserSidebarNavItem = {
  label: string;
  subtitle: string;
  icon: ReactNode;
  tabKey?: string;
};

type UserSidebarNavGroup = {
  label: string;
  subtitle: string;
  icon: ReactNode;
  children: UserSidebarNavItem[];
};

type UserSidebarNavEntry = UserSidebarNavItem | UserSidebarNavGroup;

function isSidebarNavGroup(entry: UserSidebarNavEntry): entry is UserSidebarNavGroup {
  return "children" in entry && Array.isArray(entry.children);
}

const campaignsSidebarItem: UserSidebarNavItem = {
  label: "Campaigns",
  subtitle: "Group & run outreach",
  icon: <MaterialIcon name="flag" />,
};

const integrationsSidebarItem: UserSidebarNavItem = {
  label: "Integrations",
  subtitle: "Gmail, WhatsApp, Calendly, LinkedIn",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M12 2V6M12 18V22M2 12H6M18 12H22M5.64 5.64L8.46 8.46M15.54 15.54L18.36 18.36M5.64 18.36L8.46 15.54M15.54 8.46L18.36 5.64"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
};

const engagementsSidebarGroup: UserSidebarNavGroup = {
  label: "Engagements",
  subtitle: "Outreach & connections",
  icon: <MaterialIcon name="campaign" />,
  children: [campaignsSidebarItem, integrationsSidebarItem],
};

const userSidebarNavEntries: UserSidebarNavEntry[] = [
  {
    label: "Dashboard",
    subtitle: "Your workspace overview",
    icon: <MaterialIcon name="space_dashboard" />,
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
    label: "Candidate pool",
    subtitle: "View all Searched Candidates",
    tabKey: "Candidates",
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
    icon: <MaterialIcon name="travel_explore" />,
  },
  engagementsSidebarGroup,
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

const teamSidebarItem: UserSidebarNavItem = {
  label: "Team",
  subtitle: "Manage Sub Users",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M22 21V19C22 17.34 20.66 16 19 16H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M2 21V19C2 17.34 3.34 16 5 16H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
};

function sidebarItemsForRole(accountRole: "owner" | "member" | null) {
  const items = [...userSidebarNavEntries];
  if (accountRole === "owner") {
    const pricingIndex = items.findIndex((item) => item.label === "Plans and pricing");
    items.splice(pricingIndex >= 0 ? pricingIndex : items.length, 0, teamSidebarItem);
  }
  return items;
}

const APPLY_FILTER_LOADING_STEPS = [
  "Setting up your search",
  "Finalizing your filters",
  "Creating the search",
  "Setting up your personalized sourcing session",
  "Searching profiles",
] as const;

const DASHBOARD_SIDEBAR_COLLAPSED_KEY = "ejhunter_dashboard_sidebar_collapsed";

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
    open_to_cards?: string[];
    skills?: string[];
    current_employers_object?: {
      company_name?: string;
      job_title?: string;
      company_website?: string;
      company_website_domain?: string;
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

function buildCandidateRowRawDoc(candidate: CandidateRow): SessionResultDoc {
  const yearsMatch = candidate.experience.match(/(\d+)/);
  const years = yearsMatch ? Number(yearsMatch[1]) : undefined;
  const skills =
    candidate.skills && candidate.skills !== "—"
      ? candidate.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return {
    _id: candidate.id,
    sourcingSessionId: candidate.sourcingSessionId,
    finalScore: candidate.finalScore ?? undefined,
    profile: {
      name: candidate.name,
      region: candidate.location,
      linkedin_profile_url: candidate.linkedin_profile_url,
      years_of_experience_raw: Number.isFinite(years) ? years : undefined,
      skills,
      current_employers_object:
        candidate.role && candidate.role !== "—"
          ? [
              {
                job_title: candidate.role,
                company_name: candidate.currentCompany || undefined,
              },
            ]
          : undefined,
    },
    profileAnalysis: {
      recommendation: candidate.recommendation || undefined,
      highlights: Array.isArray(candidate.highlights)
        ? candidate.highlights.map((h) => ({ Highlight: h }))
        : undefined,
    },
  };
}

function mergeWorkspaceCandidatesWithDetailedDocs(
  candidates: CandidateRow[],
  detailedDocs: SessionResultDoc[]
): CandidateRow[] {
  const byId = new Map<string, SessionResultDoc>();
  const byLinkedIn = new Map<string, SessionResultDoc>();

  for (const doc of detailedDocs) {
    if (doc?._id) byId.set(String(doc._id), doc);
    const linkedin = doc.profile?.linkedin_profile_url?.trim();
    if (linkedin) byLinkedIn.set(linkedin, doc);
  }

  return candidates.map((candidate) => {
    if (candidate.rawDoc && typeof candidate.rawDoc === "object") {
      return candidate;
    }

    const id = String(candidate.id || "").trim();
    let doc = id ? byId.get(id) : undefined;
    if (!doc && candidate.linkedin_profile_url) {
      doc = byLinkedIn.get(candidate.linkedin_profile_url.trim());
    }

    const rawDoc = doc || buildCandidateRowRawDoc(candidate);
    return { ...candidate, rawDoc };
  });
}

function openCandidateProfileDetail(
  candidate: CandidateRow,
  openDetail: (doc: SessionResultDoc, candidate: CandidateRow) => void
) {
  const doc =
    candidate.rawDoc && typeof candidate.rawDoc === "object"
      ? (candidate.rawDoc as SessionResultDoc)
      : buildCandidateRowRawDoc(candidate);
  openDetail(doc, { ...candidate, rawDoc: doc });
}

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

function sessionResultDocSelectionKey(
  doc: SessionResultDoc,
  idx: number,
  candidateKey: string
): string {
  const id = typeof doc._id === "string" ? doc._id.trim() : "";
  return id || `session-doc-${idx}-${candidateKey}`;
}

/** Keep selections valid when profile docs gain _id or list order changes. */
function reconcileSessionResultSelectionKeys(
  docs: SessionResultDoc[],
  selectedKeys: string[],
  sessionId: string | null
): string[] {
  if (selectedKeys.length === 0 || docs.length === 0) return selectedKeys;

  const byIdentity = new Map<string, string>();
  const byDocId = new Map<string, string>();
  const currentKeys = new Set<string>();

  for (let idx = 0; idx < docs.length; idx += 1) {
    const doc = docs[idx];
    const row = sessionDocToCandidateRow(doc, idx, sessionId);
    const identityKey = candidateIdentityKey(row);
    const selectionKey = sessionResultDocSelectionKey(doc, idx, identityKey);
    byIdentity.set(identityKey, selectionKey);
    currentKeys.add(selectionKey);
    const docId = typeof doc._id === "string" ? doc._id.trim() : "";
    if (docId) byDocId.set(docId, selectionKey);
  }

  const next = new Set<string>();
  for (const oldKey of selectedKeys) {
    if (currentKeys.has(oldKey)) {
      next.add(oldKey);
      continue;
    }
    const legacy = oldKey.match(/^session-doc-\d+-(.+)$/);
    if (legacy) {
      const mapped = byIdentity.get(legacy[1]);
      if (mapped) {
        next.add(mapped);
        continue;
      }
    }
    if (
      oldKey.startsWith("id:") ||
      oldKey.startsWith("li:") ||
      oldKey.startsWith("name:")
    ) {
      const mapped = byIdentity.get(oldKey);
      if (mapped) {
        next.add(mapped);
        continue;
      }
    }
    const mapped = byDocId.get(oldKey);
    if (mapped) next.add(mapped);
  }

  const result = [...next];
  if (
    result.length === selectedKeys.length &&
    result.every((key) => selectedKeys.includes(key))
  ) {
    return selectedKeys;
  }
  return result;
}

function isSessionResultRowSelected(
  selectedKeys: string[],
  selectionKey: string,
  identityKey: string,
  docId: string
): boolean {
  if (selectedKeys.includes(selectionKey)) return true;
  if (docId && selectedKeys.includes(docId)) return true;
  if (selectedKeys.includes(identityKey)) return true;
  for (const key of selectedKeys) {
    const legacy = key.match(/^session-doc-\d+-(.+)$/);
    if (legacy && legacy[1] === identityKey) return true;
  }
  return false;
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
  canFetchMore: boolean;
  sessionId: string | null;
  sourcingStatus: string | null;
  profilesFetchError: string | null;
};

type RecentSearchItem = RecentAiSearchItem;

type SaveListRow = {
  id: string;
  name: string;
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
  employer_company_website_domain?: string[] | string;
  employer_company_website?: string;
  domains?: string[];
};

function scoutEmployerDomain(e: FjScoutEmployer): string {
  const fromListed = e.employer_company_website_domain;
  if (Array.isArray(fromListed) && fromListed[0]) {
    return String(fromListed[0]).trim();
  }
  if (typeof fromListed === "string" && fromListed.trim()) {
    return fromListed.trim();
  }
  if (Array.isArray(e.domains) && e.domains[0]) {
    return String(e.domains[0]).trim();
  }
  return "";
}

function scoutEmployerWebsite(e: FjScoutEmployer): string {
  const site =
    typeof e.employer_company_website === "string" ? e.employer_company_website.trim() : "";
  if (site) return site;
  const domain = scoutEmployerDomain(e);
  return domain ? `https://${domain}` : "";
}

function scoutCompanyMetaFromProfile(profile: unknown): {
  companyWebsiteDomain?: string;
  companyWebsite?: string;
} {
  if (!profile || typeof profile !== "object") return {};
  const current = Array.isArray((profile as { current_employers?: FjScoutEmployer[] }).current_employers)
    ? (profile as { current_employers: FjScoutEmployer[] }).current_employers[0]
    : null;
  if (!current) return {};
  const companyWebsiteDomain = scoutEmployerDomain(current);
  const companyWebsite = scoutEmployerWebsite(current);
  return {
    companyWebsiteDomain: companyWebsiteDomain || undefined,
    companyWebsite: companyWebsite || undefined,
  };
}

function mapScoutEmployerToExperience(e: FjScoutEmployer) {
  return {
    title: typeof e.employee_title === "string" ? e.employee_title : "",
    company: typeof e.employer_name === "string" ? e.employer_name : "",
    duration: formatScoutEmploymentRange(e.start_date, e.end_date),
    location: typeof e.employee_location === "string" ? e.employee_location : "",
    description: typeof e.employee_description === "string" ? e.employee_description : "",
    companyWebsiteDomain: scoutEmployerDomain(e) || undefined,
    companyWebsite: scoutEmployerWebsite(e) || undefined,
  };
}

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
    experiences.push(mapScoutEmployerToExperience(e));
  }

  const currentEmployer = current[0];
  const currentCompanyDomain = currentEmployer ? scoutEmployerDomain(currentEmployer) : "";
  const currentCompanyWebsite = currentEmployer ? scoutEmployerWebsite(currentEmployer) : "";

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
      currentEmployer && typeof currentEmployer.employer_name === "string"
        ? currentEmployer.employer_name
        : "",
    currentCompanyWebsiteDomain: currentCompanyDomain || undefined,
    currentCompanyWebsite: currentCompanyWebsite || undefined,
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
  profilePhotoUrl: "",
};

function sidebarProfileIcon(fullName: string, profilePhotoUrl: string) {
  const photoSrc = resolveProfilePhotoUrl(profilePhotoUrl);
  if (photoSrc) {
    return (
      <span className="dashboard-sidebar-profile-avatar dashboard-sidebar-profile-avatar--photo">
        <img src={photoSrc} alt="" />
      </span>
    );
  }
  return (
    <span className="dashboard-sidebar-profile-avatar">
      {peopleScoutNameInitials(fullName || "?").slice(0, 2)}
    </span>
  );
}

function persistAuthProfilePhoto(profilePhotoUrl: string) {
  const auth = getStoredAuth();
  if (!auth) return;
  localStorage.setItem(
    "authUser",
    JSON.stringify({
      ...auth,
      profilePhotoUrl,
    })
  );
}

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
    companyWebsiteDomain: current?.company_website_domain,
    companyWebsite: current?.company_website,
    openToWork: isOpenToWork(doc.profile?.open_to_cards),
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

export default function UserDashboardPage() {
  const router = useRouter();
  const routeParams = useParams();
  const urlSearchParams = useSearchParams();

  const segments = useMemo(() => {
    const raw = routeParams?.segments;
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") return [raw];
    return [];
  }, [routeParams?.segments]);

  const {
    tab: tabFromRoute,
    sessionId: routeSessionId = "",
    campaignId: routeCampaignId = "",
    campaignWorkspaceTab = "Editor",
    campaignReportMetric = null,
    campaignWhatsAppContactKey = "",
  } = useMemo(() => tabFromPathSegments(segments), [segments]);

  const userActionAlert = useUserActionAlert();
  const showRevealContactNotice = (message: string) => {
    const trimmed = message.trim();
    if (trimmed) setRevealContactNotice(trimmed);
  };
  const clearRevealContactNotice = () => setRevealContactNotice("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [peopleScoutQuery, setPeopleScoutQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>(tabFromRoute);

  useEffect(() => {
    setActiveTab(tabFromRoute);
  }, [tabFromRoute]);

  const [accountRole, setAccountRole] = useState<"owner" | "member" | null>(null);
  const [accountBlocked, setAccountBlocked] = useState(false);
  const [searchedCandidates, setSearchedCandidates] = useState<CandidateRow[]>(
    []
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [revealedEmail, setRevealedEmail] = useState<string[]>([]);
  const [revealedPhone, setRevealedPhone] = useState<string[]>([]);
  const [revealContactBusyKeys, setRevealContactBusyKeys] = useState<string[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [engagementsNavExpanded, setEngagementsNavExpanded] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [revealContactNotice, setRevealContactNotice] = useState("");
  const [searchSummary, setSearchSummary] = useState<SearchSummaryState | null>(
    null
  );
  const [sessionResultDocs, setSessionResultDocs] = useState<SessionResultDoc[]>([]);
  const [selectedSessionDetailDoc, setSelectedSessionDetailDoc] =
    useState<SessionResultDoc | null>(null);
  const [selectedSessionDetailCandidate, setSelectedSessionDetailCandidate] =
    useState<CandidateRow | null>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionDetailError, setSessionDetailError] = useState("");
  const [isSessionCandidateDrawerOpen, setIsSessionCandidateDrawerOpen] =
    useState(false);
  const [sessionResultError, setSessionResultError] = useState("");
  const [sessionResultPage, setSessionResultPage] = useState(1);
  const [sessionResultTotalPages, setSessionResultTotalPages] = useState<number | null>(
    null
  );
  const [sessionResultHasNext, setSessionResultHasNext] = useState(false);
  const [sessionResultLoadingMore, setSessionResultLoadingMore] = useState(false);
  const [sessionCanFetchMore, setSessionCanFetchMore] = useState(false);
  const [sessionFetchMoreLoading, setSessionFetchMoreLoading] = useState(false);
  const [dashboardToast, setDashboardToast] = useState<{
    message: string;
    variant: DashboardToastVariant;
  } | null>(null);
  const [sessionResultSelectedKeys, setSessionResultSelectedKeys] = useState<string[]>([]);
  const [addToCampaignOpen, setAddToCampaignOpen] = useState(false);
  const [sessionResultNotice, setSessionResultNotice] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsTotal, setCampaignsTotal] = useState(0);
  const [campaignsTotalPages, setCampaignsTotalPages] = useState(1);
  const [campaignsSummary, setCampaignsSummary] = useState({
    total: 0,
    active: 0,
    contacts: 0,
  });
  const [addToCampaignBusy, setAddToCampaignBusy] = useState(false);
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

  useEffect(() => {
    if (urlSearchParams.get("filters") === "1") {
      setIsFilterDrawerOpen(true);
    }
    if (urlSearchParams.get("addToCampaign") === "1") {
      setAddToCampaignOpen(true);
    }
  }, [urlSearchParams]);

  const navigateToTab = useCallback(
    (
      tab: string,
      options?: {
        sessionId?: string;
        campaignId?: string;
        campaignWorkspaceTab?: CampaignWorkspaceTab;
        replace?: boolean;
      }
    ) => {
      const tabKey = tabKeyFromSidebarLabel(tab) as DashboardTabKey;
      const sid =
        options?.sessionId?.trim() ||
        (tabKey === "Session Results" ? searchSummary?.sessionId?.trim() : "") ||
        "";
      const campaignId = options?.campaignId?.trim() || "";
      const path = pathForDashboardTab(tabKey, {
        ...(sid ? { sessionId: sid } : {}),
        ...(tabKey === "Campaigns" && campaignId
          ? {
              campaignId,
              campaignWorkspaceTab: options?.campaignWorkspaceTab ?? "Editor",
            }
          : {}),
      });
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
      setActiveTab(tabKey);
    },
    [router, searchSummary?.sessionId]
  );
  const [filterSearchPrompt, setFilterSearchPrompt] = useState("");
  const [pendingSearchSessionId, setPendingSearchSessionId] = useState<string | null>(null);
  const [pendingSessionPayload, setPendingSessionPayload] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [applyFiltersLoading, setApplyFiltersLoading] = useState(false);
  const [applySessionChoiceOpen, setApplySessionChoiceOpen] = useState(false);
  const [annotateLoading, setAnnotateLoading] = useState(false);
  const [filterFormRestoreLoading, setFilterFormRestoreLoading] = useState(false);
  const [filterSkillsError, setFilterSkillsError] = useState("");
  const [applyStatusStepIndex, setApplyStatusStepIndex] = useState(0);
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
  const [sourcingSessionsHydrated, setSourcingSessionsHydrated] = useState(false);
  const [sourcingSessionsError, setSourcingSessionsError] = useState("");
  const [workspaceCandidates, setWorkspaceCandidates] = useState<CandidateRow[]>([]);
  const [workspaceCandidatesPage, setWorkspaceCandidatesPage] = useState(1);
  const [workspaceCandidatesTotalDocs, setWorkspaceCandidatesTotalDocs] = useState(0);
  const [workspaceCandidatesTotalPages, setWorkspaceCandidatesTotalPages] = useState(1);
  const [workspaceCandidatesLoading, setWorkspaceCandidatesLoading] = useState(false);
  const [workspaceCandidatesError, setWorkspaceCandidatesError] = useState("");
  const [workspaceCandidatesRefresh, setWorkspaceCandidatesRefresh] = useState(0);
  const [workspaceSessionFilter, setWorkspaceSessionFilter] = useState("__all__");
  const [workspaceSearchInput, setWorkspaceSearchInput] = useState("");
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [workspaceCandidatesTotalAllDocs, setWorkspaceCandidatesTotalAllDocs] = useState(0);
  const [workspaceCandidatesTotalInScope, setWorkspaceCandidatesTotalInScope] = useState(0);
  const WORKSPACE_CANDIDATES_LIMIT = 12;
  const [revealedContactValues, setRevealedContactValues] = useState<
    Record<string, { email?: string; phone?: string }>
  >({});
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [recentSearchesLoading, setRecentSearchesLoading] = useState(false);
  const [recentSearchesRefresh, setRecentSearchesRefresh] = useState(0);
  const [sourcingSessionsRefresh, setSourcingSessionsRefresh] = useState(0);
  const [highlightSessionId, setHighlightSessionId] = useState("");
  const [openingHistorySessionId, setOpeningHistorySessionId] = useState<string | null>(
    null
  );
  const [peopleScoutLoading, setPeopleScoutLoading] = useState(false);
  const [peopleScoutError, setPeopleScoutError] = useState("");
  const [peopleScoutRecentList, setPeopleScoutRecentList] = useState<PeopleScoutRecentUser[]>([]);
  const [peopleScoutRecentLoading, setPeopleScoutRecentLoading] = useState(false);
  const [userPricingPlans, setUserPricingPlans] = useState<PricingPlansPayload | null>(null);
  const [userPricingPlansLoading, setUserPricingPlansLoading] = useState(false);
  const [userPricingPlansReady, setUserPricingPlansReady] = useState(false);
  const [planUtilisation, setPlanUtilisation] = useState<UserUtilisationStats>(() => ({
    candidateSearches: 0,
    emailUnveils: 0,
    candidateUnveils: 0,
    mobileUnveils: 0,
    linkedinLookups: 0,
  }));
  const [planOutreachThreads, setPlanOutreachThreads] = useState<OutreachThreadStats>({
    email: 0,
    whatsapp: 0,
  });
  const [userPlanId, setUserPlanId] = useState("trial");
  const [userPlanName, setUserPlanName] = useState("Trial");
  const [userPlanReady, setUserPlanReady] = useState(false);
  const [utilisationHistory, setUtilisationHistory] = useState<UtilisationHistoryRow[]>([]);
  const [utilisationHistoryLoading, setUtilisationHistoryLoading] = useState(false);
  const [utilisationHistoryPage, setUtilisationHistoryPage] = useState(1);
  const [utilisationHistoryTotalDocs, setUtilisationHistoryTotalDocs] = useState(0);
  const [utilisationHistoryTotalPages, setUtilisationHistoryTotalPages] = useState(1);
  const [planPaymentSuccessToast, setPlanPaymentSuccessToast] = useState<string | null>(null);
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverviewData | null>(
    null
  );
  const [dashboardOverviewLoading, setDashboardOverviewLoading] = useState(true);
  const [dashboardOverviewError, setDashboardOverviewError] = useState("");
  const [peopleScoutProfile, setPeopleScoutProfile] = useState<PeopleScoutProfile | null>(
    null
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [myProfileForm, setMyProfileForm] = useState<MyProfileFormState>(emptyMyProfileForm);
  const [myProfileLoading, setMyProfileLoading] = useState(false);
  const [myProfileSaving, setMyProfileSaving] = useState(false);
  const [myProfilePhotoUploading, setMyProfilePhotoUploading] = useState(false);
  const [myProfileError, setMyProfileError] = useState("");
  const [myProfileSuccess, setMyProfileSuccess] = useState("");
  const [myProfileAccountRole, setMyProfileAccountRole] = useState<string | null>(null);
  const [myProfileWorkspaceOwner, setMyProfileWorkspaceOwner] =
    useState<MyProfileWorkspaceOwner | null>(null);
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
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (isBlockedAccountResponse(res, data)) {
          setAccountBlocked(true);
          return null;
        }
        return { data, status: res.status, ok: res.ok };
      })
      .then((result) => {
        if (!result) return;
        const { data, status, ok } = result;
        if (!ok || !data.success) {
          const err = new Error(
            typeof data.message === "string" ? data.message : "Failed to load dashboard"
          );
          (err as Error & { statusCode?: number }).statusCode = status;
          throw err;
        }
        const parsed = parseDashboardOverviewPayload(data);
        if (!parsed) {
          throw new Error("Invalid dashboard response");
        }
        setDashboardOverview(parsed);
        setUserPlanId(parsed.plan.planId);
        setUserPlanName(parsed.plan.planName);
        setPlanOutreachThreads(parsed.outreachThreads);
        setUserPlanReady(true);
      })
      .catch((err) => {
        const statusCode =
          typeof (err as { statusCode?: unknown })?.statusCode === "number"
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        const msg = err instanceof Error ? err.message : "Could not load dashboard";
        const authExpired = statusCode === 401;
        if (authExpired) {
          try {
            window.localStorage.removeItem("authUser");
          } catch {
            /* ignore */
          }
          router.replace("/login");
          return;
        }
        setDashboardOverview(null);
        setDashboardOverviewError(msg);
      })
      .finally(() => {
        setDashboardOverviewLoading(false);
      });
  }, [activeTab, router]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setUserPlanReady(true);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    fetch(`${apiBase}/api/users/me`, { headers: authHeaders(auth.token) })
      .then((res) => res.json())
      .then((data) => {
        const snapshot = parsePlanFromMeResponse(data);
        if (snapshot) {
          setUserPlanId(snapshot.planId);
          setUserPlanName(snapshot.planName);
          if (snapshot.utilisation) setPlanUtilisation(snapshot.utilisation);
          if (snapshot.outreachThreads) setPlanOutreachThreads(snapshot.outreachThreads);
        }
        setUserPlanReady(true);
      })
      .catch(() => {
        setUserPlanReady(true);
      });
  }, []);

  const loadCampaignsList = useCallback(async (opts?: { page?: number }) => {
    const auth = getStoredAuth();
    const planAccessOpts = { plansReady: userPricingPlansReady };
    if (
      !auth?.token ||
      (userPricingPlansReady &&
        !hasCampaignsAccess(userPlanId, userPricingPlans, planAccessOpts))
    ) {
      setCampaigns([]);
      setCampaignsLoading(false);
      setCampaignsPage(1);
      setCampaignsTotal(0);
      setCampaignsTotalPages(1);
      setCampaignsSummary({ total: 0, active: 0, contacts: 0 });
      return;
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    setCampaignsLoading(true);
    try {
      const result = await fetchCampaignsPage(auth.token, { page });
      setCampaigns(result.campaigns);
      setCampaignsPage(result.pagination.page);
      setCampaignsTotal(result.pagination.total);
      setCampaignsTotalPages(result.pagination.totalPages);
      setCampaignsSummary(result.summary);
    } catch {
      /* keep previous list */
    } finally {
      setCampaignsLoading(false);
    }
  }, [userPlanId, userPricingPlans, userPricingPlansReady]);

  const planAccessOpts = useMemo(
    () => ({ plansReady: userPricingPlansReady }),
    [userPricingPlansReady]
  );

  const handleCampaignsPageChange = useCallback(
    (page: number) => {
      if (campaignsLoading) return;
      const next = Math.max(1, Math.min(campaignsTotalPages, page));
      if (next === campaignsPage) return;
      void loadCampaignsList({ page: next });
    },
    [campaignsLoading, campaignsPage, campaignsTotalPages, loadCampaignsList]
  );

  useEffect(() => {
    if (!hasCampaignsAccess(userPlanId, userPricingPlans, planAccessOpts)) return;
    void loadCampaignsList({ page: 1 });
  }, [userPlanId, userPricingPlans, userPricingPlansReady, planAccessOpts, loadCampaignsList]);

  useEffect(() => {
    if (!hasCampaignsAccess(userPlanId, userPricingPlans, planAccessOpts)) return;
    if (activeTab !== "Campaigns" && !addToCampaignOpen && !routeCampaignId) return;
    setCampaignsLoading(true);
    void loadCampaignsList({ page: 1 });
  }, [
    activeTab,
    addToCampaignOpen,
    userPlanId,
    userPricingPlans,
    userPricingPlansReady,
    planAccessOpts,
    loadCampaignsList,
    routeCampaignId,
  ]);

  useEffect(() => {
    if (activeTab !== "Saved" && activeTab !== "Session Results" && activeTab !== "Candidates") return;
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
    if (
      !auth.onboardingCompleted &&
      auth.role !== "admin" &&
      auth.accountRole !== "member"
    ) {
      router.replace("/onboarding");
      return;
    }
    setAccountRole(
      auth.accountRole === "owner" || auth.accountRole === "member"
        ? auth.accountRole
        : null
    );
    if (isBlockedMemberStatus(auth.memberStatus)) {
      setAccountBlocked(true);
    }
    setShowAdminLink(auth.role === "admin");

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    fetch(`${apiBase}/api/users/me`, { headers: authHeaders(auth.token) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (isBlockedAccountResponse(res, data)) {
          setAccountBlocked(true);
          return null;
        }
        return data;
      })
      .then((data) => {
        if (!data) return;
        if (data?.success && data.user) {
          if (isBlockedMemberStatus(data.user.memberStatus)) {
            setAccountBlocked(true);
          }
          const role =
            data.user.accountRole === "owner" || data.user.accountRole === "member"
              ? data.user.accountRole
              : null;
          setAccountRole(role);
          mergeStoredAuthUser({
            accountRole: role,
            organizationId:
              typeof data.user.organizationId === "string"
                ? data.user.organizationId
                : null,
            ownerUserId:
              typeof data.user.ownerUserId === "string" ? data.user.ownerUserId : null,
            memberStatus:
              typeof data.user.memberStatus === "string" ? data.user.memberStatus : undefined,
          });
        }
      })
      .catch(() => {});
    setMyProfileForm((prev) => ({
      ...prev,
      fullName: auth.fullName || "",
      companyName: auth.companyName || "",
      email: auth.email || "",
      phone: auth.mobile || "",
      location: auth.location || "",
      role: auth.role === "admin" ? "Admin" : "User",
      profilePhotoUrl:
        typeof auth.profilePhotoUrl === "string" ? auth.profilePhotoUrl : "",
    }));
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
        setMyProfileAccountRole(
          typeof data.user.accountRole === "string" ? data.user.accountRole : null
        );
        setMyProfileWorkspaceOwner(parseWorkspaceOwner(data.workspaceOwner));
        setMyProfileForm({
          fullName: typeof data.user.fullName === "string" ? data.user.fullName : "",
          companyName:
            typeof data.user.companyName === "string" ? data.user.companyName : "",
          email: typeof data.user.email === "string" ? data.user.email : "",
          phone: typeof data.user.mobile === "string" ? data.user.mobile : "",
          location: typeof data.user.location === "string" ? data.user.location : "",
          role: data.user.role === "admin" ? "Admin" : "User",
          profilePhotoUrl:
            typeof data.user.profilePhotoUrl === "string" ? data.user.profilePhotoUrl : "",
        });
        persistAuthProfilePhoto(
          typeof data.user.profilePhotoUrl === "string" ? data.user.profilePhotoUrl : ""
        );
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
    const onHistoryTab =
      activeTab === "Search history" || activeTab === "Candidates";
    if (!onHistoryTab) return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      setSourcingSessionsHydrated(true);
      return;
    }
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
        setSourcingSessionsHydrated(true);
        setSourcingSessionsLoading(false);
      });
  }, [activeTab, sourcingSessionsRefresh]);

  useEffect(() => {
    if (activeTab !== "Search Candidates") return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setRecentSearchesLoading(true);

    fetch(`${apiBase}/api/candidates/recent-searches?limit=6`, {
      headers: authHeaders(auth.token),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !Array.isArray(data.searches)) {
          throw new Error("Failed to load recent searches");
        }
        const list = data.searches
          .map(
            (s: {
              id?: unknown;
              futureJobsSessionId?: unknown;
              text?: unknown;
              totalDocs?: unknown;
              createdAt?: unknown;
            }) => ({
              id: typeof s.id === "string" ? s.id : "",
              futureJobsSessionId:
                typeof s.futureJobsSessionId === "string" ? s.futureJobsSessionId.trim() : "",
              text: typeof s.text === "string" ? s.text.trim() : "",
              totalDocs: typeof s.totalDocs === "number" ? s.totalDocs : null,
              createdAt: typeof s.createdAt === "string" ? s.createdAt : undefined,
            })
          )
          .filter((x: RecentSearchItem) => x.id && x.text);
        setRecentSearches(list);
      })
      .catch(() => {
        setRecentSearches([]);
      })
      .finally(() => {
        setRecentSearchesLoading(false);
      });
  }, [activeTab, recentSearchesRefresh]);

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
              companyWebsiteDomain?: unknown;
              companyWebsite?: unknown;
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
              companyWebsiteDomain:
                typeof row.companyWebsiteDomain === "string" && row.companyWebsiteDomain.trim()
                  ? row.companyWebsiteDomain.trim()
                  : scoutCompanyMetaFromProfile(row.profile).companyWebsiteDomain,
              companyWebsite:
                typeof row.companyWebsite === "string" && row.companyWebsite.trim()
                  ? row.companyWebsite.trim()
                  : scoutCompanyMetaFromProfile(row.profile).companyWebsite,
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

  const reloadUserPlanSnapshot = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const auth = getStoredAuth();
    if (!auth?.token) return;
    try {
      const res = await fetch(`${apiBase}/api/users/me`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      const snapshot = parsePlanFromMeResponse(data);
      if (snapshot) {
        setUserPlanId(snapshot.planId);
        setUserPlanName(snapshot.planName);
        if (snapshot.utilisation) setPlanUtilisation(snapshot.utilisation);
      }
      setUserPlanReady(true);
    } catch {
      /* keep prior snapshot */
    }
  }, []);

  const handlePlanPaymentSuccess = useCallback(
    (message: string) => {
      setPlanPaymentSuccessToast(message);
      void reloadUserPlanSnapshot();
    },
    [reloadUserPlanSnapshot]
  );

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    let cancelled = false;
    fetch(`${apiBase}/api/pricing-plans`)
      .then((r) => r.json())
      .then((data: { success?: boolean; plans?: unknown }) => {
        if (cancelled) return;
        if (data.success && data.plans) {
          setUserPricingPlans(parsePricingPlansFromApi(data.plans));
        } else {
          setUserPricingPlans(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUserPricingPlans(null);
      })
      .finally(() => {
        if (!cancelled) setUserPricingPlansReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "Plans and pricing" && activeTab !== "Dashboard") return;
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
          const snapshot = parsePlanFromMeResponse(meResult.value);
          if (snapshot) {
            setUserPlanId(snapshot.planId);
            setUserPlanName(snapshot.planName);
            if (snapshot.utilisation) setPlanUtilisation(snapshot.utilisation);
            if (snapshot.outreachThreads) setPlanOutreachThreads(snapshot.outreachThreads);
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
    if (
      activeTab === "Campaigns" ||
      activeTab === "Integrations"
    ) {
      setEngagementsNavExpanded(true);
    }
  }, [activeTab]);

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

  const handleWorkspaceSessionFilterChange = (value: string) => {
    setWorkspaceSessionFilter(value);
    setWorkspaceCandidatesPage(1);
  };

  const loadWorkspaceCandidates = async (
    page: number,
    sessionFilter: string,
    searchQuery: string
  ) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setWorkspaceCandidates([]);
      setWorkspaceCandidatesError("Please sign in again.");
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setWorkspaceCandidatesLoading(true);
    setWorkspaceCandidatesError("");
    setWorkspaceCandidates([]);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(WORKSPACE_CANDIDATES_LIMIT),
      });
      if (sessionFilter !== "__all__") {
        params.set("sessionId", sessionFilter);
      }
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        params.set("q", trimmedSearch);
      }
      const url = `${apiBase}/api/candidates/all?${params.toString()}`;
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
      const detailedDocs = Array.isArray(data.detailedDocs)
        ? (data.detailedDocs as SessionResultDoc[])
        : [];
      setWorkspaceCandidates(mergeWorkspaceCandidatesWithDetailedDocs(list, detailedDocs));
      const pg = data.profilesPagination as
        | {
            totalDocs?: number;
            totalPages?: number;
            page?: number;
          }
        | undefined;
      const totalDocs =
        typeof pg?.totalDocs === "number" ? pg.totalDocs : list.length;
      const totalInScope =
        typeof data.totalInScope === "number" ? data.totalInScope : totalDocs;
      setWorkspaceCandidatesTotalDocs(totalDocs);
      setWorkspaceCandidatesTotalInScope(totalInScope);
      if (!trimmedSearch) {
        if (sessionFilter === "__all__") {
          setWorkspaceCandidatesTotalAllDocs(totalDocs);
        }
      }
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
    const timer = window.setTimeout(() => {
      setWorkspaceSearchQuery(workspaceSearchInput.trim());
      setWorkspaceCandidatesPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [workspaceSearchInput, activeTab]);

  useEffect(() => {
    if (activeTab !== "Candidates") return;
    void loadWorkspaceCandidates(
      workspaceCandidatesPage,
      workspaceSessionFilter,
      workspaceSearchQuery
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when search completes
  }, [
    activeTab,
    workspaceCandidatesPage,
    workspaceSessionFilter,
    workspaceSearchQuery,
    workspaceCandidatesRefresh,
  ]);

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
    navigateToTab("Search history");
  };

  const openRecentAiSearch = (item: RecentSearchItem) => {
    if (item.futureJobsSessionId) {
      const cached = sourcingSessions.find(
        (s) => s.futureJobsSessionId.trim() === item.futureJobsSessionId.trim()
      );
      void openSessionFromHistory(
        {
          id: item.id,
          futureJobsSessionId: item.futureJobsSessionId,
          prompt: item.text || cached?.prompt || "",
          sessionTitle: cached?.sessionTitle || "",
          usingSessionOverride: false,
          futureJobsStatus: cached?.futureJobsStatus || "",
          totalDocs: item.totalDocs ?? cached?.totalDocs ?? null,
          candidateCountFirstPage: cached?.candidateCountFirstPage ?? 0,
          candidatePreview: cached?.candidatePreview ?? [],
          profilesFetchError: cached?.profilesFetchError ?? null,
          filterForm: cached?.filterForm ?? null,
          createdAt: item.createdAt || cached?.createdAt || "",
          updatedAt: item.createdAt || cached?.updatedAt || "",
        },
        "Search Candidates"
      );
      return;
    }
    goToSearchHistory(item);
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
        if (
          userActionAlert.fromApi(
            res,
            data,
            res.status === 404 ? "Candidate not found" : "People Scout lookup failed"
          )
        ) {
          return;
        }
        throw new Error(
          userActionAlert.apiMessage(
            res,
            data,
            res.status === 404 ? "Candidate not found" : "People Scout lookup failed"
          )
        );
      }
      const fjRoot = data.futureJobs as
        | { data?: { profile?: FjScoutProfile }; profile?: FjScoutProfile }
        | undefined;
      const fjProfile = fjRoot?.data?.profile ?? fjRoot?.profile;
      setPeopleScoutProfile(mapFjProfileToPeopleScoutProfile(fjProfile));
      setPeopleScoutLookupId(typeof data.lookupId === "string" ? data.lookupId : null);
      clearRevealContactNotice();
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
                companyWebsiteDomain?: unknown;
                companyWebsite?: unknown;
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
                companyWebsiteDomain:
                  typeof row.companyWebsiteDomain === "string" &&
                  row.companyWebsiteDomain.trim()
                    ? row.companyWebsiteDomain.trim()
                    : scoutCompanyMetaFromProfile(row.profile).companyWebsiteDomain,
                companyWebsite:
                  typeof row.companyWebsite === "string" && row.companyWebsite.trim()
                    ? row.companyWebsite.trim()
                    : scoutCompanyMetaFromProfile(row.profile).companyWebsite,
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
      if (userActionAlert.fromThrown(err)) return;
      setPeopleScoutError(err instanceof Error ? err.message : "People Scout lookup failed");
    } finally {
      setPeopleScoutLoading(false);
    }
  };

  const openPeopleScoutDetails = (user: PeopleScoutRecentUser) => {
    clearRevealContactNotice();
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

  const revealPeopleScoutContactFromApi = async (revealType: RevealContactType) => {
    if (
      (revealType === "EMAIL" && peopleScoutRevealEmailBusy) ||
      (revealType === "PHONE" && peopleScoutRevealPhoneBusy)
    ) {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      showRevealContactNotice("Please sign in again to reveal contacts.");
      return;
    }
    if (!peopleScoutLookupId?.trim()) {
      showRevealContactNotice(
        "Cannot reveal contact for this profile. Run a People Scout search from this tab first."
      );
      return;
    }
    const busySetter =
      revealType === "EMAIL" ? setPeopleScoutRevealEmailBusy : setPeopleScoutRevealPhoneBusy;
    busySetter(true);
    clearRevealContactNotice();
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
        if (
          userActionAlert.fromApi(
            res,
            data,
            revealContactNotFoundMessage(revealType)
          )
        ) {
          return;
        }
        throw new Error(
          revealContactErrorMessage(
            revealType,
            userActionAlert.apiMessage(res, data, revealContactNotFoundMessage(revealType))
          )
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
      if (!raw) {
        showRevealContactNotice(
          revealContactErrorMessage(revealType, upstreamMsg || data.message)
        );
        return;
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
      if (userActionAlert.fromThrown(err)) return;
      showRevealContactNotice(
        err instanceof Error
          ? revealContactErrorMessage(revealType, err.message)
          : revealContactNotFoundMessage(revealType)
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
      profilePhotoUrl:
        typeof auth?.profilePhotoUrl === "string" ? auth.profilePhotoUrl : "",
    });
    setIsEditingProfile(false);
  };

  const onUploadMyProfilePhoto = async (file: File) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setMyProfileError("Please sign in again to update profile photo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMyProfileError("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMyProfileError("Profile photo must be 2 MB or smaller.");
      return;
    }

    setMyProfileError("");
    setMyProfileSuccess("");
    setMyProfilePhotoUploading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const body = new FormData();
      body.append("photo", file);
      const res = await fetch(`${apiBase}/api/users/me/photo`, {
        method: "POST",
        headers: authUploadHeaders(auth.token),
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.user) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to upload photo"
        );
      }
      const profilePhotoUrl =
        typeof data.user.profilePhotoUrl === "string" ? data.user.profilePhotoUrl : "";
      setMyProfileForm((prev) => ({ ...prev, profilePhotoUrl }));
      const updatedAuth = { ...auth, ...data.user, token: auth.token };
      localStorage.setItem("authUser", JSON.stringify(updatedAuth));
      setMyProfileSuccess("Profile photo updated.");
    } catch (err) {
      setMyProfileError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setMyProfilePhotoUploading(false);
    }
  };

  const onRemoveMyProfilePhoto = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setMyProfileError("Please sign in again to update profile photo.");
      return;
    }

    setMyProfileError("");
    setMyProfileSuccess("");
    setMyProfilePhotoUploading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${apiBase}/api/users/me/photo`, {
        method: "DELETE",
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.user) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to remove photo"
        );
      }
      setMyProfileForm((prev) => ({ ...prev, profilePhotoUrl: "" }));
      const updatedAuth = { ...auth, ...data.user, token: auth.token };
      localStorage.setItem("authUser", JSON.stringify(updatedAuth));
      setMyProfileSuccess("Profile photo removed.");
    } catch (err) {
      setMyProfileError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setMyProfilePhotoUploading(false);
    }
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
        profilePhotoUrl:
          typeof data.user.profilePhotoUrl === "string" ? data.user.profilePhotoUrl : "",
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

  const mergeSessionResultDocs = (
    prev: SessionResultDoc[],
    incoming: SessionResultDoc[],
    append: boolean
  ) => {
    if (!append || prev.length === 0) {
      return dedupeSessionResultDocs(incoming);
    }
    return dedupeSessionResultDocs([...prev, ...incoming]);
  };

  const syncSessionResultsSummary = (
    displayedCount: number,
    data: Record<string, unknown>,
    prevSummary: SearchSummaryState | null
  ) => {
    const sessionIdFromData =
      typeof data.sessionId === "string" ? data.sessionId.trim() : "";
    const warn =
      (typeof data.profilesFetchError === "string" && data.profilesFetchError) ||
      (typeof data.fetchMoreError === "string" && data.fetchMoreError
        ? `fetch-more: ${data.fetchMoreError}`
        : "");
    const canFetchMore = data.canFetchMore !== false;

    setSessionCanFetchMore(canFetchMore);
    setSearchSummary({
      candidateCount: displayedCount,
      totalDocs: displayedCount,
      page: 1,
      limit: typeof data.limit === "number" ? data.limit : prevSummary?.limit ?? 20,
      totalPages: 1,
      hasNextPage: false,
      canFetchMore,
      sessionId: sessionIdFromData || null,
      sourcingStatus:
        typeof (data.futureJobs as { status?: string } | undefined)?.status === "string"
          ? (data.futureJobs as { status: string }).status
          : prevSummary?.sourcingStatus ?? null,
      profilesFetchError: warn || prevSummary?.profilesFetchError || null,
    });
    if (warn) userActionAlert.showError(warn);
  };

  const applyFilterFormFromSession = (
    patch: Partial<CandidateFilterForm> | Record<string, unknown> | null | undefined,
    options?: { prompt?: string }
  ) => {
    const normalized = normalizeFilterForm(patch);
    if (normalized) {
      setCandidateFilterForm((prev) =>
        mergeFilterForm(DEFAULT_CANDIDATE_FILTER_FORM, mergeFilterForm(prev, normalized))
      );
    }
    const prompt = options?.prompt?.trim();
    if (prompt) {
      setFilterSearchPrompt(prompt);
      setAiPrompt(prompt);
    }
  };

  const restoreSessionFilterForm = async (sessionId: string) => {
    const sid = sessionId.trim();
    if (!sid) return;

    const cached = sourcingSessions.find((s) => s.futureJobsSessionId.trim() === sid);
    if (cached?.filterForm && typeof cached.filterForm === "object") {
      applyFilterFormFromSession(cached.filterForm, {
        prompt: cached.prompt || cached.sessionTitle,
      });
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setFilterFormRestoreLoading(true);
    try {
      const url = `${apiBase}/api/candidates/session/${encodeURIComponent(sid)}/stored-candidates?metaOnly=1`;
      const res = await fetch(url, { headers: authHeaders(auth.token) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return;
      applyFilterFormFromSession(
        data.filterForm && typeof data.filterForm === "object"
          ? (data.filterForm as Partial<CandidateFilterForm>)
          : null,
        {
          prompt:
            typeof data.prompt === "string"
              ? data.prompt
              : typeof data.sessionTitle === "string"
                ? data.sessionTitle
                : "",
        }
      );
    } catch {
      /* keep in-memory form if restore fails */
    } finally {
      setFilterFormRestoreLoading(false);
    }
  };

  const openEditFiltersDrawer = () => {
    const sessionId =
      searchSummary?.sessionId?.trim() || routeSessionId?.trim() || "";
    if (sessionId) {
      if (!(filterSearchPrompt || aiPrompt).trim()) {
        const cached = sourcingSessions.find(
          (s) => s.futureJobsSessionId.trim() === sessionId
        );
        if (cached?.prompt?.trim()) {
          setFilterSearchPrompt(cached.prompt.trim());
          setAiPrompt(cached.prompt.trim());
        }
      }
      void restoreSessionFilterForm(sessionId);
    }
    setIsFilterDrawerOpen(true);
  };

  const applySessionProfilesFromSearchResponse = (
    data: Record<string, unknown>,
    backTab: string,
    options?: { appendDocs?: boolean }
  ) => {
    const fjProfiles = data.futureJobsProfiles as
      | { data?: { docs?: SessionResultDoc[] } }
      | undefined;
    const incomingDocs = Array.isArray(fjProfiles?.data?.docs) ? fjProfiles.data.docs : [];
    const appendDocs = options?.appendDocs === true;

    const nextDocs = mergeSessionResultDocs(
      appendDocs ? sessionResultDocs : [],
      incomingDocs,
      appendDocs
    );
    setSessionResultDocs(nextDocs);
    setSessionResultsFromDb(false);
    setSessionResultPage(1);
    setSessionResultTotalPages(1);

    const list = Array.isArray(data.candidates)
      ? (data.candidates as CandidateRow[])
      : [];
    if (appendDocs) {
      setSearchedCandidates((prev) => {
        const seen = new Set(list.map((c) => candidateIdentityKey(c)).filter(Boolean));
        const merged = [...list];
        for (const c of prev) {
          const key = candidateIdentityKey(c);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(c);
        }
        return merged;
      });
    } else {
      setSearchedCandidates(list);
    }

    syncSessionResultsSummary(
      nextDocs.length,
      data,
      appendDocs ? searchSummary : null
    );
    applyFilterFormFromSession(
      data.filterForm && typeof data.filterForm === "object"
        ? (data.filterForm as Partial<CandidateFilterForm>)
        : null,
      {
        prompt: typeof data.prompt === "string" ? data.prompt : undefined,
      }
    );
    setHasSearched(true);
    setSessionResultsBackTab(backTab);
    const sessionIdFromData =
      typeof data.sessionId === "string" ? data.sessionId.trim() : "";
    navigateToTab("Session Results", {
      sessionId: sessionIdFromData || searchSummary?.sessionId || undefined,
    });
    setSessionResultError("");
    setWorkspaceCandidatesPage(1);
    setWorkspaceCandidatesRefresh((n) => n + 1);
  };

  const loadSessionProfilesFirstPage = async (
    sessionId: string,
    limit: number,
    token: string,
    backTab: string,
    options?: { appendDocs?: boolean }
  ) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const sid = encodeURIComponent(sessionId);
    const url = `${apiBase}/api/candidates/session/${sid}/profiles?page=1&limit=${limit}`;
    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      const err = new Error(
        userActionAlert.apiMessage(res, data, "Failed to load profiles")
      );
      if (isFutureJobsUpstreamApiError(res, data)) {
        (err as Error & { code?: string }).code = FUTURE_JOBS_UPSTREAM_ERROR_CODE;
      }
      throw err;
    }
    applySessionProfilesFromSearchResponse(data as Record<string, unknown>, backTab, options);
  };

  const sessionProfilesAutoLoadRef = useRef<string | null>(null);

  useEffect(() => {
    if (tabFromRoute !== "Session Results" || !routeSessionId) {
      sessionProfilesAutoLoadRef.current = null;
      return;
    }
    // History navigation hydrates via stored-candidates; avoid a parallel profiles fetch.
    if (sessionResultsFromDb) return;
    if (searchSummary?.sessionId === routeSessionId && sessionResultDocs.length > 0) {
      sessionProfilesAutoLoadRef.current = routeSessionId;
      return;
    }
    if (sessionProfilesAutoLoadRef.current === routeSessionId) return;

    const auth = getStoredAuth();
    if (!auth?.token) return;

    sessionProfilesAutoLoadRef.current = routeSessionId;
    setSearchLoading(true);

    void loadSessionProfilesFirstPage(routeSessionId, 20, auth.token, "Search history")
      .catch((err) => {
        sessionProfilesAutoLoadRef.current = null;
        if (userActionAlert.fromThrown(err)) return;
        setSessionResultError(
          err instanceof Error ? err.message : "Could not load session results"
        );
      })
      .finally(() => {
        setSearchLoading(false);
      });
  }, [tabFromRoute, routeSessionId, searchSummary?.sessionId, sessionResultsFromDb]);

  const handleSearch = async () => {
    if (annotateLoading || searchLoading || applyFiltersLoading) return;

    const prompt = aiPrompt.trim();
    setSessionResultError("");

    if (!prompt) {
      userActionAlert.showError("Enter a search prompt first.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again to search.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    setFilterSearchPrompt(prompt);
    setPendingSearchSessionId(null);
    setPendingSessionPayload(null);
    setSearchSummary(null);
    setSessionResultDocs([]);
    setAnnotateLoading(true);
    setFilterSkillsError("");
    setCandidateFilterForm(DEFAULT_CANDIDATE_FILTER_FORM);
    setIsFilterDrawerOpen(true);

    try {
      const res = await fetch(`${apiBase}/api/candidates/search/annotate`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          prompt,
          linkedin_profile_url: "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (userActionAlert.fromFutureJobsApi(res, data)) return;
        throw new Error(
          userActionAlert.apiMessage(res, data, "Could not analyze your prompt")
        );
      }
      if (data.filterForm && typeof data.filterForm === "object") {
        setCandidateFilterForm(
          mergeFilterForm(
            DEFAULT_CANDIDATE_FILTER_FORM,
            data.filterForm as Partial<CandidateFilterForm>
          )
        );
      }
    } catch (err) {
      if (userActionAlert.fromThrown(err)) return;
      userActionAlert.showError(
        err instanceof Error
          ? `${err.message}. You can set filters manually.`
          : "Could not prefill filters. You can set them manually."
      );
    } finally {
      setAnnotateLoading(false);
    }
  };

  const prepareForBrandNewSearchSession = (prompt: string) => {
    setSessionResultDocs([]);
    setSearchedCandidates([]);
    setSearchSummary(null);
    setSessionCanFetchMore(false);
    setSessionResultsFromDb(false);
    setSessionResultPage(1);
    setSessionResultTotalPages(1);
    setPendingSearchSessionId(null);
    setPendingSessionPayload(null);
    setSessionResultError("");
    setRevealedEmail([]);
    setRevealedPhone([]);
    setRevealedContactValues({});
    setSelectedSessionDetailDoc(null);
    setSelectedSessionDetailCandidate(null);
    setIsSessionCandidateDrawerOpen(false);
    setAiPrompt(prompt);
    setFilterSearchPrompt(prompt);
    setSessionResultsBackTab("Search history");
  };

  const requestApplySearchFilters = () => {
    if (applyFiltersLoading || searchLoading || annotateLoading) return;

    const prompt = (filterSearchPrompt || aiPrompt).trim();
    const keywordSkills = String(candidateFilterForm.keywordSkills || "").trim();
    if (!prompt) {
      userActionAlert.showError("Enter a search prompt first.");
      return;
    }
    if (!keywordSkills) {
      const message = "At least one skill is required.";
      setFilterSkillsError(message);
      userActionAlert.showError(message);
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again to search.");
      return;
    }

    const editingSessionResults =
      activeTab === "Session Results" && Boolean(searchSummary?.sessionId?.trim());

    if (editingSessionResults) {
      setApplySessionChoiceOpen(true);
      return;
    }

    void executeApplySearchFilters("new");
  };

  const executeApplySearchFilters = async (mode: ApplyFiltersSessionMode) => {
    if (applyFiltersLoading) return;

    const prompt = (filterSearchPrompt || aiPrompt).trim();
    const keywordSkills = String(candidateFilterForm.keywordSkills || "").trim();
    if (!prompt || !keywordSkills) return;

    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again to search.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const appendToExisting = mode === "existing";
    const isBrandNewSession = mode === "new";

    if (isBrandNewSession) {
      prepareForBrandNewSearchSession(prompt);
    }

    const backTab = appendToExisting
      ? sessionResultsBackTab
      : isBrandNewSession
        ? "Search history"
        : activeTab === "Session Results"
          ? sessionResultsBackTab
          : activeTab;
    const existingSessionId =
      appendToExisting && searchSummary?.sessionId?.trim()
        ? searchSummary.sessionId.trim()
        : "";

    setApplySessionChoiceOpen(false);
    setApplyFiltersLoading(true);
    setApplyStatusStepIndex(0);
    setFilterSkillsError("");
    setSessionResultError("");

    try {
      const res = await fetch(`${apiBase}/api/candidates/search/apply`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          prompt,
          filterForm: candidateFilterForm,
          page: 1,
          limit: searchSummary?.limit ?? 20,
          ...(existingSessionId ? { sessionId: existingSessionId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (userActionAlert.fromApi(res, data, "Failed to load candidates")) return;
        if (userActionAlert.fromFutureJobsApi(res, data)) return;
        userActionAlert.showError(
          userActionAlert.apiMessage(res, data, "Failed to load candidates")
        );
        return;
      }

      const sessionId =
        typeof data.sessionId === "string"
          ? data.sessionId
          : typeof data.futureJobs?.data?.session?._id === "string"
            ? data.futureJobs.data.session._id
            : null;

      if (!sessionId) {
        userActionAlert.showError("Search completed but no sourcing session was returned.");
        return;
      }

      if (typeof data.profilesFetchError === "string" && data.profilesFetchError) {
        if (data.profilesFetchError === FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE) {
          userActionAlert.showFutureJobsUpstream();
        } else {
          userActionAlert.showError(
            `Session created, but profiles could not be loaded: ${data.profilesFetchError}`
          );
        }
      }

      setPendingSearchSessionId(sessionId);
      if (data.sessionPayload && typeof data.sessionPayload === "object") {
        setPendingSessionPayload(data.sessionPayload as Record<string, unknown>);
      }
      if (data.filterForm && typeof data.filterForm === "object") {
        setCandidateFilterForm((prev) =>
          mergeFilterFormPreserveFilled(prev, data.filterForm as Partial<CandidateFilterForm>)
        );
      }

      const docsFromApply = Array.isArray(
        (data as { futureJobsProfiles?: { data?: { docs?: unknown[] } } })
          .futureJobsProfiles?.data?.docs
      )
        ? ((data as { futureJobsProfiles: { data: { docs: SessionResultDoc[] } } })
            .futureJobsProfiles.data.docs)
        : [];

      const profileOptions = appendToExisting ? { appendDocs: true as const } : undefined;

      if (docsFromApply.length > 0) {
        applySessionProfilesFromSearchResponse(
          data as Record<string, unknown>,
          backTab,
          profileOptions
        );
      } else {
        if (!appendToExisting) {
          setSessionResultDocs([]);
          setSearchedCandidates([]);
        }
        setIsFilterDrawerOpen(false);
        setSessionResultsBackTab(backTab);
        navigateToTab("Session Results", { sessionId });
        setSessionResultError("");
        await loadSessionProfilesFirstPage(
          sessionId,
          typeof data.limit === "number" ? data.limit : 20,
          auth.token,
          backTab,
          profileOptions
        );
      }

      setIsFilterDrawerOpen(false);
      setHasSearched(true);
      setWorkspaceCandidatesRefresh((n) => n + 1);
      setRecentSearchesRefresh((n) => n + 1);
      if (isBrandNewSession) {
        setSourcingSessionsHydrated(false);
        setSourcingSessionsRefresh((n) => n + 1);
        if (typeof data.savedSessionId === "string" && data.savedSessionId.trim()) {
          setHighlightSessionId(data.savedSessionId.trim());
        }
      }
    } catch (err) {
      if (userActionAlert.fromThrown(err)) return;
      const message =
        err instanceof Error ? err.message : "Could not apply filters";
      setSessionResultError(message);
      userActionAlert.showError(message);
    } finally {
      setApplyFiltersLoading(false);
    }
  };

  const handleFetchMoreSessionProfiles = async () => {
    if (!searchSummary?.sessionId || !sessionCanFetchMore || sessionFetchMoreLoading) {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSessionResultError("Please sign in again to load more results.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const sid = encodeURIComponent(searchSummary.sessionId);

    setSessionFetchMoreLoading(true);
    setDashboardToast(null);
    setSessionResultError("");
    try {
      const res = await fetch(`${apiBase}/api/candidates/session/${sid}/fetch-more`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (userActionAlert.fromFutureJobsApi(res, data)) return;
        const message = userActionAlert.apiMessage(
          res,
          data,
          "Failed to fetch more profiles"
        );
        if (!userActionAlert.fromApi(res, data, message)) {
          setDashboardToast({ message, variant: "warning" });
        }
        return;
      }

      const fjProfiles = data.futureJobsProfiles as
        | { data?: { docs?: SessionResultDoc[] } }
        | undefined;
      const incomingDocs = Array.isArray(fjProfiles?.data?.docs)
        ? (fjProfiles.data.docs as SessionResultDoc[])
        : [];

      // API returns the full session snapshot after fetch-more — replace, do not append by _id only.
      const nextDocs = dedupeSessionResultDocs(incomingDocs);
      setSessionResultDocs(nextDocs);
      setSessionResultsFromDb(false);

      const incomingCandidates = Array.isArray(data.candidates)
        ? (data.candidates as CandidateRow[])
        : [];
      if (incomingCandidates.length > 0) {
        setSearchedCandidates(incomingCandidates);
      }

      const canFetchMore = data.canFetchMore !== false;
      const storedProfileCount =
        typeof data.storedProfileCount === "number"
          ? data.storedProfileCount
          : nextDocs.length;
      setSessionCanFetchMore(canFetchMore);
      setSearchSummary((prev) =>
        prev
          ? {
              ...prev,
              candidateCount: storedProfileCount,
              totalDocs: storedProfileCount,
              canFetchMore,
            }
          : prev
      );
      setWorkspaceCandidatesRefresh((n) => n + 1);
      setSourcingSessionsHydrated(false);
      setSourcingSessionsRefresh((n) => n + 1);
      setRecentSearchesRefresh((n) => n + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not fetch more profiles";
      if (!userActionAlert.fromThrown(err)) {
        setDashboardToast({ message, variant: "warning" });
      }
    } finally {
      setSessionFetchMoreLoading(false);
    }
  };

  const beginHistorySessionNavigation = (
    sessionId: string,
    backTab: string,
    options?: {
      futureJobsStatus?: string | null;
      prompt?: string;
      sessionTitle?: string;
      sourcingSessionRowId?: string | null;
    }
  ) => {
    setOpeningHistorySessionId(options?.sourcingSessionRowId?.trim() || null);
    setSessionResultsBackTab(backTab);
    setSessionResultDocs([]);
    setSessionResultSelectedKeys([]);
    setSessionResultsFromDb(true);
    setSessionResultError("");
    setSearchLoading(true);
    setSearchSummary({
      candidateCount: 0,
      totalDocs: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      canFetchMore: false,
      sessionId,
      sourcingStatus: options?.futureJobsStatus ?? null,
      profilesFetchError: null,
    });
    const prompt = options?.prompt?.trim() || options?.sessionTitle?.trim() || "";
    if (prompt) {
      setAiPrompt(prompt);
      setFilterSearchPrompt(prompt);
    }
    navigateToTab("Session Results", { sessionId });
  };

  const openSessionFromHistory = async (
    row: SourcingSessionRow,
    backTab = "Search history"
  ) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again.");
      return;
    }
    beginHistorySessionNavigation(row.futureJobsSessionId, backTab, {
      futureJobsStatus: row.futureJobsStatus || null,
      prompt: row.prompt,
      sessionTitle: row.sessionTitle,
      sourcingSessionRowId: row.id,
    });
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const limit = 20;
    try {
      const sid = encodeURIComponent(row.futureJobsSessionId);
      const url = `${apiBase}/api/candidates/session/${sid}/stored-candidates?all=1`;
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
      const restoredFilterForm =
        data.filterForm && typeof data.filterForm === "object"
          ? (data.filterForm as Partial<CandidateFilterForm>)
          : row.filterForm && typeof row.filterForm === "object"
            ? row.filterForm
            : null;
      if (restoredFilterForm) {
        applyFilterFormFromSession(restoredFilterForm, {
          prompt: row.prompt || row.sessionTitle,
        });
      } else {
        setCandidateFilterForm(DEFAULT_CANDIDATE_FILTER_FORM);
        const historyPrompt = (row.prompt || row.sessionTitle || "").trim();
        if (historyPrompt) {
          setFilterSearchPrompt(historyPrompt);
          setAiPrompt(historyPrompt);
        }
      }
      setSessionResultDocs(dedupeSessionResultDocs(detailedDocs));
      setSessionResultSelectedKeys([]);
      setSessionResultsFromDb(true);
      const pg = data.profilesPagination;
      const warn =
        (typeof data.profilesFetchError === "string" && data.profilesFetchError) ||
        (typeof data.fetchMoreError === "string"
          ? `fetch-more: ${data.fetchMoreError}`
          : "");
      if (warn) userActionAlert.showError(warn);
      const displayedCount = detailedDocs.length;
      const canFetchMore = data.canFetchMore !== false;
      setSessionCanFetchMore(canFetchMore);
      setSearchSummary({
        candidateCount: displayedCount,
        totalDocs: displayedCount,
        page: 1,
        limit: displayedCount || limit,
        totalPages: 1,
        hasNextPage: false,
        canFetchMore,
        sessionId: row.futureJobsSessionId,
        sourcingStatus: row.futureJobsStatus || null,
        profilesFetchError: warn || row.profilesFetchError || null,
      });
      setAiPrompt(row.prompt || row.sessionTitle || "");
      setFilterSearchPrompt(row.prompt || row.sessionTitle || "");
      setSessionResultPage(1);
      setSessionResultTotalPages(1);
    } catch (err) {
      setSessionResultsFromDb(false);
      if (!userActionAlert.fromThrown(err)) {
        userActionAlert.showError(
          err instanceof Error ? err.message : "Could not open this session"
        );
      }
    } finally {
      setSearchLoading(false);
      setOpeningHistorySessionId(null);
    }
  };

  const toggleSaveCandidate = async (candidate: CandidateRow) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again to save candidates.");
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
        if (userActionAlert.fromApi(res, data, "Failed to update saved candidate")) return;
        throw new Error(
          userActionAlert.apiMessage(res, data, "Failed to update saved candidate")
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
      if (userActionAlert.fromThrown(err)) return;
      userActionAlert.showError(
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
      userActionAlert.showError("Please sign in again to create a list.");
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
      userActionAlert.showError(err instanceof Error ? err.message : "Could not create list");
    } finally {
      setCreateSaveListBusy(false);
    }
  };

  const handleDeleteSaveList = async (listId: string) => {
    if (!listId) return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again to delete a list.");
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
      userActionAlert.showError(err instanceof Error ? err.message : "Could not delete list");
    } finally {
      setDeleteSaveListBusyId(null);
    }
  };

  const moveCandidateToSaveList = async (candidate: CandidateRow, nextListId: string) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      userActionAlert.showError("Please sign in again to move candidates.");
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
      userActionAlert.showError(err instanceof Error ? err.message : "Could not move candidate");
    } finally {
      setSaveCandidateBusyKeys((prev) => prev.filter((x) => x !== key));
    }
  };

  const revealContactBusyKey = (candidate: CandidateRow, revealType: "EMAIL" | "PHONE") =>
    `${candidateRowKey(candidate)}:${revealType}`;

  const isRevealContactBusy = (candidate: CandidateRow, revealType: "EMAIL" | "PHONE") =>
    revealContactBusyKeys.includes(revealContactBusyKey(candidate, revealType));

  const revealContact = async (
    candidate: CandidateRow,
    revealType: RevealContactType
  ) => {
    const key = candidateRowKey(candidate);
    const busyKey = revealContactBusyKey(candidate, revealType);
    if (revealContactBusyKeys.includes(busyKey)) return;

    const cached = revealedContactValues[key];
    if (
      (revealType === "EMAIL" && cached?.email) ||
      (revealType === "PHONE" && cached?.phone)
    ) {
      if (revealType === "EMAIL") {
        setRevealedEmail((prev) => (prev.includes(key) ? prev : [...prev, key]));
      } else {
        setRevealedPhone((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }
      return;
    }

    if (!candidate.sourcingSessionId || !candidate.linkedin_profile_url) {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      showRevealContactNotice("Please sign in again to reveal contacts.");
      return;
    }

    clearRevealContactNotice();
    setRevealContactBusyKeys((prev) =>
      prev.includes(busyKey) ? prev : [...prev, busyKey]
    );

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
        if (
          userActionAlert.fromApi(
            res,
            data,
            revealContactNotFoundMessage(revealType)
          )
        ) {
          return;
        }
        throw new Error(
          revealContactErrorMessage(
            revealType,
            userActionAlert.apiMessage(res, data, revealContactNotFoundMessage(revealType))
          )
        );
      }
      const value =
        typeof data.value === "string"
          ? data.value.trim()
          : Array.isArray(data.values) && data.values.length > 0
            ? String(data.values[0]).trim()
            : "";

      if (!value) {
        showRevealContactNotice(
          revealContactErrorMessage(revealType, data.message)
        );
        return;
      }

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

      if (revealType === "EMAIL") {
        setRevealedEmail((prev) => (prev.includes(key) ? prev : [...prev, key]));
      } else {
        setRevealedPhone((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }
    } catch (err) {
      if (userActionAlert.fromThrown(err)) return;
      showRevealContactNotice(
        err instanceof Error
          ? revealContactErrorMessage(revealType, err.message)
          : revealContactNotFoundMessage(revealType)
      );
    } finally {
      setRevealContactBusyKeys((prev) => prev.filter((k) => k !== busyKey));
    }
  };

  const revealEmail = (candidate: CandidateRow) => {
    void revealContact(candidate, "EMAIL");
  };

  const revealPhone = (candidate: CandidateRow) => {
    void revealContact(candidate, "PHONE");
  };

  const openSessionCandidateDetail = async (
    doc: SessionResultDoc,
    candidate: CandidateRow
  ) => {
    clearRevealContactNotice();
    setSessionDetailError("");
    setSelectedSessionDetailDoc(doc);
    setSelectedSessionDetailCandidate(candidate);
    setIsSessionCandidateDrawerOpen(true);

    const profileId = resolveCandidateProfileId(doc, candidate.id);
    if (!profileId || isSyntheticSessionCandidateId(profileId)) {
      setSessionDetailLoading(false);
      setSessionDetailError(
        "This profile cannot be refreshed. Re-open it from Session Results or Search history."
      );
      return;
    }

    setSessionDetailLoading(true);

    const auth = getStoredAuth();
    if (!auth?.token) {
      setSessionDetailError("Please sign in again.");
      setSessionDetailLoading(false);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const sessionId =
      doc.sourcingSessionId?.trim() ||
      candidate.sourcingSessionId?.trim() ||
      searchSummary?.sessionId?.trim() ||
      "";
    const linkedinUrl =
      doc.profile?.linkedin_profile_url?.trim() ||
      candidate.linkedin_profile_url?.trim() ||
      "";
    const detailQuery = new URLSearchParams();
    if (sessionId) detailQuery.set("sessionId", sessionId);
    if (linkedinUrl) detailQuery.set("linkedinUrl", linkedinUrl);
    const sessionQ = detailQuery.toString() ? `?${detailQuery.toString()}` : "";

    try {
      const res = await fetch(
        `${apiBase}/api/candidates/candidate/${encodeURIComponent(profileId)}/details${sessionQ}`,
        { headers: authHeaders(auth.token) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const msg =
          typeof data.message === "string"
            ? data.message
            : "Failed to load profile details";
        if (data.fromStored === true && data.detail) {
          setSelectedSessionDetailDoc(
            mergeSessionDetailFromFj(doc, data.detail) as SessionResultDoc
          );
          setSessionDetailError(
            `${msg} Showing the last saved copy from your search.`
          );
        } else {
          setSessionDetailError(msg);
        }
        return;
      }
      setSelectedSessionDetailDoc(
        mergeSessionDetailFromFj(doc, data.detail) as SessionResultDoc
      );
    } catch (err) {
      setSessionDetailError(
        err instanceof Error ? err.message : "Failed to load profile details"
      );
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const closeSessionCandidateDetail = () => {
    clearRevealContactNotice();
    setIsSessionCandidateDrawerOpen(false);
    setSelectedSessionDetailDoc(null);
    setSelectedSessionDetailCandidate(null);
  };

  const sessionResultVisibleSelectionKeys = useMemo(() => {
    const sessionId = searchSummary?.sessionId ?? null;
    return sessionResultDocs.map((doc, idx) => {
      const reveal = sessionDocToCandidateRow(doc, idx, sessionId);
      return sessionResultDocSelectionKey(doc, idx, candidateIdentityKey(reveal));
    });
  }, [sessionResultDocs, searchSummary?.sessionId]);

  useEffect(() => {
    if (sessionResultDocs.length === 0 || sessionResultSelectedKeys.length === 0) return;
    const sessionId = searchSummary?.sessionId ?? null;
    setSessionResultSelectedKeys((prev) =>
      reconcileSessionResultSelectionKeys(sessionResultDocs, prev, sessionId)
    );
  }, [sessionResultDocs, searchSummary?.sessionId]);

  const allVisibleSessionResultsSelected =
    sessionResultVisibleSelectionKeys.length > 0 &&
    sessionResultVisibleSelectionKeys.every((key) =>
      sessionResultSelectedKeys.includes(key)
    );

  const toggleSessionResultSelection = useCallback((key: string) => {
    setSessionResultSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const toggleSelectAllSessionResults = useCallback(() => {
    setSessionResultSelectedKeys((prev) => {
      if (allVisibleSessionResultsSelected) {
        return prev.filter((k) => !sessionResultVisibleSelectionKeys.includes(k));
      }
      const next = new Set(prev);
      for (const key of sessionResultVisibleSelectionKeys) next.add(key);
      return [...next];
    });
  }, [allVisibleSessionResultsSelected, sessionResultVisibleSelectionKeys]);

  const clearSessionResultSelection = useCallback(() => {
    setSessionResultSelectedKeys([]);
  }, []);

  const sessionResultsOutOfSync =
    activeTab === "Session Results" &&
    Boolean(routeSessionId) &&
    searchSummary?.sessionId !== routeSessionId;
  const showSessionResultsSkeleton =
    sessionResultDocs.length === 0 && (searchLoading || sessionResultsOutOfSync);
  const showSessionResultsGrid =
    sessionResultDocs.length > 0 && !searchLoading && !sessionResultsOutOfSync;

  const applyRevealedLookupToCandidateRows = useCallback(async (rows: CandidateRow[]) => {
    const auth = getStoredAuth();
    if (!auth?.token || rows.length === 0) return;

    const rowKeyByLinkedin = new Map<string, string>();
    const urls: string[] = [];
    for (const row of rows) {
      const linkedin = normalizeLinkedinUrl(row.linkedin_profile_url || "");
      if (!linkedin) continue;
      urls.push(linkedin);
      rowKeyByLinkedin.set(linkedin, candidateRowKey(row));
    }
    if (urls.length === 0) return;

    const lookup = await lookupRevealedContacts(auth.token, urls);
    if (Object.keys(lookup).length === 0) return;

    setRevealedContactValues((prev) => {
      const next = { ...prev };
      for (const [linkedin, cached] of Object.entries(lookup)) {
        const rowKey = rowKeyByLinkedin.get(linkedin);
        if (!rowKey) continue;
        const email = cached.email?.trim() || "";
        const phone = cached.phone?.trim() || "";
        if (!email && !phone) continue;
        next[rowKey] = {
          email: email || next[rowKey]?.email,
          phone: phone || next[rowKey]?.phone,
        };
      }
      return next;
    });

    setRevealedEmail((prev) => {
      const next = new Set(prev);
      for (const [linkedin, cached] of Object.entries(lookup)) {
        if (!cached.email?.trim()) continue;
        const rowKey = rowKeyByLinkedin.get(linkedin);
        if (rowKey) next.add(rowKey);
      }
      return [...next];
    });

    setRevealedPhone((prev) => {
      const next = new Set(prev);
      for (const [linkedin, cached] of Object.entries(lookup)) {
        if (!cached.phone?.trim()) continue;
        const rowKey = rowKeyByLinkedin.get(linkedin);
        if (rowKey) next.add(rowKey);
      }
      return [...next];
    });
  }, []);

  const hydrateSessionRevealedContacts = useCallback(async () => {
    if (sessionResultDocs.length === 0) return;
    const sessionId = searchSummary?.sessionId ?? null;
    const rows = sessionResultDocs.map((doc, idx) =>
      sessionDocToCandidateRow(doc, idx, sessionId)
    );
    await applyRevealedLookupToCandidateRows(rows);
  }, [sessionResultDocs, searchSummary?.sessionId, applyRevealedLookupToCandidateRows]);

  useEffect(() => {
    if (activeTab !== "Session Results") return;
    void hydrateSessionRevealedContacts();
  }, [activeTab, hydrateSessionRevealedContacts]);

  useEffect(() => {
    if (activeTab !== "Candidates" || workspaceCandidates.length === 0) return;
    void applyRevealedLookupToCandidateRows(workspaceCandidates);
  }, [activeTab, workspaceCandidates, applyRevealedLookupToCandidateRows]);

  useEffect(() => {
    if (activeTab !== "Saved" || savedCandidatesList.length === 0) return;
    void applyRevealedLookupToCandidateRows(savedCandidatesList);
  }, [activeTab, savedCandidatesList, applyRevealedLookupToCandidateRows]);

  const resolveSelectedSessionContacts = useCallback((): CampaignContact[] => {
    const sessionId = searchSummary?.sessionId ?? null;
    const contacts: CampaignContact[] = [];
    for (let idx = 0; idx < sessionResultDocs.length; idx += 1) {
      const doc = sessionResultDocs[idx];
      const row = sessionDocToCandidateRow(doc, idx, sessionId);
      const identityKey = candidateIdentityKey(row);
      const key = sessionResultDocSelectionKey(doc, idx, identityKey);
      const docId = typeof doc._id === "string" ? doc._id.trim() : "";
      if (!isSessionResultRowSelected(sessionResultSelectedKeys, key, identityKey, docId)) {
        continue;
      }
      const emailKey = candidateRowKey(row);
      const email =
        revealedContactValues[emailKey]?.email || row.email || "";
      const phone =
        revealedContactValues[emailKey]?.phone?.trim() ||
        row.phone?.trim() ||
        "";
      contacts.push({
        candidateKey: key,
        candidateId: String(row.id || key),
        name: row.name,
        email,
        phone,
        role: row.role,
        company: row.currentCompany || "",
        location: row.location,
        linkedinUrl: row.linkedin_profile_url || "",
        sourcingSessionId:
          row.sourcingSessionId || searchSummary?.sessionId || "",
        addedAt: new Date().toISOString(),
      });
    }
    return contacts;
  }, [
    sessionResultDocs,
    searchSummary?.sessionId,
    sessionResultSelectedKeys,
    revealedContactValues,
  ]);

  const handleCreateCampaign = useCallback(
    async (name: string): Promise<CampaignRecord | null> => {
      const auth = getStoredAuth();
      if (!auth?.token) return null;
      try {
        const { campaign: record } = await createCampaign(auth.token, name);
        await loadCampaignsList({ page: 1 });
        return record;
      } catch {
        return null;
      }
    },
    [loadCampaignsList]
  );

  const handleCampaignUpdated = useCallback((updated: CampaignRecord) => {
    setCampaigns((prev) => {
      const prior = prev.find((c) => c.id === updated.id);
      if (prior) {
        const wasActive = prior.outreachStatus === "active";
        const isActive = updated.outreachStatus === "active";
        if (wasActive && !isActive) {
          setCampaignsSummary((s) => ({ ...s, active: Math.max(0, s.active - 1) }));
        } else if (!wasActive && isActive) {
          setCampaignsSummary((s) => ({ ...s, active: s.active + 1 }));
        }
      }
      return prev.map((c) => (c.id === updated.id ? updated : c));
    });
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeClient.subscribeThreadUpdated((payload) => {
      if (payload.source !== "campaign_completed" && payload.outreachStatus !== "completed") {
        return;
      }
      const campaignId = payload.campaignId?.trim();
      if (!campaignId) return;

      const auth = getStoredAuth();
      if (!auth?.token) return;

      void fetchCampaign(auth.token, campaignId)
        .then((updated) => {
          handleCampaignUpdated(updated);
        })
        .catch(() => {
          void loadCampaignsList({ page: campaignsPage });
        });
    });

    return unsubscribe;
  }, [campaignsPage, handleCampaignUpdated, loadCampaignsList]);

  const handleAddToCampaignConfirm = useCallback(
    async (payload: { campaignId: string } | { newCampaignName: string }) => {
      if (addToCampaignBusy) return;
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Sign in to manage campaigns.");
      }

      let incoming = resolveSelectedSessionContacts();
      if (incoming.length === 0) {
        throw new Error(
          "No candidates could be matched. Clear selection, select candidates again, then retry."
        );
      }

      setAddToCampaignBusy(true);

      try {
        if ("newCampaignName" in payload) {
          const batchCheck = validateCampaignContactBatch(0, incoming.length);
          if (!batchCheck.ok) {
            setDashboardToast({ message: batchCheck.message, variant: "warning" });
            throw new Error(batchCheck.message);
          }
          const { campaign: record } = await createCampaign(
            auth.token,
            payload.newCampaignName,
            incoming
          );
          setCampaigns((prev) => [record, ...prev]);
          setAddToCampaignOpen(false);
          const createdCount = record.contactCount ?? incoming.length;
          setSessionResultNotice(
            `Added ${createdCount} candidate${createdCount === 1 ? "" : "s"} to "${record.name}". Email and phone will be revealed when you launch the campaign.`
          );
          navigateToTab("Campaigns", {
            campaignId: record.id,
            campaignWorkspaceTab:
              record.outreachChannel === "whatsapp" ? "WhatsApp" : "Emails",
          });
          return;
        }

        const existing = campaigns.find((c) => c.id === payload.campaignId);
        if (existing && isCampaignLaunched(existing.outreachStatus)) {
          setDashboardToast({
            message: CAMPAIGN_CONTACTS_LOCKED_MESSAGE,
            variant: "warning",
          });
          return;
        }
        const currentCount = existing?.contactCount ?? existing?.contacts?.length ?? 0;
        const batchCheck = validateCampaignContactBatch(currentCount, incoming.length);
        if (!batchCheck.ok) {
          setDashboardToast({ message: batchCheck.message, variant: "warning" });
          throw new Error(batchCheck.message);
        }

        const { campaign, addedCount, skippedCount, limitSkippedCount } =
          await addContactsToCampaignApi(auth.token, payload.campaignId, incoming);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? campaign : c))
        );
        const campaignName = campaign.name || "Campaign";
        setAddToCampaignOpen(false);
        if (addedCount === 0 && skippedCount > 0 && limitSkippedCount === 0) {
          setSessionResultNotice(`All selected candidates are already in "${campaignName}".`);
        } else if (skippedCount > 0) {
          setSessionResultNotice(
            `Added ${addedCount} to "${campaignName}". ${skippedCount} duplicate${skippedCount === 1 ? " was" : "s were"} skipped. Email and phone will be revealed when you launch the campaign.`
          );
        } else {
          setSessionResultNotice(
            `Added ${addedCount} candidate${addedCount === 1 ? "" : "s"} to "${campaignName}". Email and phone will be revealed when you launch the campaign.`
          );
        }
        navigateToTab("Campaigns", {
          campaignId: campaign.id,
          campaignWorkspaceTab:
            campaign.outreachChannel === "whatsapp" ? "WhatsApp" : "Emails",
        });
      } catch (err) {
        if (!userActionAlert.fromThrown(err)) {
          const message =
            err instanceof Error ? err.message : "Could not add to campaign.";
          setSessionResultNotice(message);
          throw err instanceof Error ? err : new Error(message);
        }
        throw err instanceof Error ? err : new Error("Could not add to campaign.");
      } finally {
        setAddToCampaignBusy(false);
      }
    },
    [
      addToCampaignBusy,
      campaigns,
      navigateToTab,
      resolveSelectedSessionContacts,
      userActionAlert,
    ]
  );

  const openAddToCampaignModal = () => {
    if (!hasCampaignsAccess(userPlanId, userPricingPlans, planAccessOpts)) {
      navigateToTab("Plans and pricing");
      return;
    }
    setSessionResultNotice("");
    setAddToCampaignOpen(true);
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
    try {
      const stored = localStorage.getItem(DASHBOARD_SIDEBAR_COLLAPSED_KEY);
      if (stored === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DASHBOARD_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next) setProfileMenuOpen(false);
      return next;
    });
  };

  useEffect(() => {
    if (!applyFiltersLoading) {
      setApplyStatusStepIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setApplyStatusStepIndex((prev) =>
        prev >= APPLY_FILTER_LOADING_STEPS.length - 1 ? prev : prev + 1
      );
    }, 2200);
    return () => window.clearInterval(timer);
  }, [applyFiltersLoading]);

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
      <BlockedAccountModal open={accountBlocked} />
      <div className="dashboard-shell flex min-w-0 w-full">
        <aside
          className={`dashboard-sidebar dashboard-sidebar--compact hidden flex-col lg:flex${
            sidebarCollapsed ? " dashboard-sidebar--collapsed" : ""
          }`}
        >
          <div className="dashboard-sidebar-brand">
            <div className="dashboard-sidebar-brand-head">
              <Link
                href="/dashboard"
                className="dashboard-sidebar-brand-link"
                aria-label="Huntlo dashboard home"
              >
                <LandingLogo className="dashboard-sidebar-logo" priority />
              </Link>
              <button
                type="button"
                className="dashboard-sidebar-toggle"
                onClick={toggleSidebarCollapsed}
                aria-expanded={!sidebarCollapsed}
                aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
                title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
              >
                <MaterialIcon
                  name={sidebarCollapsed ? "left_panel_open" : "left_panel_close"}
                  className="dashboard-sidebar-toggle-icon"
                />
              </button>
            </div>
          </div>

          <nav className="dashboard-sidebar-nav">
            <div className="dashboard-sidebar-nav-scroll">
              <div className="dashboard-sidebar-nav-list">
              {sidebarItemsForRole(accountRole).map((entry) => {
                if (isSidebarNavGroup(entry)) {
                  const childActive = entry.children.some(
                    (child) => activeTab === (child.tabKey ?? child.label)
                  );
                  return (
                    <div key={entry.label} className="dashboard-nav-group">
                      <button
                        type="button"
                        onClick={() => {
                          if (sidebarCollapsed) toggleSidebarCollapsed();
                          else setEngagementsNavExpanded((open) => !open);
                        }}
                        title={sidebarCollapsed ? entry.label : entry.subtitle}
                        aria-expanded={engagementsNavExpanded}
                        className={`dashboard-nav-item dashboard-nav-item--compact dashboard-nav-item--group w-full ${
                          childActive ? "dashboard-nav-item--active" : ""
                        }`}
                      >
                        <span className="dashboard-nav-item-inner">
                          <span
                            className={`dashboard-nav-icon dashboard-nav-icon--compact ${
                              childActive ? "dashboard-nav-icon--active" : ""
                            }`}
                          >
                            {entry.icon}
                          </span>
                          <span className="dashboard-nav-item-text min-w-0">
                            <span className="dashboard-nav-label">{entry.label}</span>
                            <span className="dashboard-nav-subtitle">{entry.subtitle}</span>
                          </span>
                          <MaterialIcon
                            name={engagementsNavExpanded ? "expand_less" : "expand_more"}
                            className="dashboard-nav-group-chevron"
                            aria-hidden
                          />
                        </span>
                      </button>
                      {engagementsNavExpanded && !sidebarCollapsed ? (
                        <div className="dashboard-nav-sublist" role="group" aria-label={entry.label}>
                          {entry.children.map((child) => {
                            const tabKey = child.tabKey ?? child.label;
                            const isActive = activeTab === tabKey;
                            return (
                              <Link
                                key={tabKey}
                                href={pathForDashboardTab(
                                  tabKeyFromSidebarLabel(child.label, child.tabKey) as DashboardTabKey
                                )}
                                title={child.label}
                                className={`dashboard-nav-item dashboard-nav-item--compact dashboard-nav-item--sub w-full ${
                                  isActive ? "dashboard-nav-item--active" : ""
                                }`}
                              >
                                <span className="dashboard-nav-item-inner dashboard-nav-item-inner--sub">
                                  <span className="dashboard-nav-item-text min-w-0">
                                    <span className="dashboard-nav-label">{child.label}</span>
                                  </span>
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const tabKey = entry.tabKey ?? entry.label;
                return (
                  <Link
                    key={tabKey}
                    href={pathForDashboardTab(
                      tabKeyFromSidebarLabel(entry.label, entry.tabKey) as DashboardTabKey
                    )}
                    title={sidebarCollapsed ? entry.label : entry.subtitle}
                    className={`dashboard-nav-item dashboard-nav-item--compact w-full ${
                      activeTab === tabKey ? "dashboard-nav-item--active" : ""
                    }`}
                  >
                    <span className="dashboard-nav-item-inner">
                      <span
                        className={`dashboard-nav-icon dashboard-nav-icon--compact ${
                          activeTab === tabKey ? "dashboard-nav-icon--active" : ""
                        }`}
                      >
                        {entry.icon}
                      </span>
                      <span className="dashboard-nav-item-text min-w-0">
                        <span className="dashboard-nav-label">{entry.label}</span>
                        <span className="dashboard-nav-subtitle">{entry.subtitle}</span>
                      </span>
                    </span>
                  </Link>
                );
              })}
              </div>
            </div>

            <div className="dashboard-sidebar-footer" ref={profileMenuRef}>
              <div className="dashboard-sidebar-profile-row">
                <Link
                  href={pathForDashboardTab("My Profile")}
                  title={sidebarCollapsed ? userProfileSidebarItem.label : undefined}
                  className={`dashboard-nav-item dashboard-nav-item--compact min-w-0 flex-1 ${
                    activeTab === userProfileSidebarItem.label
                      ? "dashboard-nav-item--active"
                      : ""
                  }`}
                >
                  <span className="dashboard-nav-item-inner">
                    <span
                      className={`dashboard-nav-icon dashboard-nav-icon--compact ${
                        activeTab === userProfileSidebarItem.label
                          ? "dashboard-nav-icon--active"
                          : ""
                      }`}
                    >
                      {sidebarProfileIcon(
                        myProfileForm.fullName,
                        myProfileForm.profilePhotoUrl
                      )}
                    </span>
                    <span className="dashboard-nav-item-text min-w-0 text-left">
                      <span className="dashboard-nav-label block truncate">
                        {userProfileSidebarItem.label}
                      </span>
                      <span className="dashboard-nav-subtitle block truncate">
                        {userProfileSidebarItem.subtitle}
                      </span>
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className={`dashboard-sidebar-menu-trigger${
                    profileMenuOpen ? " dashboard-sidebar-menu-trigger--open" : ""
                  }`}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Account options"
                  title="Account options"
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
          <div className="dashboard-main-scroll">
            {revealContactNotice ? (
              <p className="mb-4 shrink-0 dashboard-alert-warning">{revealContactNotice}</p>
            ) : null}
            {activeTab === "Dashboard" ? (
              <DashboardOverviewPanel
                loading={dashboardOverviewLoading}
                error={dashboardOverviewError}
                data={dashboardOverview}
                currentPlanId={userPlanId}
                outreachThreads={planOutreachThreads}
                pricingPlans={userPricingPlans}
                onNavigate={navigateToTab}
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
              <SearchCandidatesPanel
                userDisplayName={myProfileForm.fullName}
                aiPrompt={aiPrompt}
                onAiPromptChange={setAiPrompt}
                onSearch={() => void handleSearch()}
                searchLoading={searchLoading || applyFiltersLoading || annotateLoading}
                recentSearches={recentSearches}
                recentLoading={recentSearchesLoading}
                onOpenRecent={openRecentAiSearch}
                onViewAllHistory={() => navigateToTab("Search history")}
              />
            ) : activeTab === "Session Results" ? (
              <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <div className="dashboard-card-panel-header">
                <div className="dashboard-results-toolbar">
                  <div className="dashboard-results-toolbar-leading">
                    <button
                      type="button"
                      onClick={() => navigateToTab(sessionResultsBackTab)}
                      className="dashboard-btn-secondary dashboard-btn-icon"
                      aria-label={`Back to ${sessionResultsBackTab}`}
                    >
                      <MaterialIcon name="arrow_back" className="text-xl" />
                    </button>
                    <div className="min-w-0">
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
                  </div>
                  <div className="dashboard-results-toolbar-actions">
                    {showSessionResultsGrid ? (
                      <div className="dashboard-results-toolbar-meta">
                        <span className="dashboard-results-toolbar-badge tabular-nums">
                          {sessionResultDocs.length.toLocaleString()} candidate
                          {sessionResultDocs.length === 1 ? "" : "s"}
                        </span>
                        {sessionResultSelectedKeys.length > 0 ? (
                          <span className="dashboard-results-toolbar-badge dashboard-results-toolbar-badge--selected tabular-nums">
                            {sessionResultSelectedKeys.length} selected
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="dashboard-results-toolbar-buttons">
                      {showSessionResultsGrid ? (
                        <>
                          {sessionResultSelectedKeys.length > 0 ? (
                            <button
                              type="button"
                              onClick={openAddToCampaignModal}
                              className="dashboard-btn-primary"
                            >
                              <MaterialIcon name="flag" aria-hidden />
                              Add to campaign
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={toggleSelectAllSessionResults}
                            className="dashboard-btn-secondary"
                          >
                            <MaterialIcon
                              name={
                                allVisibleSessionResultsSelected
                                  ? "check_box"
                                  : "check_box_outline_blank"
                              }
                              aria-hidden
                            />
                            {allVisibleSessionResultsSelected ? "Deselect all" : "Select all"}
                          </button>
                          {sessionResultSelectedKeys.length > 0 ? (
                            <button
                              type="button"
                              onClick={clearSessionResultSelection}
                              className="dashboard-btn-secondary"
                            >
                              Clear
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEditFiltersDrawer()}
                        className="dashboard-btn-secondary"
                      >
                        <MaterialIcon name="tune" aria-hidden />
                        Edit filter
                      </button>
                    </div>
                  </div>
                </div>
                </div>

                <div className="dashboard-card-body-scroll">
                {sessionResultError ? (
                  <p className="mt-4 dashboard-alert-error">
                    {sessionResultError}
                  </p>
                ) : null}

                {sessionResultNotice ? (
                  <p className="dashboard-alert-success mt-4">{sessionResultNotice}</p>
                ) : null}

                {showSessionResultsSkeleton ? (
                  <SessionResultsSkeleton count={4} />
                ) : null}

                {applyFiltersLoading && sessionResultDocs.length === 0 ? (
                  <div className="dashboard-results-analyzing" role="status" aria-live="polite">
                    <div className="dashboard-results-analyzing-graphic" aria-hidden>
                      <span className="dashboard-results-analyzing-dot" />
                      <span className="dashboard-results-analyzing-dot" />
                      <span className="dashboard-results-analyzing-dot" />
                    </div>
                    <p className="dashboard-results-analyzing-title">
                      Analyzing profiles... Please wait for the updated results.
                    </p>
                  </div>
                ) : null}

                {!showSessionResultsSkeleton &&
                !applyFiltersLoading &&
                sessionResultDocs.length === 0 &&
                !sessionResultError &&
                !sessionResultsOutOfSync ? (
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
                      onClick={() => navigateToTab("Search history")}
                      className="dashboard-btn-primary mt-6"
                    >
                      <MaterialIcon name="history" className="text-base" />
                      View search history
                    </button>
                  </div>
                ) : null}

                {showSessionResultsGrid ? (
                  <>
                    <p className="dashboard-session-select-touch-hint">
                      Tap the circle on a card to select. Use Select all for faster multi-select.
                    </p>
                    <div
                      className={`dashboard-results-grid mt-4${
                        sessionResultSelectedKeys.length > 0
                          ? " dashboard-results-grid--selecting"
                          : ""
                      }`}
                    >
                      {sessionResultDocs.map((doc, idx) => {
                        const highlights = doc.profileAnalysis?.highlights ?? [];
                        const current = doc.profile?.current_employers_object?.[0];
                        const revealCandidate = sessionDocToCandidateRow(
                          doc,
                          idx,
                          searchSummary?.sessionId ?? null
                        );
                        const sessionCandidateKey = candidateIdentityKey(revealCandidate);
                        const selectionKey = sessionResultDocSelectionKey(
                          doc,
                          idx,
                          sessionCandidateKey
                        );
                        const docId = typeof doc._id === "string" ? doc._id.trim() : "";
                        const isSelected = isSessionResultRowSelected(
                          sessionResultSelectedKeys,
                          selectionKey,
                          sessionCandidateKey,
                          docId
                        );
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
                        const emailRevealBusy = isRevealContactBusy(revealCandidate, "EMAIL");
                        const phoneRevealBusy = isRevealContactBusy(revealCandidate, "PHONE");
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
                            className={`dashboard-candidate-card${
                              isSelected ? " dashboard-candidate-card--selected" : ""
                            }${isDetailOpen ? " dashboard-candidate-card--active" : ""}`}
                          >
                            <button
                              type="button"
                              className={`dashboard-candidate-card-select${
                                isSelected ? " dashboard-candidate-card-select--on" : ""
                              }`}
                              aria-label={
                                isSelected
                                  ? `Deselect ${candidateName}`
                                  : `Select ${candidateName}`
                              }
                              aria-pressed={isSelected}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSessionResultSelection(selectionKey);
                              }}
                            >
                              <MaterialIcon
                                name={isSelected ? "check_circle" : "radio_button_unchecked"}
                                aria-hidden
                              />
                            </button>
                            <div className="flex items-start gap-3">
                              <SessionCandidateGridAvatar
                                name={candidateName}
                                photoUrl={candidatePhotoUrl}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="min-w-0">
                                  <div className="dashboard-candidate-name-row">
                                    <h4 className="text-base font-semibold text-slate-900">
                                      {candidateName}
                                    </h4>
                                    {isOpenToWork(doc.profile?.open_to_cards) ? (
                                      <OpenToWorkBadge compact />
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-xs text-slate-600">
                                    {current?.job_title || "Role unavailable"}
                                    {current?.company_name ? ` · ${current.company_name}` : ""}
                                  </p>
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

                            <div
                              className="dashboard-candidate-actions"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div className="dashboard-candidate-actions-bar">
                                <div className="dashboard-candidate-actions-left">
                                  <button
                                    type="button"
                                    title={emailRevealBusy ? "Revealing email…" : "Reveal email"}
                                    aria-label={
                                      emailRevealBusy ? "Revealing email" : "Reveal email"
                                    }
                                    disabled={emailRevealBusy}
                                    aria-busy={emailRevealBusy}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      revealEmail(revealCandidate);
                                    }}
                                    className={`dashboard-candidate-action-icon-btn${
                                      emailRevealBusy
                                        ? " dashboard-candidate-action-icon-btn--loading"
                                        : ""
                                    }`}
                                  >
                                    {emailRevealBusy ? (
                                      <span className="dashboard-reveal-spinner" aria-hidden />
                                    ) : (
                                      <MaterialIcon name="mail" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    title={phoneRevealBusy ? "Revealing mobile…" : "Reveal mobile"}
                                    aria-label={
                                      phoneRevealBusy ? "Revealing mobile" : "Reveal mobile"
                                    }
                                    disabled={phoneRevealBusy}
                                    aria-busy={phoneRevealBusy}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      revealPhone(revealCandidate);
                                    }}
                                    className={`dashboard-candidate-action-icon-btn${
                                      phoneRevealBusy
                                        ? " dashboard-candidate-action-icon-btn--loading"
                                        : ""
                                    }`}
                                  >
                                    {phoneRevealBusy ? (
                                      <span className="dashboard-reveal-spinner" aria-hidden />
                                    ) : (
                                      <MaterialIcon name="call" />
                                    )}
                                  </button>
                                </div>
                                <div className="dashboard-candidate-actions-right">
                                  {sessionLinkedinUrl ? (
                                    <a
                                      href={sessionLinkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open LinkedIn profile"
                                      aria-label="Open LinkedIn profile"
                                      onClick={(e) => e.stopPropagation()}
                                      className="dashboard-candidate-action-linkedin"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        aria-hidden
                                      >
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                      </svg>
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    title="Save candidate"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void toggleSaveCandidate(revealCandidate);
                                    }}
                                    disabled={isSaveBusy}
                                    className={`dashboard-candidate-action-save-btn ${
                                      isSavedSessionCandidate
                                        ? "dashboard-btn-toggle-active"
                                        : "dashboard-btn-toggle-inactive"
                                    } disabled:opacity-60`}
                                  >
                                    <MaterialIcon name="bookmark_border" className="text-base" />
                                    <span>
                                      {isSaveBusy
                                        ? "Saving…"
                                        : isSavedSessionCandidate
                                          ? "Saved"
                                          : "Save Candidate"}
                                    </span>
                                  </button>
                                </div>
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
                    {sessionCanFetchMore && searchSummary?.sessionId ? (
                      <div className="mt-5 flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleFetchMoreSessionProfiles()}
                          disabled={sessionFetchMoreLoading || applyFiltersLoading}
                          className="dashboard-btn-primary px-5 py-2.5 disabled:opacity-60"
                        >
                          <MaterialIcon name="person_add" className="text-base" />
                          {sessionFetchMoreLoading
                            ? "Fetching more profiles…"
                            : "Fetch more profiles"}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
                </div>

                <AddToCampaignModal
                  open={addToCampaignOpen}
                  selectedCount={sessionResultSelectedKeys.length}
                  campaigns={campaigns}
                  submitting={addToCampaignBusy}
                  onClose={() => !addToCampaignBusy && setAddToCampaignOpen(false)}
                  onConfirm={handleAddToCampaignConfirm}
                />
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
                accountRole={myProfileAccountRole}
                workspaceOwner={myProfileWorkspaceOwner}
                loading={myProfileLoading}
                saving={myProfileSaving}
                error={myProfileError}
                success={myProfileSuccess}
                isEditing={isEditingProfile}
                passwordForm={passwordForm}
                passwordUpdateLoading={passwordUpdateLoading}
                peopleScoutProfileName={peopleScoutProfile?.name}
                peopleScoutLoading={peopleScoutLoading}
                photoUploading={myProfilePhotoUploading}
                onFieldChange={onMyProfileFieldChange}
                onPhotoUpload={(file) => void onUploadMyProfilePhoto(file)}
                onPhotoRemove={() => void onRemoveMyProfilePhoto()}
                onEdit={onEditMyProfile}
                onCancel={onCancelMyProfileEdit}
                onSave={() => void onSaveMyProfile()}
                onPasswordFieldChange={onPasswordFieldChange}
                onUpdatePassword={() => void handleUpdatePassword()}
              />
            ) : activeTab === "Search history" ? (
              <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
                <div className="dashboard-card-panel-header">
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
                  {sourcingSessionsHydrated && sourcingSessions.length > 0 ? (
                    <span className="dashboard-badge tabular-nums">
                      {sourcingSessions.length} session
                      {sourcingSessions.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                </div>

                <div className="dashboard-card-body-scroll">
                <SearchHistoryTable
                  rows={sourcingSessionsHydrated ? sourcingSessions : []}
                  loading={sourcingSessionsLoading || !sourcingSessionsHydrated}
                  error={sourcingSessionsError}
                  highlightSessionId={highlightSessionId}
                  openingSessionId={openingHistorySessionId}
                  onOpenSession={(row) => void openSessionFromHistory(row)}
                  onGoToSearch={() => navigateToTab("Search Candidates")}
                />
                </div>

              </section>
            ) : activeTab === "Candidates" ? (
              <CandidatePoolPanel
                candidates={workspaceCandidates}
                totalDocs={workspaceCandidatesTotalDocs}
                totalAllDocs={
                  workspaceSessionFilter === "__all__"
                    ? workspaceCandidatesTotalAllDocs
                    : workspaceCandidatesTotalInScope
                }
                totalInScope={workspaceCandidatesTotalInScope}
                searchInput={workspaceSearchInput}
                searchQuery={workspaceSearchQuery}
                onSearchInputChange={setWorkspaceSearchInput}
                loading={workspaceCandidatesLoading}
                error={workspaceCandidatesError}
                page={workspaceCandidatesPage}
                totalPages={workspaceCandidatesTotalPages}
                onPageChange={setWorkspaceCandidatesPage}
                sessionFilter={workspaceSessionFilter}
                onSessionFilterChange={handleWorkspaceSessionFilterChange}
                sessions={sourcingSessions.map((session) => ({
                  id: session.futureJobsSessionId,
                  label:
                    session.prompt.trim() ||
                    session.sessionTitle.trim() ||
                    "Untitled search",
                }))}
                sessionsLoading={sourcingSessionsLoading}
                rowKey={candidateRowKey}
                identityKey={candidateIdentityKey}
                saveBusyKeys={saveCandidateBusyKeys}
                savedKeys={savedSessionCandidateKeys}
                revealedEmailKeys={revealedEmail}
                revealedPhoneKeys={revealedPhone}
                isRevealEmailBusy={(candidate) =>
                  isRevealContactBusy(candidate as CandidateRow, "EMAIL")
                }
                isRevealPhoneBusy={(candidate) =>
                  isRevealContactBusy(candidate as CandidateRow, "PHONE")
                }
                onRevealEmail={revealEmail}
                onRevealPhone={revealPhone}
                getDisplayedEmail={getDisplayedEmail}
                getDisplayedPhone={getDisplayedPhone}
                onToggleSave={(candidate) => void toggleSaveCandidate(candidate as CandidateRow)}
                onOpenDetail={(candidate) =>
                  openCandidateProfileDetail(
                    candidate as CandidateRow,
                    openSessionCandidateDetail
                  )
                }
                onGoToSearch={() => navigateToTab("Search Candidates")}
              />
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
                isRevealEmailBusy={(candidate) =>
                  isRevealContactBusy(candidate as CandidateRow, "EMAIL")
                }
                isRevealPhoneBusy={(candidate) =>
                  isRevealContactBusy(candidate as CandidateRow, "PHONE")
                }
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
                onGoToSessionResults={() =>
                  navigateToTab("Session Results", {
                    sessionId: searchSummary?.sessionId ?? undefined,
                  })
                }
              />
            ) : activeTab === "Outreaches" ? (
              <OutreachesPanel
                currentPlanId={userPlanId}
                planResolved={userPlanReady}
                pricingPlans={userPricingPlans}
                pricingPlansReady={userPricingPlansReady}
                onViewPlans={() => navigateToTab("Plans and pricing")}
                onGoToIntegrations={() => navigateToTab("Integrations")}
              />
            ) : activeTab === "Campaigns" ? (
              <CampaignsPanel
                currentPlanId={userPlanId}
                planResolved={userPlanReady}
                pricingPlans={userPricingPlans}
                pricingPlansReady={userPricingPlansReady}
                onViewPlans={() => navigateToTab("Plans and pricing")}
                onGoToIntegrations={() => navigateToTab("Integrations")}
                onAddFromSearchHistory={() => navigateToTab("Search history")}
                campaigns={campaigns}
                campaignsLoading={campaignsLoading}
                campaignsPage={campaignsPage}
                campaignsTotal={campaignsTotal}
                campaignsTotalPages={campaignsTotalPages}
                campaignsSummary={campaignsSummary}
                onCampaignsPageChange={handleCampaignsPageChange}
                onCreateCampaign={handleCreateCampaign}
                onCampaignUpdated={handleCampaignUpdated}
                routeCampaignId={routeCampaignId}
                routeWorkspaceTab={campaignWorkspaceTab}
                routeReportMetric={campaignReportMetric ?? null}
                routeWhatsAppContactKey={campaignWhatsAppContactKey || null}
              />
            ) : activeTab === "Integrations" ? (
              <IntegrationsPanel
                currentPlanId={userPlanId}
                planResolved={userPlanReady}
                pricingPlans={userPricingPlans}
                pricingPlansReady={userPricingPlansReady}
                onViewPlans={() => navigateToTab("Plans and pricing")}
              />
            ) : activeTab === "Team" ? (
              <TeamManagementPanel />
            ) : activeTab === "Plans and pricing" ? (
              <PlansPricingPanel
                loading={userPricingPlansLoading}
                plans={userPricingPlans}
                currentPlanId={userPlanId}
                currentPlanName={userPlanName}
                utilisation={planUtilisation}
                outreachThreads={planOutreachThreads}
                history={utilisationHistory}
                historyLoading={utilisationHistoryLoading}
                historyPage={utilisationHistoryPage}
                historyTotalDocs={utilisationHistoryTotalDocs}
                historyTotalPages={utilisationHistoryTotalPages}
                onHistoryPageChange={setUtilisationHistoryPage}
                onPaymentSuccess={handlePlanPaymentSuccess}
                paymentSuccessToast={planPaymentSuccessToast}
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
          setCandidateFilterForm((prev) => {
            const next = mergeFilterForm(prev, patch);
            if (String(next.keywordSkills || "").trim()) setFilterSkillsError("");
            return next;
          })
        }
        onClose={() => {
          if (!applyFiltersLoading && !annotateLoading) setIsFilterDrawerOpen(false);
        }}
        onApply={() => requestApplySearchFilters()}
        applyLoading={applyFiltersLoading}
        annotateLoading={annotateLoading || filterFormRestoreLoading}
        title={
          activeTab === "Session Results" ? "Edit search filters" : "Set search filters"
        }
        skillsError={filterSkillsError}
        applyStatusMessage={APPLY_FILTER_LOADING_STEPS[applyStatusStepIndex]}
      />

      {selectedSessionDetailDoc && selectedSessionDetailCandidate ? (
        <SessionCandidateDetailDrawer
          open={isSessionCandidateDrawerOpen}
          doc={selectedSessionDetailDoc}
          candidate={selectedSessionDetailCandidate}
          detailLoading={sessionDetailLoading}
          detailError={sessionDetailError}
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
          emailRevealBusy={isRevealContactBusy(
            selectedSessionDetailCandidate,
            "EMAIL"
          )}
          phoneRevealBusy={isRevealContactBusy(
            selectedSessionDetailCandidate,
            "PHONE"
          )}
          contactRevealNotice={revealContactNotice}
        />
      ) : null}

      {peopleScoutProfile ? (
        <PeopleScoutDetailDrawer
          open={isPeopleScoutDrawerOpen}
          profile={peopleScoutProfile}
          onClose={() => {
            clearRevealContactNotice();
            setIsPeopleScoutDrawerOpen(false);
          }}
          onRevealEmail={() => void revealPeopleScoutContactFromApi("EMAIL")}
          onRevealPhone={() => void revealPeopleScoutContactFromApi("PHONE")}
          emailRevealed={peopleScoutRevealEmail}
          phoneRevealed={peopleScoutRevealPhone}
          emailRevealBusy={peopleScoutRevealEmailBusy}
          phoneRevealBusy={peopleScoutRevealPhoneBusy}
          contactRevealNotice={revealContactNotice}
        />
      ) : null}

      <ApplyFiltersSessionChoiceModal
        open={applySessionChoiceOpen}
        onClose={() => setApplySessionChoiceOpen(false)}
        onChoose={(mode) => void executeApplySearchFilters(mode)}
      />

      <UserActionAlertModal
        open={userActionAlert.alert.open}
        message={userActionAlert.alert.message}
        isQuotaExceeded={userActionAlert.alert.isQuotaExceeded}
        onClose={userActionAlert.close}
        onViewPlans={() => {
          userActionAlert.close();
          navigateToTab("Plans and pricing");
        }}
      />

      <DashboardToast
        message={dashboardToast?.message ?? ""}
        variant={dashboardToast?.variant ?? "warning"}
        onDismiss={() => setDashboardToast(null)}
      />

    </main>
  );
}
