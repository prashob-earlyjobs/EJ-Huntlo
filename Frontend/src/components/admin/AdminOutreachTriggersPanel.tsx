"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchAdminUpcomingOutreachTriggers,
  type AdminOutreachTrigger,
  type AdminOutreachTriggerPhase,
} from "@/lib/adminOutreachApi";

type Props = {
  token: string;
};

const PAGE_SIZE = 25;

const PHASE_OPTIONS: { value: AdminOutreachTriggerPhase; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

function formatChannelLabel(channel: string): string {
  const key = channel.trim().toLowerCase();
  if (key === "whatsapp") return "WhatsApp";
  if (key === "email") return "Email";
  if (key === "voice") return "Voice";
  return channel.trim() || "—";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function rowWhenLabel(row: AdminOutreachTrigger): string {
  if (row.isManual) return "Manual";
  if (row.triggerPhase === "completed") {
    return formatWhen(row.completedAt || row.lastSentAt);
  }
  return formatWhen(row.nextSendAt);
}

export function AdminOutreachTriggersPanel({ token }: Props) {
  const [triggers, setTriggers] = useState<AdminOutreachTrigger[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    due: 0,
    upcoming: 0,
    projected: 0,
    completed: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [phase, setPhase] = useState<AdminOutreachTriggerPhase>("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminUpcomingOutreachTriggers(token, {
        page,
        limit: PAGE_SIZE,
        dueOnly: phase === "upcoming" ? dueOnly : false,
        phase,
      });
      setTriggers(data.triggers);
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
      setTotalDocs(data.pagination.total);
      if (data.pagination.page !== page) {
        setPage(data.pagination.page);
      }
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load triggers");
    } finally {
      setLoading(false);
    }
  }, [token, dueOnly, page, phase]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDueOnlyChange = (checked: boolean) => {
    setDueOnly(checked);
    setPage(1);
  };

  const handlePhaseChange = (next: AdminOutreachTriggerPhase) => {
    setPhase(next);
    setPage(1);
    if (next !== "upcoming") {
      setDueOnly(false);
    }
  };

  const emptyMessage =
    phase === "completed"
      ? "No completed triggers found."
      : phase === "all"
        ? "No triggers found."
        : dueOnly
          ? "No due triggers found."
          : "No upcoming triggers found.";

  return (
    <article className="dashboard-card dashboard-admin-scroll-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="dashboard-section-title">Outreach triggers</h3>
          <p className="mt-1 dashboard-text-body">
            Live send queue for active outreach campaigns — one row per candidate&apos;s next step.
            Counts exclude future projected steps. Old test launches may still appear until their
            queue finishes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only">Filter by phase</span>
            <select
              value={phase}
              onChange={(e) => handlePhaseChange(e.target.value as AdminOutreachTriggerPhase)}
              className="dashboard-select dashboard-admin-toolbar-select"
            >
              {PHASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {phase === "upcoming" ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dueOnly}
                onChange={(e) => handleDueOnlyChange(e.target.checked)}
              />
              Due only
            </label>
          ) : null}
          <button type="button" onClick={() => void load()} className="dashboard-btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 dashboard-alert-error">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
        <span>
          <strong className="text-slate-800">{summary.total}</strong> total
        </span>
        {phase !== "completed" ? (
          <>
            <span>
              <strong className="text-amber-700">{summary.due}</strong> due now
            </span>
            <span>
              <strong className="text-slate-800">{summary.upcoming}</strong> scheduled
            </span>
            {summary.projected > 0 ? (
              <span>
                <strong className="text-slate-500">{summary.projected}</strong> projected
              </span>
            ) : null}
          </>
        ) : null}
        {phase !== "upcoming" ? (
          <span>
            <strong className="text-emerald-700">{summary.completed}</strong> completed
          </span>
        ) : null}
        {generatedAt ? (
          <span className="text-slate-500">Updated {formatWhen(generatedAt)}</span>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading triggers…</p>
      ) : triggers.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Campaign</th>
                  <th className="px-3 py-2 font-semibold">Candidate</th>
                  <th className="px-3 py-2 font-semibold">Channel</th>
                  <th className="px-3 py-2 font-semibold">Step</th>
                  <th className="px-3 py-2 font-semibold">Owner</th>
                  <th className="px-3 py-2 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {triggers.map((row) => (
                  <tr
                    key={row.triggerKey || `${row.enrollmentId}:${row.currentStepOrder}`}
                    className={
                      row.isFailed
                        ? "bg-red-50/50"
                        : row.triggerPhase === "completed"
                          ? "bg-emerald-50/40"
                          : row.isManual
                            ? "bg-violet-50/40"
                            : row.isDue
                              ? "bg-amber-50/60"
                              : row.isProjected
                                ? "bg-slate-50/50"
                                : undefined
                    }
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={
                          row.isFailed
                            ? "text-red-800"
                            : row.isManual
                              ? "text-violet-800"
                              : row.isDue
                                ? "font-medium text-amber-800"
                                : row.triggerPhase === "completed"
                                  ? "text-emerald-800"
                                  : ""
                        }
                      >
                        {rowWhenLabel(row)}
                      </span>
                      {row.isFailed ? (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-800">
                          Failed
                        </span>
                      ) : row.isManual ? (
                        <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-800">
                          Manual
                        </span>
                      ) : row.triggerPhase === "completed" ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                          Completed
                        </span>
                      ) : row.isDue ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                          Due
                        </span>
                      ) : row.isProjected ? (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          Projected
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{row.campaignName || "—"}</div>
                      <div className="text-xs text-slate-500">{row.campaignStatus || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{row.candidateName || "—"}</div>
                      <div className="text-xs text-slate-500">
                        {[row.candidateEmail, row.candidatePhone].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">
                      {formatChannelLabel(row.channel)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{row.stepLabel}</div>
                      <div className="text-xs text-slate-500">
                        {row.queueTotal > 1
                          ? `Step ${row.currentStepOrder} of ${row.queueTotal}`
                          : `Step ${row.currentStepOrder}`}
                        {row.triggerPhase === "completed" && !row.isFailed ? " · sent" : ""}
                        {row.isFailed ? " · not sent" : ""}
                        {row.condition ? ` · ${row.condition}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.ownerName || row.ownerEmail || "—"}</div>
                      {row.ownerName && row.ownerEmail ? (
                        <div className="text-xs text-slate-500">{row.ownerEmail}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      <div>
                        {row.enrollmentStatus || "—"}
                        {row.isFailed ? " · failed" : row.triggerPhase === "completed" ? " · sent" : ""}
                      </div>
                      <div>
                        sent {row.sentCount} · replies {row.replyCount}
                      </div>
                      {row.isFailed && row.lastError ? (
                        <div className="mt-1 text-red-700" title={row.lastError}>
                          {row.lastError.length > 120
                            ? `${row.lastError.slice(0, 120)}…`
                            : row.lastError}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {totalDocs > 0
                ? `Showing page ${page} of ${totalPages} (${totalDocs} trigger${totalDocs === 1 ? "" : "s"}, ${phase}${dueOnly ? ", due only" : ""})`
                : emptyMessage}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={loading || page <= 1}
                className="dashboard-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={loading || page >= totalPages}
                className="dashboard-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
