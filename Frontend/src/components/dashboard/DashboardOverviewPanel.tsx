"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { DashboardOverviewSkeleton } from "@/components/dashboard/DashboardOverviewSkeleton";
import {
  dashboardGreetingName,
  formatDashboardWhen,
  quotaRemainingLabel,
  type DashboardOverviewData,
  type DashboardRecentSession,
} from "@/lib/dashboardOverview";
import { hasOutreachThreadUtilisation } from "@/lib/planAccess";
import {
  quotaUsedPercent,
  utilisationQuotaActionLabel,
  type OutreachThreadStats,
} from "@/lib/planUtilisation";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

type Props = {
  loading: boolean;
  error: string;
  data: DashboardOverviewData | null;
  currentPlanId: string;
  outreachThreads: OutreachThreadStats;
  pricingPlans: PricingPlansPayload | null;
  onNavigate: (tab: string) => void;
  onOpenSession: (session: DashboardRecentSession) => void;
};

const QUICK_ACTIONS = [
  {
    tab: "Search Candidates",
    label: "Search candidates",
    desc: "Run an AI sourcing search",
    icon: "person_search",
  },
  {
    tab: "People Scout",
    label: "People Scout",
    desc: "Look up LinkedIn profiles",
    icon: "travel_explore",
  },
  {
    tab: "Saved",
    label: "Saved list",
    desc: "Review shortlisted talent",
    icon: "bookmark",
  },
  {
    tab: "Plans and pricing",
    label: "Plans & usage",
    desc: "View limits and billing",
    icon: "payments",
  },
] as const;

