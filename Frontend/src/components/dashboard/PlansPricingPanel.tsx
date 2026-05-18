"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { PlansPricingSkeleton } from "@/components/dashboard/PlansPricingSkeleton";
import {
  quotaRemainingDisplay,
  quotaUsedPercent,
  utilisationQuotaActionLabel,
  type UserUtilisationStats,
  type UtilisationHistoryRow,
} from "@/lib/planUtilisation";
import {
  tierFeatureLines,
  type PricingPlansPayload,
  type PricingTier,
} from "@/lib/pricingPlans";

type Props = {
  loading: boolean;
  plans: PricingPlansPayload | null;
  currentPlanId: string;
  currentPlanName: string;
  utilisation: UserUtilisationStats;
  history: UtilisationHistoryRow[];
  historyLoading: boolean;
  historyPage: number;
  historyTotalDocs: number;
  historyTotalPages: number;
  onHistoryPageChange: (page: number) => void;
};

type UtilisationMetric = {
  key: keyof UserUtilisationStats;
  label: string;
  icon: string;
  limitKey: keyof Pick<
    PricingTier,
    "searches" | "candidateUnlocks" | "verifiedEmails" | "phoneNumbers"
  >;
};

const UTILISATION_METRICS: UtilisationMetric[] = [
  {
    key: "candidateSearches",
    label: "Candidate search",
    icon: "person_search",
    limitKey: "searches",
  },
  {
    key: "emailUnveils",
    label: "Email unveil",
    icon: "mail",
    limitKey: "verifiedEmails",
  },
  {
    key: "candidateUnveils",
    label: "Candidate unveil",
    icon: "visibility",
    limitKey: "candidateUnlocks",
  },
  {
    key: "mobileUnveils",
    label: "Mobile unveil",
    icon: "smartphone",
    limitKey: "phoneNumbers",
  },
  {
    key: "linkedinLookups",
    label: "LinkedIn search",
    icon: "travel_explore",
    limitKey: "searches",
  },
];

