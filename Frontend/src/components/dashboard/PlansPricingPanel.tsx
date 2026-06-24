"use client";

import { useCallback, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { PlanPaymentButton } from "@/components/dashboard/PlanPaymentButton";
import { PlansPricingSkeleton } from "@/components/dashboard/PlansPricingSkeleton";
import {
  tierDashboardDisplayPriceLines,
} from "@/lib/planPayment";
import {
  quotaRemainingDisplay,
  quotaUsedPercent,
  utilisationQuotaActionLabel,
  type OutreachThreadStats,
  type UserUtilisationStats,
  type UtilisationHistoryRow,
} from "@/lib/planUtilisation";
import { hasOutreachThreadUtilisation, hasVoiceCallUtilisation } from "@/lib/planAccess";
import {
  tierFeatureLines,
  type PricingPlansPayload,
  type PricingTier,
} from "@/lib/pricingPlans";
import { useDodoPaymentReturn } from "@/lib/useDodoPaymentReturn";

type Props = {
  loading: boolean;
  plans: PricingPlansPayload | null;
  currentPlanId: string;
  currentPlanName: string;
  utilisation: UserUtilisationStats;
  outreachThreads: OutreachThreadStats;
  history: UtilisationHistoryRow[];
  historyLoading: boolean;
  historyPage: number;
  historyTotalDocs: number;
  historyTotalPages: number;
  onHistoryPageChange: (page: number) => void;
  onPaymentSuccess?: (message: string) => void;
  paymentSuccessToast?: string | null;
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

const OUTREACH_UTILISATION_METRICS: Array<{
  key: keyof OutreachThreadStats;
  label: string;
  icon: string;
  limitKey: "emailOutreaches" | "whatsappOutreaches";
}> = [
  {
    key: "email",
    label: "Email outreach",
    icon: "forward_to_inbox",
    limitKey: "emailOutreaches",
  },
  {
    key: "whatsapp",
    label: "WhatsApp outreach",
    icon: "chat",
    limitKey: "whatsappOutreaches",
  },
];

const VOICE_CALL_UTILISATION_METRIC = {
  key: "voiceCalls" as const,
  label: "AI voice calls",
  icon: "call",
  limitKey: "aiVoiceCalls" as const,
};

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
  currentPlanId,
  onPaymentSuccess,
}: {
  tier: PricingTier;
  isCurrent: boolean;
  currentPlanId: string;
  onPaymentSuccess?: (message: string) => void;
}) {
  const featured = Boolean(tier.isPopular) && !isCurrent;
  const lines = tierFeatureLines(tier);
  const cardKey = tier.id || tier.name;
  const priceLines = tierDashboardDisplayPriceLines(tier);

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
      <p className="dashboard-pricing-card-price tabular-nums">{priceLines.primary}</p>
      {priceLines.secondary && tier.id === "enterprise" ? (
        <p className="dashboard-pricing-card-secondary">{priceLines.secondary}</p>
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

      <div className="dashboard-pricing-card-actions">
        <PlanPaymentButton
          tier={tier}
          currentPlanId={currentPlanId}
          featured={featured}
          onPaymentSuccess={onPaymentSuccess}
        />
      </div>
    </article>
  );
}

export function PlansPricingPanel({
  loading,
  plans,
  currentPlanId,
  currentPlanName,
  utilisation,
  outreachThreads,
  history,
  historyLoading,
  historyPage,
  historyTotalDocs,
  historyTotalPages,
  onHistoryPageChange,
  onPaymentSuccess,
  paymentSuccessToast,
}: Props) {
  const [dodoReturnMessage, setDodoReturnMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const handleDodoReturnSuccess = useCallback(
    (message: string) => {
      setDodoReturnMessage({ tone: "success", text: message });
      onPaymentSuccess?.(message);
    },
    [onPaymentSuccess]
  );

  const handleDodoReturnError = useCallback((message: string) => {
    setDodoReturnMessage({ tone: "error", text: message });
  }, []);

  useDodoPaymentReturn({
    enabled: !loading,
    onSuccess: handleDodoReturnSuccess,
    onError: handleDodoReturnError,
  });

  const currentTier =
    plans?.tiers.find((tier) => tier.id === currentPlanId) ??
    plans?.tiers.find((tier) => tier.name === currentPlanName) ??
    null;

  const displayPlanName = currentTier?.name ?? currentPlanName;
  const showOutreachMeters = hasOutreachThreadUtilisation(currentPlanId, plans);
  const showVoiceCallMeter = hasVoiceCallUtilisation(currentPlanId, plans);

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

          {paymentSuccessToast || dodoReturnMessage ? (
            <p
              className={
                dodoReturnMessage?.tone === "error"
                  ? "dashboard-plan-pay-modal-notice dashboard-plan-pay-modal-notice--error mb-4"
                  : "dashboard-pricing-payment-toast"
              }
              role="status"
            >
              <MaterialIcon
                name={dodoReturnMessage?.tone === "error" ? "error" : "check_circle"}
                className="shrink-0 text-base"
              />
              {dodoReturnMessage?.text || paymentSuccessToast}
            </p>
          ) : null}

          <div className="dashboard-pricing-grid">
            {plans.tiers.map((tier) => (
              <PricingPlanCard
                key={tier.id || tier.name}
                tier={tier}
                isCurrent={tier.id === currentPlanId}
                currentPlanId={currentPlanId}
                onPaymentSuccess={onPaymentSuccess}
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
                  {showOutreachMeters
                    ? " Email, WhatsApp outreach, and AI voice call meters apply when enabled on your plan."
                    : showVoiceCallMeter
                      ? " AI voice call meter applies when campaigns are enabled on your plan."
                      : null}
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
              {showOutreachMeters
                ? OUTREACH_UTILISATION_METRICS.map((metric) => (
                    <UtilisationMeter
                      key={metric.key}
                      label={metric.label}
                      icon={metric.icon}
                      used={outreachThreads[metric.key]}
                      limit={currentTier?.[metric.limitKey]}
                    />
                  ))
                : null}
              {showVoiceCallMeter ? (
                <UtilisationMeter
                  key={VOICE_CALL_UTILISATION_METRIC.key}
                  label={VOICE_CALL_UTILISATION_METRIC.label}
                  icon={VOICE_CALL_UTILISATION_METRIC.icon}
                  used={outreachThreads.voiceCalls}
                  limit={currentTier?.[VOICE_CALL_UTILISATION_METRIC.limitKey]}
                />
              ) : null}
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
                  Log of plan quota usage, including outreach when contacts are added to
                  campaigns. Older outreach usage before logging shipped may not appear.
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
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={`history-skeleton-${idx}`}>
                        <td>
                          <div className="dashboard-shimmer h-3 w-28 rounded" />
                        </td>
                        <td>
                          <div
                            className="dashboard-shimmer h-3 rounded"
                            style={{ width: `${40 + (idx % 3) * 15}%`, maxWidth: "10rem" }}
                          />
                        </td>
                        <td className="text-right">
                          <div className="dashboard-shimmer ml-auto h-3 w-8 rounded" />
                        </td>
                      </tr>
                    ))
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
