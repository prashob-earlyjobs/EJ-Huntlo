"use client";

import { useCallback, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchCampaignEmailReport,
  type CampaignEmailReport,
  type EmailReportActivity,
} from "@/lib/campaignEmailReport";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  campaignId: string;
  variant: "report" | "activity";
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function activityIcon(type: EmailReportActivity["type"]) {
  switch (type) {
    case "interested":
      return { name: "thumb_up", className: "text-emerald-600" };
    case "not_interested":
      return { name: "thumb_down", className: "text-rose-600" };
    case "reply":
      return { name: "reply", className: "text-[#0050cb]" };
    case "failed":
      return { name: "error", className: "text-rose-600" };
    case "skipped":
      return { name: "block", className: "text-slate-500" };
    default:
      return { name: "send", className: "text-slate-600" };
  }
}

function matrixTone(key: string): string {
  if (key === "interested") return "dashboard-campaign-report-cell--positive";
  if (key === "not_interested" || key === "not_delivered") {
    return "dashboard-campaign-report-cell--negative";
  }
  if (key === "replied") return "dashboard-campaign-report-cell--primary";
  return "";
}

export function CampaignEmailReportPanel({ campaignId, variant }: Props) {
  const [report, setReport] = useState<CampaignEmailReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setError("Sign in to view campaign metrics.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchCampaignEmailReport(auth.token, campaignId);
      setReport(data);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "Could not load report.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="dashboard-campaign-report-panel flex flex-1 flex-col p-6">
        <div className="dashboard-campaign-report-skeleton grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dashboard-campaign-report-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="dashboard-alert-error text-sm">{error}</p>
        <button type="button" className={dashboardBtnSecondaryClass} onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!report) return null;

  if (report.channel === "whatsapp" && report.note) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <MaterialIcon name="chat" className="text-4xl text-[#25D366]" />
        <p className="dashboard-text-body max-w-md text-sm text-slate-600">{report.note}</p>
      </div>
    );
  }

  if (variant === "activity") {
    return (
      <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-[#141b2b]">Recent activity</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Sends, replies, and delivery issues for this campaign
          </p>
        </div>
        <div className="dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {report.recentActivity.length === 0 ? (
            <div className="dashboard-campaign-workspace-placeholder-wrap py-16">
              <MaterialIcon name="history" className="mb-2 text-4xl text-[#80868b]" />
              <p className="dashboard-campaign-workspace-placeholder">
                No activity yet. Launch the sequence to start sending.
              </p>
            </div>
          ) : (
            <ul className="dashboard-campaign-report-activity-list">
              {report.recentActivity.map((item, index) => {
                const icon = activityIcon(item.type);
                return (
                  <li
                    key={`${item.candidateKey}-${item.type}-${item.at}-${index}`}
                    className="dashboard-campaign-report-activity-item"
                  >
                    <span
                      className={`dashboard-campaign-report-activity-icon ${icon.className}`}
                      aria-hidden
                    >
                      <MaterialIcon name={icon.name} className="text-[20px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#141b2b]">{item.contactName}</p>
                      <p className="text-xs text-slate-600">{item.detail}</p>
                      {item.contactEmail ? (
                        <p className="truncate text-xs text-slate-500">{item.contactEmail}</p>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-xs text-slate-500" dateTime={item.at}>
                      {formatWhen(item.at)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const headline = [
    { label: "Contacts", value: report.totalContacts },
    { label: "With email", value: report.contactsWithEmail },
    { label: "Enrolled", value: report.enrolled },
    { label: "Sent", value: report.sent },
  ];

  return (
    <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#141b2b]">Email performance</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Rates use sent emails as the baseline where applicable
            </p>
          </div>
          <button
            type="button"
            className={`${dashboardBtnSecondaryClass} px-2.5 py-1 text-xs`}
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {headline.map((item) => (
            <div key={item.label} className="dashboard-campaign-report-headline-stat">
              <dt className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">
                {item.label}
              </dt>
              <dd className="text-lg font-semibold text-[#141b2b]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="dashboard-campaign-report-matrix overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="dashboard-campaign-report-matrix-header grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            <span>Metric</span>
            <span className="text-right">Count</span>
            <span className="text-right w-16">Rate</span>
          </div>
          {report.matrix.map((row) => (
            <div
              key={row.key}
              className={`dashboard-campaign-report-matrix-row grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-slate-100 px-4 py-3 last:border-b-0 ${matrixTone(row.key)}`}
              title={row.description}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#141b2b]">{row.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>
              </div>
              <p className="self-center text-right text-sm font-semibold tabular-nums text-[#141b2b]">
                {row.count}
              </p>
              <p className="self-center w-16 text-right text-sm tabular-nums text-slate-600">
                {row.key === "sent" && row.count === 0 ? "—" : `${row.rate}%`}
              </p>
            </div>
          ))}
        </div>

        {report.enrolled === 0 ? (
          <p className="dashboard-alert-notice mt-4 text-sm">
            Launch the campaign sequence to enroll contacts and populate these metrics.
          </p>
        ) : null}
      </div>
    </div>
  );
}
