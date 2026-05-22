"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BlockedAccountModal } from "@/components/dashboard/BlockedAccountModal";
import {
  SessionResultCandidateCard,
  type SessionResultCardData,
} from "@/components/dashboard/SessionResultCandidateCard";
import { SessionResultsSkeleton } from "@/components/dashboard/SessionResultsSkeleton";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import { isOpenToWork } from "@/lib/openToWork";
import { useBlockedAccountGuard } from "@/lib/useBlockedAccountGuard";

type ProfileDoc = {
  _id?: string;
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
    }[];
  };
  profileAnalysis?: {
    analysis?: {
      keyStrengths?: { observation?: string; evidence?: string }[];
      keyWeaknesses?: { observation?: string; evidence?: string }[];
    };
    highlights?: { Category?: string; Highlight?: string }[];
    recommendation?: string;
  };
};

type ProfilesResponse = {
  success?: boolean;
  message?: string;
  profilesPagination?: { totalDocs?: number; page?: number; totalPages?: number };
  futureJobsProfiles?: { data?: { docs?: ProfileDoc[] } };
};

function docToCardData(doc: ProfileDoc, idx: number): SessionResultCardData {
  const current = doc.profile?.current_employers_object?.[0];
  return {
    id: doc._id || `doc-${idx}`,
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

export default function SessionResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = useMemo(
    () => (typeof params?.sessionId === "string" ? params.sessionId : ""),
    [params]
  );
  const limit = useMemo(() => {
    const n = Number(searchParams.get("limit"));
    return Number.isFinite(n) && n > 0 ? Math.min(100, Math.floor(n)) : 20;
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState<ProfileDoc[]>([]);
  const [totalDocs, setTotalDocs] = useState<number | null>(null);
  const [pageLabel, setPageLabel] = useState("1");
  const { blocked: accountBlocked, onApiResponse } = useBlockedAccountGuard();

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      router.replace("/login");
      return;
    }
    if (!sessionId) {
      setError("Missing session id.");
      setIsLoading(false);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const url = `${apiBase}/api/candidates/session/${encodeURIComponent(sessionId)}/profiles?page=1&limit=${limit}&fetchMore=1`;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: authHeaders(auth.token),
        });
        const data = (await res.json().catch(() => ({}))) as ProfilesResponse;
        if (onApiResponse(res, data)) return;
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load results");
        }
        const rows = Array.isArray(data.futureJobsProfiles?.data?.docs)
          ? data.futureJobsProfiles?.data?.docs
          : [];
        setDocs(rows);
        setTotalDocs(
          typeof data.profilesPagination?.totalDocs === "number"
            ? data.profilesPagination.totalDocs
            : rows.length
        );
        setPageLabel(
          `${data.profilesPagination?.page ?? 1}${
            typeof data.profilesPagination?.totalPages === "number"
              ? ` of ${data.profilesPagination.totalPages}`
              : ""
          }`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load results");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [limit, onApiResponse, router, sessionId]);

  return (
    <main className="dashboard-page min-h-screen">
      <BlockedAccountModal open={accountBlocked} />
      <header className="dashboard-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-block">
            <LandingLogo className="h-9 w-auto" />
          </Link>
          <Link href="/dashboard" className="dashboard-btn-secondary">
            <MaterialIcon name="arrow_back" className="text-base" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="dashboard-results-toolbar">
          <div>
            <p className="dashboard-header-eyebrow">Session results</p>
            <h1 className="dashboard-header-title">Candidates</h1>
            <p className="mt-1 dashboard-text-body">
              Sourcing session{" "}
              <span className="font-mono text-xs text-[#424656]/80">{sessionId}</span>
            </p>
          </div>
          {!isLoading && !error ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="dashboard-badge tabular-nums">
                {totalDocs ?? 0} candidate{(totalDocs ?? 0) === 1 ? "" : "s"}
              </span>
              <span className="dashboard-badge tabular-nums">Page {pageLabel}</span>
            </div>
          ) : null}
        </div>

        {isLoading ? <SessionResultsSkeleton count={6} /> : null}

        {error ? <p className="dashboard-alert-error">{error}</p> : null}

        {!isLoading && !error && docs.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-state-icon">
              <MaterialIcon name="person_search" className="text-[28px]" />
            </div>
            <p className="mt-4 text-base font-semibold text-[#141b2b]">No candidates found</p>
            <p className="mt-2 max-w-sm text-sm text-[#424656]">
              This session did not return any profile results. Try another search or adjust your
              filters.
            </p>
            <Link href="/dashboard" className="dashboard-btn-primary mt-6">
              Return to dashboard
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && docs.length > 0 ? (
          <section className="dashboard-results-grid">
            {docs.map((doc, idx) => (
              <SessionResultCandidateCard
                key={doc._id || `session-doc-${idx}`}
                data={docToCardData(doc, idx)}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
