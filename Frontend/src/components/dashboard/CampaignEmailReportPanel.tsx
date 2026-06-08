"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  activityToFeedItem,
  sortFeedItems,
  unveilFieldStatusClass,
  unveilFieldStatusLabel,
  type CampaignFeedItem,
} from "@/lib/campaignActivityFeed";
import type { CampaignRevealFieldStatus, CampaignRevealJob } from "@/lib/campaignRevealJob";
import {
  CAMPAIGN_ACTIVITY_PAGE_SIZE,
  fetchCampaignEmailReport,
  fetchCampaignEmailReportActivity,
  isReportMetricKey,
  type CampaignEmailReport,
  type CampaignEmailReportActivityResponse,
  type EmailReportActivity,
  type EmailReportMatrixRow,
  type ReportMetricCandidate,
  type ReportMetricKey,
} from "@/lib/campaignEmailReport";
import { downloadReportCandidatesExcel } from "@/lib/exportReportCandidatesExcel";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  campaignId: string;
  variant: "report" | "activity";
  revealInProgress?: boolean;
  revealJob?: CampaignRevealJob | null;
  reloadRevealJob?: () => void | Promise<unknown>;
  /** When set, show full-screen candidate list for this metric (URL-driven). */
  reportMetric?: ReportMetricKey | null;
  onOpenReportMetric?: (metric: ReportMetricKey) => void;
  onCloseReportMetric?: () => void;
  /** Navigate to WhatsApp tab with this contact's thread open. */
  onViewWhatsAppConversation?: (candidateKey: string) => void;
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
    case "unveil":
      return { name: "visibility", tone: "primary" as const };
    case "interested":
      return { name: "thumb_up", tone: "positive" as const };
    case "not_interested":
      return { name: "thumb_down", tone: "negative" as const };
    case "reply":
      return { name: "reply", tone: "primary" as const };
    case "failed":
      return { name: "error", tone: "negative" as const };
    case "skipped":
      return { name: "block", tone: "muted" as const };
    default:
      return { name: "send", tone: "muted" as const };
  }
}

function feedItemIcon(item: CampaignFeedItem) {
  if (item.kind === "unveil") {
    if (item.unveil?.isActive) {
      return { name: "visibility", tone: "primary" as const };
    }
    return { name: "visibility", tone: "positive" as const };
  }
  return activityIcon(item.outreachType || "sent");
}

function UnveilStatusBadge({
  label,
  status,
  value,
}: {
  label: string;
  status: CampaignRevealFieldStatus;
  value: string;
}) {
  if (status === "not_requested") return null;
  return (
    <span className={`dashboard-campaign-unveil-status ${unveilFieldStatusClass(status)}`}>
      <span className="dashboard-campaign-unveil-status-label">{label}</span>
      <span className="dashboard-campaign-unveil-status-value">
        {status === "revealed" && value ? value : unveilFieldStatusLabel(status)}
      </span>
    </span>
  );
}

function matrixMeta(key: string): {
  tone: "default" | "primary" | "positive" | "negative";
  icon: string;
} {
  switch (key) {
    case "interested":
      return { tone: "positive", icon: "thumb_up" };
    case "not_interested":
    case "not_delivered":
      return { tone: "negative", icon: key === "not_delivered" ? "error" : "thumb_down" };
    case "replied":
      return { tone: "primary", icon: "reply" };
    case "awaiting_reply":
      return { tone: "default", icon: "schedule" };
    default:
      return { tone: "default", icon: "send" };
  }
}

function outreachStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return "Not launched";
}

function outreachStatusClass(status: string) {
  if (status === "active") return "dashboard-campaign-report-status-pill--active";
  if (status === "paused") return "dashboard-campaign-report-status-pill--paused";
  if (status === "completed") return "dashboard-campaign-report-status-pill--completed";
  return "dashboard-campaign-report-status-pill--idle";
}

