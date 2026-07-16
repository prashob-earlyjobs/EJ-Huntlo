"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import { quotaAlertFromMessage } from "@/lib/apiErrors";
import { downloadSavedCandidatesCsv } from "@/lib/exportSavedCandidatesCsv";
import {
  bulkRevealContacts,
  lookupRevealedContacts,
  normalizeLinkedinUrl,
  preflightBulkRevealContacts,
  type BulkRevealResult,
} from "@/lib/revealContactsApi";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

export type SavedExportCandidate = {
  /** Stable selection / identity key for this export session. */
  key: string;
  /** Matches dashboard candidateRowKey (candidateId || name) for reveal state. */
  rowKey: string;
  name: string;
  role: string;
  currentCompany: string;
  location: string;
  experience: string;
  finalScore: number | null;
  sourcingSessionId: string;
  linkedin_profile_url: string;
  email: string;
  phone: string;
};

type RevealMode = "any" | "email" | "phone" | "both";

type Step = "summary" | "reveal";

type Props = {
  open: boolean;
  listFilter: string;
  /** Known contacts from current session UI (by dashboard rowKey). */
  knownContactsByKey?: Record<string, { email?: string; phone?: string }>;
  onClose: () => void;
  onNotice?: (message: string) => void;
  onQuotaExceeded?: (message: string) => void;
  onContactsRevealed?: (
    updates: {
      rowKey: string;
      linkedinUrl?: string;
      email?: string;
      phone?: string;
    }[]
  ) => void;
};

function formatScore(score: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return "—";
  return `${score}/5`;
}

function contactCell(value: string) {
  return value.trim() ? "✓" : "Missing";
}

function summarizeMissing(rows: SavedExportCandidate[]) {
  let missingEmailOnly = 0;
  let missingPhoneOnly = 0;
  let missingBoth = 0;
  for (const row of rows) {
    const hasEmail = Boolean(row.email.trim());
    const hasPhone = Boolean(row.phone.trim());
    if (!hasEmail && !hasPhone) missingBoth += 1;
    else if (!hasEmail) missingEmailOnly += 1;
    else if (!hasPhone) missingPhoneOnly += 1;
  }
  return { missingEmailOnly, missingPhoneOnly, missingBoth };
}

async function fetchAllSavedCandidates(
  token: string,
  listFilter: string
): Promise<SavedExportCandidate[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const mapRow = (row: Record<string, unknown>): SavedExportCandidate => {
    const candidateId = typeof row.candidateId === "string" ? row.candidateId.trim() : "";
    const sourcingSessionId =
      typeof row.sourcingSessionId === "string" ? row.sourcingSessionId.trim() : "";
    const linkedin =
      typeof row.linkedin_profile_url === "string" ? row.linkedin_profile_url.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "Unnamed candidate";
    const key = candidateId
      ? `id:${sourcingSessionId}:${candidateId}`
      : linkedin
        ? `li:${sourcingSessionId}:${linkedin}`
        : `name:${name.toLowerCase()}`;
    return {
      key,
      rowKey: candidateId || name,
      name,
      role: typeof row.role === "string" ? row.role : "",
      currentCompany: typeof row.currentCompany === "string" ? row.currentCompany : "",
      location: typeof row.location === "string" ? row.location : "",
      experience: typeof row.experience === "string" ? row.experience : "",
      finalScore: typeof row.finalScore === "number" ? row.finalScore : null,
      sourcingSessionId,
      linkedin_profile_url: linkedin,
      email: "",
      phone: "",
    };
  };

  const fetchPage = async (page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "100",
      listFilter,
    });
    const res = await fetch(`${apiBase}/api/candidates/saved?${params}`, {
      headers: authHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !Array.isArray(data.candidates)) {
      throw new Error(
        typeof data.message === "string" ? data.message : "Failed to load saved candidates"
      );
    }
    const pg = data.pagination as { totalPages?: number } | undefined;
    const totalPages =
      typeof pg?.totalPages === "number" && pg.totalPages > 0 ? pg.totalPages : 1;
    return {
      rows: (data.candidates as Record<string, unknown>[]).map(mapRow),
      totalPages,
    };
  };

  const first = await fetchPage(1);
  if (first.totalPages <= 1) return first.rows;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) => fetchPage(i + 2))
  );
  return [...first.rows, ...rest.flatMap((p) => p.rows)];
}

