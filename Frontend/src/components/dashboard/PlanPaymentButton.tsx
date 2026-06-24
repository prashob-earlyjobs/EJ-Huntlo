"use client";

import { useState } from "react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { PlanPaymentMethodModal } from "@/components/dashboard/PlanPaymentMethodModal";
import {
  dashboardPlanPaymentButtonLabel,
  isPayablePlan,
  isPlanUpgrade,
  resolveTierBillingCurrency,
} from "@/lib/planPayment";
import { isEnterpriseTier, type PricingTier } from "@/lib/pricingPlans";

type Props = {
  tier: PricingTier;
  currentPlanId: string;
  featured?: boolean;
  onPaymentSuccess?: (message: string) => void;
};

export function PlanPaymentButton({
  tier,
  currentPlanId,
  featured,
  onPaymentSuccess,
}: Props) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const planId = tier.id?.trim().toLowerCase() || "";
  const isCurrent = planId === currentPlanId.trim().toLowerCase();
  const isUpgrade = isPlanUpgrade(currentPlanId, planId);
  const billingCurrency = resolveTierBillingCurrency(tier);
  const label = dashboardPlanPaymentButtonLabel(tier, { isCurrent, isUpgrade });

  const baseClass = featured
    ? "dashboard-pricing-card-btn dashboard-pricing-card-btn--on-featured"
    : "dashboard-pricing-card-btn";
  const primaryClass = `${baseClass} dashboard-pricing-card-btn--primary`;
  const outlineClass = `${baseClass} dashboard-pricing-card-btn--outline`;

  if (isEnterpriseTier(tier)) {
    return (
      <BookDemoLink
        className={outlineClass}
        disabledClassName={`${outlineClass} cursor-not-allowed opacity-60`}
      >
        Contact sales
      </BookDemoLink>
    );
  }

  if (tier.id === "trial") {
    return (
      <span className={`${outlineClass} cursor-default opacity-70`} aria-disabled="true">
        Included on signup
      </span>
    );
  }

  if (!billingCurrency || !isPayablePlan(tier)) {
    return null;
  }

  if (isCurrent) {
    return (
      <button type="button" className={`${outlineClass} cursor-default`} disabled>
        <MaterialIcon name="check_circle" className="text-base" />
        {label}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={featured && isUpgrade ? primaryClass : isUpgrade ? primaryClass : outlineClass}
        onClick={() => setPaymentModalOpen(true)}
      >
        <MaterialIcon name="payments" className="text-base" />
        {label}
      </button>

      <PlanPaymentMethodModal
        open={paymentModalOpen}
        tier={tier}
        isUpgrade={isUpgrade}
        onClose={() => setPaymentModalOpen(false)}
        onPaymentSuccess={onPaymentSuccess}
      />
    </>
  );
}