function CompactQuotaMeter({
  label,
  icon,
  used,
  limit,
}: {
  label: string;
  icon: string;
  used: number;
  limit: number | null;
}) {
  const percent = quotaUsedPercent(used, limit);
  const high = percent >= 85;

  return (
    <div className="dashboard-overview-quota">
      <div className="dashboard-overview-quota-head">
        <span className="dashboard-overview-quota-label">
          <MaterialIcon name={icon} className="text-base opacity-80" />
          {label}
        </span>
        <span className="dashboard-overview-quota-value tabular-nums">
          {quotaRemainingLabel(used, limit)}
        </span>
      </div>
      <div className="dashboard-overview-quota-track">
        <div
          className={`dashboard-pricing-meter-fill${
            high ? " dashboard-pricing-meter-fill--high" : ""
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function resolveOutreachMeter(
  data: DashboardOverviewData,
  currentPlanId: string,
  outreachThreads: OutreachThreadStats,
  pricingPlans: PricingPlansPayload | null,
  channel: "email" | "whatsapp"
): { used: number; limit: number | null } {
  const quotaKey = channel === "email" ? "emailOutreach" : "whatsappOutreach";
  const limitKey = channel === "email" ? "emailOutreaches" : "whatsappOutreaches";
  const tier =
    pricingPlans?.tiers.find((t) => t.id === currentPlanId) ??
    pricingPlans?.tiers.find((t) => t.id === data.plan.planId) ??
    null;
  const tierLimit = tier?.[limitKey];
  const limit =
    (typeof tierLimit === "number" && tierLimit > 0 ? tierLimit : null) ??
    data.plan.limits[limitKey] ??
    data.quotaSummary[quotaKey].limit;
  const used =
    outreachThreads[channel] > 0
      ? outreachThreads[channel]
      : data.outreachThreads[channel] > 0
        ? data.outreachThreads[channel]
        : data.quotaSummary[quotaKey].used;
  return { used, limit };
}

export function DashboardOverviewPanel({
  loading,
  error,
  data,
  currentPlanId,
  outreachThreads,
  pricingPlans,
  onNavigate,
  onOpenSession,
}: Props) {
  const firstName = data ? dashboardGreetingName(data.greeting.fullName) : "";
  const planId = data?.plan.planId || currentPlanId;
  const showOutreachMeters = hasOutreachThreadUtilisation(planId);
  const emailOutreach =
    data && showOutreachMeters
      ? resolveOutreachMeter(data, currentPlanId, outreachThreads, pricingPlans, "email")
      : null;
  const whatsappOutreach =
    data && showOutreachMeters
      ? resolveOutreachMeter(data, currentPlanId, outreachThreads, pricingPlans, "whatsapp")
      : null;

  return (
    <section className="dashboard-card flex min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-results-toolbar dashboard-results-toolbar--overview">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="space_dashboard" className="text-xl text-[#0050cb]" />
            Dashboard
          </h3>
          <p className="mt-1 dashboard-text-body">
            {loading ? (
              <span className="dashboard-shimmer inline-block h-4 w-full max-w-md rounded" />
            ) : data ? (
              `Welcome back, ${firstName}. Here’s what’s happening in your hiring workspace.`
            ) : (
              "Your workspace overview"
            )}
          </p>
        </div>
        {loading ? (
          <div
            className="dashboard-shimmer h-9 w-28 shrink-0 rounded-full"
            aria-hidden
          />
        ) : data ? (
          <button
            type="button"
            onClick={() => onNavigate("Plans and pricing")}
            className="dashboard-overview-plan-pill"
          >
            <MaterialIcon name="verified" className="text-base" />
            {data.plan.planName}
          </button>
        ) : null}
      </div>

      {error && !loading ? <p className="mt-4 dashboard-alert-error">{error}</p> : null}

      {loading ? (
        <DashboardOverviewSkeleton />
      ) : data ? (
        <div className="dashboard-overview-body">
          <div className="dashboard-overview-stats">
            <button
              type="button"
              onClick={() => onNavigate("Search history")}
              className="dashboard-overview-stat-card"
            >
              <span className="dashboard-overview-stat-icon">
                <MaterialIcon name="history" className="text-xl" />
              </span>
              <span className="dashboard-overview-stat-value tabular-nums">
                {data.stats.sourcingSessions.toLocaleString()}
              </span>
              <span className="dashboard-overview-stat-label">Sourcing sessions</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("Saved")}
              className="dashboard-overview-stat-card"
            >
              <span className="dashboard-overview-stat-icon dashboard-overview-stat-icon--saved">
                <MaterialIcon name="bookmark" className="text-xl" />
              </span>
              <span className="dashboard-overview-stat-value tabular-nums">
                {data.stats.savedCandidates.toLocaleString()}
              </span>
              <span className="dashboard-overview-stat-label">Saved candidates</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("Candidates")}
              className="dashboard-overview-stat-card"
            >
              <span className="dashboard-overview-stat-icon dashboard-overview-stat-icon--profiles">
                <MaterialIcon name="groups" className="text-xl" />
              </span>
              <span className="dashboard-overview-stat-value tabular-nums">
                {data.stats.sourcedProfiles.toLocaleString()}
              </span>
              <span className="dashboard-overview-stat-label">Profiles discovered</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("People Scout")}
              className="dashboard-overview-stat-card"
            >
              <span className="dashboard-overview-stat-icon dashboard-overview-stat-icon--scout">
                <MaterialIcon name="travel_explore" className="text-xl" />
              </span>
              <span className="dashboard-overview-stat-value tabular-nums">
                {data.stats.peopleScoutLookups.toLocaleString()}
              </span>
              <span className="dashboard-overview-stat-label">Scout lookups</span>
            </button>
          </div>

          <div className="dashboard-overview-actions">
            <p className="dashboard-label-upper">Quick actions</p>
            <div className="dashboard-overview-actions-grid">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.tab}
                  type="button"
                  onClick={() => onNavigate(action.tab)}
                  className="dashboard-overview-action-card"
                >
                  <span className="dashboard-overview-action-icon">
                    <MaterialIcon name={action.icon} className="text-xl text-[#0050cb]" />
                  </span>
                  <span className="dashboard-overview-action-title">{action.label}</span>
                  <span className="dashboard-overview-action-desc">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-overview-grid">
            <div className="dashboard-overview-panel">
              <header className="dashboard-overview-panel-head">
                <h4 className="dashboard-overview-panel-title">Plan usage</h4>
                <button
                  type="button"
                  onClick={() => onNavigate("Plans and pricing")}
                  className="dashboard-overview-link-btn"
                >
                  View details
                  <MaterialIcon name="arrow_forward" className="text-sm" />
                </button>
              </header>
              <div className="dashboard-overview-quota-grid">
                <CompactQuotaMeter
                  label="Searches (AI + Scout)"
                  icon="manage_search"
                  used={data.quotaSummary.searches.used}
                  limit={data.quotaSummary.searches.limit}
                />
                <CompactQuotaMeter
                  label="Email unveils"
                  icon="mail"
                  used={data.quotaSummary.verifiedEmails.used}
                  limit={data.quotaSummary.verifiedEmails.limit}
                />
                <CompactQuotaMeter
                  label="Candidate unveils"
                  icon="visibility"
                  used={data.quotaSummary.candidateUnlocks.used}
                  limit={data.quotaSummary.candidateUnlocks.limit}
                />
                <CompactQuotaMeter
                  label="Mobile unveils"
                  icon="smartphone"
                  used={data.quotaSummary.phoneNumbers.used}
                  limit={data.quotaSummary.phoneNumbers.limit}
                />
                {emailOutreach ? (
                  <CompactQuotaMeter
                    label="Email outreach"
                    icon="forward_to_inbox"
                    used={emailOutreach.used}
                    limit={emailOutreach.limit}
                  />
                ) : null}
                {whatsappOutreach ? (
                  <CompactQuotaMeter
                    label="WhatsApp outreach"
                    icon="chat"
                    used={whatsappOutreach.used}
                    limit={whatsappOutreach.limit}
                  />
                ) : null}
              </div>
            </div>

            <div className="dashboard-overview-panel">
              <header className="dashboard-overview-panel-head">
                <h4 className="dashboard-overview-panel-title">Recent activity</h4>
                <button
                  type="button"
                  onClick={() => onNavigate("Plans and pricing")}
                  className="dashboard-overview-link-btn"
                >
                  Full history
                  <MaterialIcon name="arrow_forward" className="text-sm" />
                </button>
              </header>
              {data.recentActivity.length === 0 ? (
                <p className="dashboard-overview-empty">No quota usage logged yet.</p>
              ) : (
                <ul className="dashboard-overview-activity-list">
                  {data.recentActivity.map((row) => (
                    <li key={row.id} className="dashboard-overview-activity-item">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--dash-on-surface)]">
                          {utilisationQuotaActionLabel(row.action)}
                        </span>
                        <span className="block text-xs text-[var(--dash-on-surface-variant)]">
                          {formatDashboardWhen(row.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-sm font-semibold text-[var(--dash-error-text)]">
                        −{row.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="dashboard-overview-panel">
            <header className="dashboard-overview-panel-head">
              <h4 className="dashboard-overview-panel-title">Recent sourcing sessions</h4>
              <button
                type="button"
                onClick={() => onNavigate("Search history")}
                className="dashboard-overview-link-btn"
              >
                View all
                <MaterialIcon name="arrow_forward" className="text-sm" />
              </button>
            </header>
            {data.recentSessions.length === 0 ? (
              <div className="dashboard-overview-empty-block">
                <p className="dashboard-overview-empty">No sourcing sessions yet.</p>
                <button
                  type="button"
                  onClick={() => onNavigate("Search Candidates")}
                  className="dashboard-btn-primary mt-3"
                >
                  <MaterialIcon name="search" className="text-base" />
                  Start a search
                </button>
              </div>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Search</th>
                      <th>Candidates</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSessions.map((session) => {
                      const title =
                        session.prompt.trim() ||
                        session.sessionTitle.trim() ||
                        "Untitled session";
                      const count =
                        session.totalDocs ??
                        session.candidateCountFirstPage ??
                        0;
                      return (
                        <tr
                          key={session.id}
                          className="dashboard-table-row--clickable"
                          onClick={() => onOpenSession(session)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onOpenSession(session);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                        >
                          <td>
                            <span className="line-clamp-2 font-medium">{title}</span>
                          </td>
                          <td className="tabular-nums whitespace-nowrap">
                            {typeof count === "number" ? count.toLocaleString() : "—"}
                          </td>
                          <td className="whitespace-nowrap text-xs">
                            {formatDashboardWhen(session.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : !error ? (
        <p className="mt-6 dashboard-text-body">
          Could not load dashboard data. Please refresh or try again.
        </p>
      ) : null}
    </section>
  );
}