function mergeContactsIntoRows(
  rows: SavedExportCandidate[],
  lookup: Record<string, { email?: string; phone?: string }>,
  knownByKey?: Record<string, { email?: string; phone?: string }>
): SavedExportCandidate[] {
  return rows.map((row) => {
    const cached = lookup[normalizeLinkedinUrl(row.linkedin_profile_url)];
    const known = knownByKey?.[row.rowKey];
    return {
      ...row,
      email: (cached?.email || known?.email || row.email || "").trim(),
      phone: (cached?.phone || known?.phone || row.phone || "").trim(),
    };
  });
}

function revealTypesForMode(mode: RevealMode): ("EMAIL" | "PHONE")[] {
  if (mode === "email") return ["EMAIL"];
  if (mode === "phone") return ["PHONE"];
  return ["EMAIL", "PHONE"];
}

function needsReveal(row: SavedExportCandidate, mode: RevealMode): boolean {
  const hasEmail = Boolean(row.email.trim());
  const hasPhone = Boolean(row.phone.trim());
  if (mode === "email") return !hasEmail;
  if (mode === "phone") return !hasPhone;
  if (mode === "any") return !hasEmail && !hasPhone;
  return !hasEmail || !hasPhone;
}

function countRevealCreditsNeeded(
  rows: SavedExportCandidate[],
  mode: RevealMode
): { emailNeeded: number; phoneNeeded: number } {
  let emailNeeded = 0;
  let phoneNeeded = 0;
  for (const row of rows) {
    const hasEmail = Boolean(row.email.trim());
    const hasPhone = Boolean(row.phone.trim());
    if (mode === "email") {
      if (!hasEmail) emailNeeded += 1;
    } else if (mode === "phone") {
      if (!hasPhone) phoneNeeded += 1;
    } else if (mode === "any") {
      if (!hasEmail && !hasPhone) {
        emailNeeded += 1;
        phoneNeeded += 1;
      }
    } else {
      if (!hasEmail) emailNeeded += 1;
      if (!hasPhone) phoneNeeded += 1;
    }
  }
  return { emailNeeded, phoneNeeded };
}

function applyBulkResults(
  rows: SavedExportCandidate[],
  results: BulkRevealResult[]
): SavedExportCandidate[] {
  const byUrl = new Map(
    results.map((r) => [normalizeLinkedinUrl(r.linkedin_profile_url), r])
  );
  return rows.map((row) => {
    const hit = byUrl.get(normalizeLinkedinUrl(row.linkedin_profile_url));
    if (!hit) return row;
    return {
      ...row,
      email: (hit.email || row.email || "").trim(),
      phone: (hit.phone || row.phone || "").trim(),
    };
  });
}

