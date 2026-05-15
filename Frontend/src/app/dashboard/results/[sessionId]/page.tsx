"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { authHeaders, getStoredAuth } from "@/lib/auth";

type ProfileDoc = {
  _id?: string;
  finalScore?: number;
  profile?: {
    name?: string;
    region?: string;
    years_of_experience_raw?: number;
    linkedin_profile_url?: string;
    skills?: string[];
    current_employers_object?: { company_name?: string; job_title?: string }[];
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
  }, [limit, router, sessionId]);

  return (
    <main className="premium-shell min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Session results
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-black">Candidates</h1>
            <p className="mt-1 text-sm text-slate-600">
              {totalDocs ?? 0} total candidates · Page {pageLabel}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>

        {isLoading ? (
          <section className="premium-card rounded-2xl p-6 text-sm text-slate-600">
            Loading session results...
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && docs.length === 0 ? (
          <section className="premium-card rounded-2xl p-6 text-sm text-slate-600">
            No candidates returned for this session.
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {docs.map((doc) => {
              const strengths = doc.profileAnalysis?.analysis?.keyStrengths ?? [];
              const highlights = doc.profileAnalysis?.highlights ?? [];
              const current = doc.profile?.current_employers_object?.[0];
              return (
                <article
                  key={doc._id || `${doc.profile?.linkedin_profile_url || Math.random()}`}
                  className="premium-card rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-black">
                        {doc.profile?.name || "Unnamed candidate"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {current?.job_title || "Role unavailable"}
                        {current?.company_name ? ` · ${current.company_name}` : ""}
                      </p>
                    </div>
                    {typeof doc.finalScore === "number" ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Score {doc.finalScore}/5
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {doc.profile?.region || "Location unavailable"}
                    {typeof doc.profile?.years_of_experience_raw === "number"
                      ? ` · ${doc.profile.years_of_experience_raw} years`
                      : ""}
                  </p>

                  {highlights.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {highlights.slice(0, 5).map((h, i) => (
                        <span
                          key={`${h.Category || "highlight"}-${i}`}
                          className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                        >
                          {h.Category ? `${h.Category}: ` : ""}
                          {h.Highlight || "—"}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {doc.profileAnalysis?.recommendation ? (
                    <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {doc.profileAnalysis.recommendation}
                    </p>
                  ) : null}

                  {strengths.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {strengths.slice(0, 3).map((s, i) => (
                        <li key={`${doc._id || "doc"}-strength-${i}`}>
                          <span className="font-semibold text-slate-900">- </span>
                          {s.observation || "Strength"}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {doc.profile?.linkedin_profile_url ? (
                    <a
                      href={doc.profile.linkedin_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Open LinkedIn
                    </a>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}