function UnifiedActivityList({
  items,
  loading,
}: {
  items: CampaignFeedItem[];
  loading?: boolean;
}) {
  if (items.length === 0 && !loading) {
    return (
      <div className="dashboard-campaign-report-empty">
        <MaterialIcon name="history" className="text-4xl text-[#80868b]" aria-hidden />
        <p className="dashboard-campaign-workspace-placeholder">
          No activity yet. Unveil contacts when adding from search, or launch the sequence to
          start outreach.
        </p>
      </div>
    );
  }

  return (
    <ul
      className={`dashboard-campaign-report-activity-list${loading ? " dashboard-campaign-report-activity-list--loading" : ""}`}
      aria-busy={loading}
      aria-live="polite"
    >
      {items.map((item) => {
        const icon = feedItemIcon(item);
        const isUnveilActive = item.kind === "unveil" && item.unveil?.isActive;
        return (
          <li
            key={item.id}
            className={`dashboard-campaign-report-activity-item dashboard-campaign-report-activity-item--${icon.tone}${
              isUnveilActive ? " dashboard-campaign-report-activity-item--unveil-active" : ""
            }`}
          >
            <span
              className={`dashboard-campaign-report-activity-icon dashboard-campaign-report-activity-icon--${icon.tone}`}
              aria-hidden
            >
              {isUnveilActive ? (
                <span className="dashboard-reveal-spinner" />
              ) : (
                <MaterialIcon name={icon.name} className="text-[20px]" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="dashboard-campaign-report-activity-name">{item.contactName}</p>
              {item.kind === "unveil" && item.unveil ? (
                <div className="dashboard-campaign-report-activity-unveil-badges">
                  {item.unveil.revealTypes.includes("EMAIL") ? (
                    <UnveilStatusBadge
                      label="Email"
                      status={item.unveil.emailStatus}
                      value={item.unveil.email}
                    />
                  ) : null}
                  {item.unveil.revealTypes.includes("PHONE") ? (
                    <UnveilStatusBadge
                      label="Phone"
                      status={item.unveil.phoneStatus}
                      value={item.unveil.phone}
                    />
                  ) : null}
                </div>
              ) : null}
              {item.detail ? (
                <p className="dashboard-campaign-report-activity-detail">{item.detail}</p>
              ) : null}
              {item.kind === "outreach" && (item.contactPhone || item.contactEmail) ? (
                <p className="dashboard-campaign-report-activity-contact truncate">
                  {item.contactPhone || item.contactEmail}
                </p>
              ) : null}
            </div>
            <time
              className="dashboard-campaign-report-activity-time shrink-0 tabular-nums"
              dateTime={item.at}
            >
              {formatWhen(item.at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

function isUnveilJobActive(job: CampaignRevealJob | null | undefined): job is CampaignRevealJob {
  return job?.status === "pending" || job?.status === "running";
}

function unveilTypesLabel(revealTypes: CampaignRevealJob["revealTypes"]): string {
  const labels = revealTypes.map((type) => (type === "EMAIL" ? "Email" : "Phone"));
  if (labels.length === 0) return "Contact details";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} & ${labels[1]}`;
}

function unveilFoundSummary(job: CampaignRevealJob): string {
  const parts: string[] = [];
  if (job.revealTypes.includes("EMAIL")) {
    parts.push(
      `${job.revealedEmailCount} email${job.revealedEmailCount === 1 ? "" : "s"} found`
    );
  }
  if (job.revealTypes.includes("PHONE")) {
    parts.push(
      `${job.revealedPhoneCount} phone${job.revealedPhoneCount === 1 ? "" : "s"} found`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "Looking up contact details…";
}

function ActivityUnveilProgressBanner({ job }: { job: CampaignRevealJob }) {
  const total = Math.max(job.total, 1);
  const processed = Math.min(Math.max(job.processed, 0), total);
  const progressPct = Math.round((processed / total) * 100);

  return (
    <div
      className="dashboard-campaign-unveil-panel dashboard-campaign-unveil-panel--activity"
      role="status"
      aria-live="polite"
    >
      <div className="dashboard-campaign-unveil-panel-head">
        <div className="min-w-0">
          <h3 className="dashboard-campaign-unveil-panel-title inline-flex items-center gap-2">
            <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
            Unveiling contacts
          </h3>
          <p className="dashboard-campaign-unveil-panel-subtitle">
            {unveilTypesLabel(job.revealTypes)} · {unveilFoundSummary(job)}
          </p>
        </div>
        <span className="dashboard-campaign-unveil-panel-count shrink-0 tabular-nums">
          {processed} of {job.total}
        </span>
      </div>
      <div
        className="dashboard-campaign-unveil-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={job.total}
        aria-valuenow={processed}
        aria-label={`Unveil progress: ${processed} of ${job.total} contacts processed`}
      >
        <span
          className="dashboard-campaign-unveil-progress-bar"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

function CampaignActivityPanel({
  campaignId,
  revealInProgress = false,
  revealJob = null,
  reloadRevealJob,
}: {
  campaignId: string;
  revealInProgress?: boolean;
  revealJob?: CampaignRevealJob | null;
  reloadRevealJob?: () => void | Promise<unknown>;
}) {
  const [data, setData] = useState<CampaignEmailReportActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (targetPage: number, options?: { soft?: boolean }) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setError("Sign in to view campaign activity.");
        setLoading(false);
        return;
      }
      const soft = options?.soft === true;
      if (soft) {
        setPageLoading(true);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const result = await fetchCampaignEmailReportActivity(auth.token, campaignId, {
          page: targetPage,
          limit: CAMPAIGN_ACTIVITY_PAGE_SIZE,
        });
        setData(result);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load activity.");
      } finally {
        setLoading(false);
        setPageLoading(false);
      }
    },
    [campaignId]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const page = pagination?.page ?? 1;

  useEffect(() => {
    if (!revealInProgress) return;
    const interval = window.setInterval(() => {
      void load(page, { soft: true });
      void reloadRevealJob();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [revealInProgress, page, load, reloadRevealJob]);
  const total = pagination?.total ?? 0;
  const isWhatsApp = data?.channel === "whatsapp";
  const outreachStatus = data?.outreachStatus ?? "idle";

  const onPageChange = (nextPage: number) => {
    if (pageLoading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void load(nextPage, { soft: true });
  };

  const feedItems = useMemo(
    () => sortFeedItems((data?.activities ?? []).map(activityToFeedItem)),
    [data?.activities]
  );

  if (loading) {
    return (
      <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
        <div className="dashboard-campaign-report-toolbar shrink-0">
          <div className="dashboard-shimmer h-5 w-40 rounded-md" />
          <div className="dashboard-shimmer mt-2 h-3 w-64 max-w-full rounded-md" />
        </div>
        <div className="dashboard-campaign-report-body dashboard-outreach-scroll">
          <div className="dashboard-campaign-report-inner">
            <div className="dashboard-shimmer-block min-h-80 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <MaterialIcon name="error_outline" className="text-4xl text-[#80868b]" aria-hidden />
          <p className="dashboard-alert-error max-w-sm text-sm">{error}</p>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => void load(1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
      <ReportToolbar
        title="Activity"
        subtitle={
          isWhatsApp
            ? "Contact unveil, WhatsApp sends, replies, and outcomes"
            : "Contact unveil, email sends, replies, and delivery events"
        }
        isWhatsApp={isWhatsApp}
        outreachStatus={outreachStatus}
        onRefresh={() => void load(page)}
      />
      <div className="dashboard-campaign-report-body dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="dashboard-campaign-report-inner dashboard-campaign-report-inner--activity">
          {isUnveilJobActive(revealJob) ? (
            <ActivityUnveilProgressBanner job={revealJob} />
          ) : null}
          <UnifiedActivityList items={feedItems} loading={pageLoading || revealInProgress} />
        </div>
      </div>
      {totalPages > 1 ? (
        <div className="dashboard-campaign-report-activity-pagination dashboard-pagination shrink-0">
          <p className="dashboard-pagination-label tabular-nums">
            Page {page} of {totalPages}
            <span className="text-[#424656]/80"> · {total.toLocaleString()} events</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageLoading || page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MaterialIcon name="chevron_left" className="text-base" />
              Previous
            </button>
            <button
              type="button"
              disabled={pageLoading || page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <MaterialIcon name="chevron_right" className="text-base" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportToolbar({
  title,
  subtitle,
  isWhatsApp,
  outreachStatus,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  isWhatsApp: boolean;
  outreachStatus: string;
  onRefresh: () => void;
}) {
  return (
    <div className="dashboard-campaign-report-toolbar shrink-0">
      <div className="dashboard-campaign-report-toolbar-row">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {isWhatsApp ? (
            <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className="h-6 w-6 shrink-0" />
          ) : (
            <IntegrationBrandLogo provider="gmail" title="Gmail" className="h-6 w-6 shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="dashboard-campaign-report-title">{title}</h2>
            <p className="dashboard-campaign-report-subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {outreachStatus !== "idle" ? (
            <span
              className={`dashboard-campaign-report-status-pill ${outreachStatusClass(outreachStatus)}`}
            >
              {outreachStatusLabel(outreachStatus)}
            </span>
          ) : null}
          <button
            type="button"
            className="dashboard-campaign-report-refresh-btn"
            onClick={onRefresh}
          >
            <MaterialIcon name="refresh" className="text-base" aria-hidden />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

function HeadlineStat({
  icon,
  label,
  value,
  iconTone = "default",
}: {
  icon: string;
  label: string;
  value: number;
  iconTone?: "default" | "primary" | "positive" | "saved";
}) {
  return (
    <div className="dashboard-campaign-report-stat-card">
      <span
        className={`dashboard-campaign-report-stat-icon dashboard-campaign-report-stat-icon--${iconTone}`}
        aria-hidden
      >
        <MaterialIcon name={icon} className="text-xl" />
      </span>
      <span className="dashboard-campaign-report-stat-value tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="dashboard-campaign-report-stat-label">{label}</span>
    </div>
  );
}

function contactInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function OutcomeCard({
  label,
  count,
  rate,
  tone,
  icon,
  onSelect,
}: {
  label: string;
  count: number;
  rate: number;
  tone: "primary" | "positive" | "negative" | "default";
  icon: string;
  onSelect?: () => void;
}) {
  const clickable = count > 0 && Boolean(onSelect);
  const className = `dashboard-campaign-report-outcome-card dashboard-campaign-report-outcome-card--${tone}${
    clickable ? " dashboard-campaign-report-outcome-card--clickable" : ""
  }`;

  const content = (
    <>
      <span className="dashboard-campaign-report-outcome-icon" aria-hidden>
        <MaterialIcon name={icon} className="text-[22px]" />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="dashboard-campaign-report-outcome-label">{label}</p>
        <p className="dashboard-campaign-report-outcome-value tabular-nums">{count.toLocaleString()}</p>
      </div>
      <p className="dashboard-campaign-report-outcome-rate tabular-nums">
        {count === 0 && rate === 0 ? "—" : `${rate}%`}
      </p>
      {clickable ? (
        <MaterialIcon
          name="chevron_right"
          className="dashboard-campaign-report-outcome-chevron shrink-0 text-xl text-slate-400"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (!clickable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      aria-label={`View ${count} candidates for ${label}`}
    >
      {content}
    </button>
  );
}

function MetricsTable({
  rows,
  onSelectMetric,
}: {
  rows: EmailReportMatrixRow[];
  onSelectMetric: (key: ReportMetricKey) => void;
}) {
  return (
    <div className="dashboard-campaign-report-table-wrap">
      <table className="dashboard-campaign-report-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" className="dashboard-campaign-report-table-num">
              Count
            </th>
            <th scope="col" className="dashboard-campaign-report-table-num">
              Rate
            </th>
            <th scope="col" className="dashboard-campaign-report-table-action" aria-label="View list" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = matrixMeta(row.key);
            const metricKey = isReportMetricKey(row.key) ? row.key : null;
            const clickable = metricKey && row.count > 0;

            return (
              <tr
                key={row.key}
                className={`dashboard-campaign-report-table-row dashboard-campaign-report-table-row--${meta.tone}${
                  clickable ? " dashboard-campaign-report-table-row--clickable" : ""
                }`}
                title={row.description}
                onClick={clickable && metricKey ? () => onSelectMetric(metricKey) : undefined}
                onKeyDown={
                  clickable && metricKey
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectMetric(metricKey);
                        }
                      }
                    : undefined
                }
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
              >
                <td>
                  <div className="dashboard-campaign-report-table-metric">
                    <span
                      className={`dashboard-campaign-report-table-metric-icon dashboard-campaign-report-table-metric-icon--${meta.tone}`}
                      aria-hidden
                    >
                      <MaterialIcon name={meta.icon} className="text-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="dashboard-campaign-report-table-metric-label">{row.label}</p>
                      <p className="dashboard-campaign-report-table-metric-desc">{row.description}</p>
                    </div>
                  </div>
                </td>
                <td className="dashboard-campaign-report-table-num">
                  <span className="dashboard-campaign-report-table-count tabular-nums">
                    {row.count.toLocaleString()}
                  </span>
                </td>
                <td className="dashboard-campaign-report-table-num">
                  <span className="dashboard-campaign-report-table-rate tabular-nums">
                    {row.key === "sent" && row.count === 0 ? "—" : `${row.rate}%`}
                  </span>
                </td>
                <td className="dashboard-campaign-report-table-action">
                  {clickable ? (
                    <MaterialIcon name="chevron_right" className="text-lg text-slate-400" aria-hidden />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportCandidatesTable({
  candidates,
  isWhatsApp,
  onViewWhatsAppConversation,
}: {
  candidates: ReportMetricCandidate[];
  isWhatsApp: boolean;
  onViewWhatsAppConversation?: (candidateKey: string) => void;
}) {
  const showChatAction = isWhatsApp && Boolean(onViewWhatsAppConversation);
  if (candidates.length === 0) {
    return (
      <p className="dashboard-campaign-workspace-placeholder py-12 text-center text-sm">
        No candidates in this group.
      </p>
    );
  }

  return (
    <div className="dashboard-campaign-report-candidates-wrap overflow-x-auto">
      <table className="dashboard-campaign-report-candidates-table">
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Role</th>
            <th scope="col">Company</th>
            <th scope="col">{isWhatsApp ? "Phone" : "Email"}</th>
            <th scope="col">Status</th>
            {showChatAction ? <th scope="col" className="dashboard-campaign-report-candidates-actions-col">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {candidates.map((row) => {
            const contact = isWhatsApp ? row.phone : row.email;
            const candidateKey = row.candidateKey?.trim() || "";
            return (
              <tr key={row.candidateKey || `${row.name}-${contact}`}>
                <td>
                  <div className="dashboard-campaign-report-candidate-cell">
                    <span className="dashboard-campaign-report-candidate-avatar" aria-hidden>
                      {contactInitial(row.name)}
                    </span>
                    <p className="dashboard-campaign-report-candidate-name min-w-0 truncate">
                      {row.name}
                    </p>
                  </div>
                </td>
                <td className="dashboard-campaign-report-candidate-field">{row.role || "—"}</td>
                <td className="dashboard-campaign-report-candidate-field">{row.company || "—"}</td>
                <td className="dashboard-campaign-report-candidate-field">{contact || "—"}</td>
                <td className="dashboard-campaign-report-candidate-field">
                  <span className="dashboard-campaign-report-candidate-detail">
                    {row.detail || "—"}
                  </span>
                </td>
                {showChatAction ? (
                  <td className="dashboard-campaign-report-candidates-actions-col">
                    <button
                      type="button"
                      className="dashboard-campaign-report-chat-btn"
                      disabled={!candidateKey}
                      title={
                        candidateKey
                          ? "Open WhatsApp conversation"
                          : "No contact key for this candidate"
                      }
                      onClick={() => {
                        if (candidateKey) onViewWhatsAppConversation?.(candidateKey);
                      }}
                    >
                      <MaterialIcon name="chat" className="text-base" aria-hidden />
                      View chat
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportDrilldownScreen({
  metricLabel,
  campaignName,
  candidates,
  isWhatsApp,
  outreachStatus,
  onBack,
  onRefresh,
  onViewWhatsAppConversation,
}: {
  metricLabel: string;
  campaignName: string;
  candidates: ReportMetricCandidate[];
  isWhatsApp: boolean;
  outreachStatus: string;
  onBack: () => void;
  onRefresh: () => void;
  onViewWhatsAppConversation?: (candidateKey: string) => void;
}) {
  const handleDownload = () => {
    downloadReportCandidatesExcel({
      candidates,
      metricLabel,
      campaignName,
    });
  };

  return (
    <div className="dashboard-campaign-report-panel dashboard-campaign-report-panel--drilldown flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-report-toolbar shrink-0">
        <div className="dashboard-campaign-report-toolbar-row">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="dashboard-campaign-report-back-btn"
              onClick={onBack}
              aria-label="Back to campaign report"
            >
              <MaterialIcon name="arrow_back" className="text-xl" />
            </button>
            <div className="min-w-0">
              <h2 className="dashboard-campaign-report-title">{metricLabel}</h2>
              <p className="dashboard-campaign-report-subtitle">
                {candidates.length} candidate{candidates.length === 1 ? "" : "s"} in this group
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {outreachStatus !== "idle" ? (
              <span
                className={`dashboard-campaign-report-status-pill ${outreachStatusClass(outreachStatus)}`}
              >
                {outreachStatusLabel(outreachStatus)}
              </span>
            ) : null}
            <button
              type="button"
              className="dashboard-campaign-report-refresh-btn"
              onClick={handleDownload}
              disabled={candidates.length === 0}
              title={candidates.length === 0 ? "No candidates to export" : "Download Excel"}
            >
              <MaterialIcon name="download" className="text-base" aria-hidden />
              Download Excel
            </button>
            <button
              type="button"
              className="dashboard-campaign-report-refresh-btn"
              onClick={onRefresh}
            >
              <MaterialIcon name="refresh" className="text-base" aria-hidden />
              Refresh
            </button>
          </div>
        </div>
      </div>
      <div className="dashboard-campaign-report-body dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="dashboard-campaign-report-inner">
          <ReportCandidatesTable
            candidates={candidates}
            isWhatsApp={isWhatsApp}
            onViewWhatsAppConversation={onViewWhatsAppConversation}
          />
        </div>
      </div>
    </div>
  );
}

function CampaignReportPanel({
  campaignId,
  reportMetric = null,
  onOpenReportMetric,
  onCloseReportMetric,
  onViewWhatsAppConversation,
}: Omit<Props, "variant">) {
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

  const isDrilldown = Boolean(reportMetric);

  if (loading) {
    return (
      <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
        <div className="dashboard-campaign-report-toolbar shrink-0">
          {isDrilldown ? (
            <div className="flex items-center gap-2">
              <div className="dashboard-shimmer h-9 w-9 rounded-lg" />
              <div className="dashboard-shimmer h-5 w-36 rounded-md" />
            </div>
          ) : (
            <>
              <div className="dashboard-shimmer h-5 w-40 rounded-md" />
              <div className="dashboard-shimmer mt-2 h-3 w-64 max-w-full rounded-md" />
            </>
          )}
        </div>
        <div className="dashboard-campaign-report-body dashboard-outreach-scroll">
          <div className="dashboard-campaign-report-inner">
            {isDrilldown ? (
              <div className="dashboard-campaign-report-candidates-wrap dashboard-shimmer-block min-h-80" />
            ) : (
              <>
                <div className="dashboard-campaign-report-stats-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="dashboard-campaign-report-stat-card dashboard-shimmer-block" />
                  ))}
                </div>
                <div className="dashboard-campaign-report-outcomes-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="dashboard-campaign-report-outcome-card dashboard-shimmer-block" />
                  ))}
                </div>
                <div className="dashboard-campaign-report-table-wrap dashboard-shimmer-block min-h-56" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
        {isDrilldown && onCloseReportMetric ? (
          <div className="dashboard-campaign-report-toolbar shrink-0">
            <button
              type="button"
              className="dashboard-campaign-report-back-btn"
              onClick={onCloseReportMetric}
            >
              <MaterialIcon name="arrow_back" className="text-xl" />
              Back to report
            </button>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <MaterialIcon name="error_outline" className="text-4xl text-[#80868b]" aria-hidden />
          <p className="dashboard-alert-error max-w-sm text-sm">{error}</p>
        <button type="button" className={dashboardBtnSecondaryClass} onClick={() => void load()}>
          Retry
        </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const isWhatsApp = report.channel === "whatsapp";
  const matrixByKey = Object.fromEntries(report.matrix.map((row) => [row.key, row]));

  if (reportMetric && onCloseReportMetric) {
    const metricRow = matrixByKey[reportMetric];
    const candidates = report.breakdown[reportMetric] ?? [];
    return (
      <ReportDrilldownScreen
        metricLabel={metricRow?.label ?? reportMetric}
        campaignName={report.campaignName}
        candidates={candidates}
        isWhatsApp={isWhatsApp}
        outreachStatus={report.outreachStatus}
        onBack={onCloseReportMetric}
        onRefresh={() => void load()}
        onViewWhatsAppConversation={isWhatsApp ? onViewWhatsAppConversation : undefined}
      />
    );
  }

  const openMetric = (key: ReportMetricKey) => {
    onOpenReportMetric?.(key);
  };

  const interestedRow = matrixByKey.interested;
  const notInterestedRow = matrixByKey.not_interested;
  const repliedRow = matrixByKey.replied;
  const awaitingRow = matrixByKey.awaiting_reply;

  return (
    <div className="dashboard-campaign-report-panel flex min-h-0 flex-1 flex-col">
      <ReportToolbar
        title={isWhatsApp ? "Campaign results" : "Email performance"}
        subtitle={
          isWhatsApp
            ? "Outcomes from your WhatsApp outreach sequence"
            : "Delivery and reply metrics for this email sequence"
        }
        isWhatsApp={isWhatsApp}
        outreachStatus={report.outreachStatus}
        onRefresh={() => void load()}
      />

      <div className="dashboard-campaign-report-body dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="dashboard-campaign-report-inner">
          <section aria-labelledby="campaign-report-summary-heading">
            <p id="campaign-report-summary-heading" className="dashboard-label-upper">
              Summary
            </p>
            <div className="dashboard-campaign-report-stats-grid">
              <HeadlineStat icon="group" label="Contacts" value={report.totalContacts} />
              <HeadlineStat
                icon={isWhatsApp ? "phone" : "mail"}
                label={isWhatsApp ? "With phone" : "With email"}
                value={isWhatsApp ? report.contactsWithPhone : report.contactsWithEmail}
                iconTone="primary"
              />
              <HeadlineStat
                icon="how_to_reg"
                label="Enrolled"
                value={report.enrolled}
                iconTone="saved"
              />
              <HeadlineStat icon="send" label="Sent" value={report.sent} iconTone="default" />
            </div>
          </section>

          <section className="dashboard-campaign-report-section" aria-labelledby="campaign-report-outcomes-heading">
            <p id="campaign-report-outcomes-heading" className="dashboard-label-upper">
              Key outcomes
            </p>
            <p className="dashboard-campaign-report-section-lead">
              {isWhatsApp
                ? "Tap an outcome to list candidates. Rates use contacts who received at least one message."
                : "Tap an outcome to list candidates. Rates use contacts who received at least one email."}
            </p>
            <div className="dashboard-campaign-report-outcomes-grid">
              <OutcomeCard
                label="Interested"
                count={interestedRow?.count ?? report.interested}
                rate={interestedRow?.rate ?? 0}
                tone="positive"
                icon="thumb_up"
                onSelect={() => openMetric("interested")}
              />
              <OutcomeCard
                label="Not interested"
                count={notInterestedRow?.count ?? report.notInterested}
                rate={notInterestedRow?.rate ?? 0}
                tone="negative"
                icon="thumb_down"
                onSelect={() => openMetric("not_interested")}
              />
              <OutcomeCard
                label="Replied"
                count={repliedRow?.count ?? report.replied}
                rate={repliedRow?.rate ?? 0}
                tone="primary"
                icon="reply"
                onSelect={() => openMetric("replied")}
              />
              <OutcomeCard
                label="Awaiting reply"
                count={awaitingRow?.count ?? report.awaitingReply}
                rate={awaitingRow?.rate ?? 0}
                tone="default"
                icon="schedule"
                onSelect={() => openMetric("awaiting_reply")}
              />
            </div>
          </section>

          <section className="dashboard-campaign-report-section" aria-labelledby="campaign-report-breakdown-heading">
            <p id="campaign-report-breakdown-heading" className="dashboard-label-upper">
              Full breakdown
            </p>
            <p className="dashboard-campaign-report-section-lead">
              Select a row to view candidates for Sent, Not delivered, and other metrics.
            </p>
            <MetricsTable rows={report.matrix} onSelectMetric={openMetric} />
          </section>

        {report.enrolled === 0 ? (
            <p className="dashboard-alert-notice dashboard-campaign-report-notice text-sm" role="status">
            Launch the campaign sequence to enroll contacts and populate these metrics.
          </p>
        ) : null}
        </div>
      </div>
    </div>
  );
}

export function CampaignEmailReportPanel({
  variant,
  campaignId,
  revealInProgress,
  revealJob,
  reloadRevealJob,
  ...rest
}: Props) {
  if (variant === "activity") {
    return (
      <CampaignActivityPanel
        campaignId={campaignId}
        revealInProgress={revealInProgress}
        revealJob={revealJob}
        reloadRevealJob={reloadRevealJob}
      />
    );
  }
  return <CampaignReportPanel campaignId={campaignId} {...rest} />;
}