export function SavedExportModals({
  open,
  listFilter,
  knownContactsByKey,
  onClose,
  onNotice,
  onQuotaExceeded,
  onContactsRevealed,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("summary");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [skipReveal, setSkipReveal] = useState(false);
  const [rows, setRows] = useState<SavedExportCandidate[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [revealMode, setRevealMode] = useState<RevealMode>("both");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setLoadError("Please sign in again to export candidates.");
        return;
      }
      setLoading(true);
      setLoadError("");
      setStep("summary");
      setSkipReveal(false);
      setRevealMode("both");
      try {
        const fetched = await fetchAllSavedCandidates(auth.token, listFilter);
        const urls = fetched.map((r) => r.linkedin_profile_url).filter(Boolean);
        const lookup = await lookupRevealedContacts(auth.token, urls);
        if (cancelled) return;
        const merged = mergeContactsIntoRows(fetched, lookup, knownContactsByKey);
        setRows(merged);
        setSelectedKeys(merged.map((r) => r.key));
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setSelectedKeys([]);
        setLoadError(
          err instanceof Error ? err.message : "Failed to prepare export."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Intentionally omit knownContactsByKey — snapshot at open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listFilter]);

  const missing = useMemo(() => summarizeMissing(rows), [rows]);
  const hasAnyMissing =
    missing.missingEmailOnly > 0 ||
    missing.missingPhoneOnly > 0 ||
    missing.missingBoth > 0;

  const allSelected =
    rows.length > 0 && selectedKeys.length === rows.length;
  const someSelected = selectedKeys.length > 0 && !allSelected;

  const downloadRows = (exportRows: SavedExportCandidate[]) => {
    downloadSavedCandidatesCsv(
      exportRows.map((row) => ({
        name: row.name,
        role: row.role,
        currentCompany: row.currentCompany,
        location: row.location,
        experience: row.experience,
        finalScore: row.finalScore,
        email: row.email,
        phone: row.phone,
        linkedin_profile_url: row.linkedin_profile_url,
      })),
      "saved_candidates.csv"
    );
  };

  const handleSummaryContinue = () => {
    if (loading || submitting || rows.length === 0) return;
    if (skipReveal || !hasAnyMissing) {
      downloadRows(rows);
      onNotice?.(
        `Exported ${rows.length} candidate${rows.length === 1 ? "" : "s"}.`
      );
      onClose();
      return;
    }
    setStep("reveal");
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    if (allSelected) setSelectedKeys([]);
    else setSelectedKeys(rows.map((r) => r.key));
  };

  const handleRevealExport = async () => {
    if (submitting) return;
    const selected = rows.filter((r) => selectedKeys.includes(r.key));
    if (selected.length === 0) {
      setLoadError("Select at least one candidate to export.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoadError("Please sign in again to export candidates.");
      return;
    }

    const toReveal = selected.filter((r) => needsReveal(r, revealMode));
    const types = revealTypesForMode(revealMode);

    setSubmitting(true);
    setLoadError("");
    try {
      let working = [...selected];
      if (toReveal.length > 0) {
        const items = toReveal
          .filter((r) => r.linkedin_profile_url && r.sourcingSessionId)
          .map((r) => ({
            sourcingSessionId: r.sourcingSessionId,
            linkedin_profile_url: r.linkedin_profile_url,
          }));

        // Full-batch quota check first — counts only, never start a partial unveil run.
        try {
          await preflightBulkRevealContacts(
            auth.token,
            countRevealCreditsNeeded(toReveal, revealMode)
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Reveal quota check failed";
          if (quotaAlertFromMessage(message)) {
            onQuotaExceeded?.(message);
            return;
          }
          throw err;
        }

        onNotice?.(
          "Contacts are revealing in the background. Your CSV will download when ready."
        );
        onClose();

        const allResults: BulkRevealResult[] = [];
        const CHUNK = 50;
        for (let i = 0; i < items.length; i += CHUNK) {
          const chunk = items.slice(i, i + CHUNK);
          try {
            const { results } = await bulkRevealContacts(auth.token, chunk, types);
            allResults.push(...results);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Bulk reveal failed";
            if (quotaAlertFromMessage(message)) {
              onQuotaExceeded?.(message);
              return;
            }
            throw err;
          }
        }

        working = applyBulkResults(working, allResults);
        onContactsRevealed?.(
          working.map((row) => ({
            rowKey: row.rowKey,
            linkedinUrl: row.linkedin_profile_url,
            email: row.email || undefined,
            phone: row.phone || undefined,
          }))
        );
      }

      downloadRows(working);
      onNotice?.(
        `Exported ${working.length} candidate${working.length === 1 ? "" : "s"}.`
      );
      if (toReveal.length === 0) onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export candidates.";
      if (quotaAlertFromMessage(message)) {
        onQuotaExceeded?.(message);
        return;
      }
      if (toReveal.length === 0) {
        setLoadError(message);
      } else {
        onNotice?.(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  const revealOptions: { id: RevealMode; label: string }[] = [
    { id: "any", label: "Any Contact" },
    { id: "email", label: "Email only" },
    { id: "phone", label: "Phone only" },
    { id: "both", label: "Email & Phone" },
  ];

  const content =
    step === "summary" ? (
      <div
        className="dashboard-modal dashboard-saved-export-modal mx-auto flex w-full max-w-lg flex-col p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-export-summary-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 pr-3">
            <h3 id="saved-export-summary-title" className="dashboard-section-title text-lg">
              Export candidates
            </h3>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="dashboard-text-body text-sm">Preparing export…</p>
          ) : loadError ? (
            <p className="dashboard-alert-warning" role="alert">
              {loadError}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#141b2b]">
                You have {rows.length.toLocaleString()} candidate
                {rows.length === 1 ? "" : "s"} ready to export.
              </p>

              {hasAnyMissing ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-[#5f4100]">
                  <p className="font-semibold">Some candidates are missing contact details:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {missing.missingEmailOnly > 0 ? (
                      <li>
                        {missing.missingEmailOnly.toLocaleString()} missing email
                      </li>
                    ) : null}
                    {missing.missingPhoneOnly > 0 ? (
                      <li>
                        {missing.missingPhoneOnly.toLocaleString()} missing phone
                      </li>
                    ) : null}
                    {missing.missingBoth > 0 ? (
                      <li>
                        {missing.missingBoth.toLocaleString()} missing both email and
                        phone
                      </li>
                    ) : null}
                  </ul>
                  <p className="mt-3 text-[#5f4100]/opacity-90">
                    On the next step you can choose which contacts to reveal before
                    exporting, or continue and export with existing data only.
                  </p>
                </div>
              ) : (
                <p className="mt-3 dashboard-text-body text-sm">
                  Contact details look complete for this list. Continue to download
                  your CSV.
                </p>
              )}

              {hasAnyMissing ? (
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[#141b2b]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 accent-[#0050cb]"
                    checked={skipReveal}
                    onChange={(e) => setSkipReveal(e.target.checked)}
                  />
                  Skip reveal process
                </label>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            onClick={handleSummaryContinue}
            disabled={loading || submitting || rows.length === 0 || Boolean(loadError)}
          >
            Continue
          </button>
        </div>
      </div>
    ) : (
      <div
        className="dashboard-modal dashboard-saved-export-modal dashboard-saved-export-modal--wide mx-auto flex w-full max-w-3xl flex-col p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-export-reveal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 pr-3">
            <h3 id="saved-export-reveal-title" className="dashboard-section-title text-lg">
              Choose candidates &amp; contacts to reveal
            </h3>
            <p className="mt-1 dashboard-text-body text-sm">
              Uncheck any candidates you don&apos;t want to include in the export.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loadError ? (
            <p className="dashboard-alert-warning mb-3" role="alert">
              {loadError}
            </p>
          ) : null}

          <div className="dashboard-saved-export-table-wrap">
            <table className="dashboard-saved-export-table">
              <thead>
                <tr>
                  <th scope="col" className="dashboard-saved-export-check-col">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-[#0050cb]"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      aria-label="Select all candidates"
                    />
                  </th>
                  <th scope="col">Name</th>
                  <th scope="col">Score</th>
                  <th scope="col">Email?</th>
                  <th scope="col">Phone?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const checked = selectedKeys.includes(row.key);
                  return (
                    <tr key={row.key} data-selected={checked ? "true" : "false"}>
                      <td>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 accent-[#0050cb]"
                          checked={checked}
                          onChange={() => toggleKey(row.key)}
                          aria-label={`Include ${row.name}`}
                        />
                      </td>
                      <td className="font-medium text-[#141b2b]">{row.name}</td>
                      <td className="tabular-nums text-slate-600">
                        {formatScore(row.finalScore)}
                      </td>
                      <td
                        className={
                          row.email.trim()
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {contactCell(row.email)}
                      </td>
                      <td
                        className={
                          row.phone.trim()
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {contactCell(row.phone)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <fieldset className="mt-4 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-[#141b2b]">
              Contacts to reveal before exporting
            </legend>
            <div className="dashboard-add-campaign-reveal-options">
              {revealOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`dashboard-add-campaign-reveal-option${
                    revealMode === opt.id
                      ? " dashboard-add-campaign-reveal-option--active"
                      : ""
                  }`}
                  onClick={() => setRevealMode(opt.id)}
                  disabled={submitting}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Contacts will be revealed in the background. Your CSV will be sent by email
              once the reveal and export are complete.
            </p>
          </fieldset>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={() => setStep("summary")}
            disabled={submitting}
          >
            Back
          </button>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            onClick={() => void handleRevealExport()}
            disabled={submitting || selectedKeys.length === 0}
          >
            <ButtonLoadingContent loading={submitting} loadingLabel="Exporting">
              Continue
            </ButtonLoadingContent>
          </button>
        </div>
      </div>
    );

  return createPortal(
    <div
      className="dashboard-modal-overlay dashboard-add-campaign-overlay z-[120]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      {content}
    </div>,
    document.body
  );
}