function UtilisationMeter({
  label,
  icon,
  used,
  limit,
}: {
  label: string;
  icon: string;
  used: number;
  limit: number | null | undefined;
}) {
  const percent = quotaUsedPercent(used, limit);
  const isHigh = percent >= 85;

  return (
    <div className="dashboard-pricing-meter">
      <div className="dashboard-pricing-meter-head">
        <span className="dashboard-pricing-meter-label">
          <MaterialIcon name={icon} className="text-base opacity-80" />
          {label}
        </span>
        <span className="dashboard-pricing-meter-value tabular-nums">
          {quotaRemainingDisplay(used, limit)}
        </span>
      </div>
      <div
        className="dashboard-pricing-meter-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} usage`}
      >
        <div
          className={`dashboard-pricing-meter-fill${
            isHigh ? " dashboard-pricing-meter-fill--high" : ""
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PricingPlanCard({
  tier,
  isCurrent,
}: {
  tier: PricingTier;
  isCurrent: boolean;
}) {
  const featured = Boolean(tier.isPopular) && !isCurrent;
  const lines = tierFeatureLines(tier);
  const cardKey = tier.id || tier.name;

  return (
    <article
      className={`dashboard-pricing-card${
        isCurrent
          ? " dashboard-pricing-card--current"
          : featured
            ? " dashboard-pricing-card--featured"
            : ""
      }`}
    >
      {isCurrent ? (
        <span className="dashboard-pricing-card-badge dashboard-pricing-card-badge--current">
          Current plan
        </span>
      ) : featured ? (
        <span className="dashboard-pricing-card-badge dashboard-pricing-card-badge--featured">
          {tier.popularBadge || "Most popular"}
        </span>
      ) : null}

      <h4 className="dashboard-pricing-card-name">{tier.name}</h4>
      <p className="dashboard-pricing-card-price tabular-nums">{tier.primaryPrice}</p>
      {tier.secondaryPrice ? (
        <p className="dashboard-pricing-card-secondary">{tier.secondaryPrice}</p>
      ) : null}
      {tier.description ? (
        <p className="dashboard-pricing-card-desc">{tier.description}</p>
      ) : null}

      {lines.length > 0 ? (
        <ul className="dashboard-pricing-card-features">
          {lines.map((line) => (
            <li key={`${cardKey}-${line}`}>
              <MaterialIcon name="check_circle" className="text-base shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function PlansPricingPanel({
  loading,
  plans,
  currentPlanId,
  currentPlanName,
  utilisation,
  history,
  historyLoading,
  historyPage,
  historyTotalDocs,
  historyTotalPages,
  onHistoryPageChange,
}: Props) {
  const currentTier =
    plans?.tiers.find((tier) => tier.id === currentPlanId) ??
    plans?.tiers.find((tier) => tier.name === currentPlanName) ??
    null;

  const displayPlanName = currentTier?.name ?? currentPlanName;

  return (
    <section className="dashboard-card flex min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-results-toolbar dashboard-results-toolbar--pricing">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="payments" className="text-xl text-[#0050cb]" />
            Plans and pricing
          </h3>
          <p className="mt-1 dashboard-text-body">
            Compare plans, review your allowance, and track quota usage over time.
          </p>
        </div>

        {!loading ? (
          <div className="dashboard-pricing-current-badge">
            <span className="dashboard-pricing-current-label">Current plan</span>
            <span className="dashboard-pricing-current-name">{displayPlanName}</span>
          </div>
        ) : null}
      </div>

      {loading ? (
        <PlansPricingSkeleton />
      ) : plans && plans.tiers.length > 0 ? (
        <div className="dashboard-pricing-body">
          {plans.intro ? (
            <p className="dashboard-pricing-intro">{plans.intro}</p>
          ) : null}

          <div className="dashboard-pricing-grid">
            {plans.tiers.map((tier) => (
              <PricingPlanCard
                key={tier.id || tier.name}
                tier={tier}
                isCurrent={tier.id === currentPlanId}
              />
            ))}
          </div>

          <section className="dashboard-pricing-section">
            <header className="dashboard-pricing-section-head">
              <span className="dashboard-pricing-section-icon">
                <MaterialIcon name="speed" className="text-lg" />
              </span>
              <div>
                <h4 className="dashboard-pricing-section-title">Plan utilisation</h4>
                <p className="dashboard-pricing-section-desc">
                  Remaining allowance on your{" "}
                  <span className="font-medium text-[var(--dash-on-surface)]">
                    {displayPlanName}
                  </span>{" "}
                  plan. Values show{" "}
                  <span className="font-medium">remaining / limit</span>.
                </p>
              </div>
            </header>

            <div className="dashboard-pricing-meters">
              {UTILISATION_METRICS.map((metric) => (
                <UtilisationMeter
                  key={metric.key}
                  label={metric.label}
                  icon={metric.icon}
                  used={utilisation[metric.key]}
                  limit={currentTier?.[metric.limitKey]}
                />
              ))}
            </div>
          </section>

          <section className="dashboard-pricing-section">
            <header className="dashboard-pricing-section-head">
              <span className="dashboard-pricing-section-icon dashboard-pricing-section-icon--history">
                <MaterialIcon name="history" className="text-lg" />
              </span>
              <div>
                <h4 className="dashboard-pricing-section-title">Credit utilisation history</h4>
                <p className="dashboard-pricing-section-desc">
                  Log of plan quota usage. Only events recorded after this feature shipped
                  appear here.
                </p>
              </div>
            </header>

            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activity</th>
                    <th className="text-right">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={3} className="dashboard-pricing-table-empty">
                        Loading history…
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="dashboard-pricing-table-empty">
                        No quota usage logged yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap text-xs">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td>{utilisationQuotaActionLabel(row.action)}</td>
                        <td className="text-right tabular-nums font-medium text-[var(--dash-error-text)]">
                          −{row.amount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {historyTotalPages > 1 ? (
              <div className="dashboard-pagination mt-4">
                <p className="dashboard-pagination-label tabular-nums">
                  Page {historyPage} of {historyTotalPages}
                  <span className="text-[#424656]/80">
                    {" "}
                    · {historyTotalDocs.toLocaleString()} events
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={historyLoading || historyPage <= 1}
                    onClick={() => onHistoryPageChange(Math.max(1, historyPage - 1))}
                    className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    aria-busy={historyLoading}
                  >
                    <MaterialIcon name="chevron_left" className="text-base" />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={historyLoading || historyPage >= historyTotalPages}
                    onClick={() =>
                      onHistoryPageChange(Math.min(historyTotalPages, historyPage + 1))
                    }
                    className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <MaterialIcon name="chevron_right" className="text-base" />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <p className="mt-6 dashboard-text-body">
          Pricing is temporarily unavailable. Please try again later.
        </p>
      )}
    </section>
  );
}
