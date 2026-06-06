import type { PricingTier } from "@/lib/pricingPlans";

export type PlanPaymentCurrency = "inr" | "usd";

const PAYABLE_PLAN_IDS = new Set(["starter", "growth"]);

const PLAN_ORDER: Record<string, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

function envPaymentUrl(key: string): string {
  const v = process.env[key]?.trim();
  return v && /^https?:\/\//i.test(v) ? v : "";
}

/** Checkout / payment link per plan and currency (Razorpay, Stripe, etc.). */
export function getPlanPaymentUrl(
  planId: string | undefined,
  currency: PlanPaymentCurrency
): string {
  const id = (planId || "").trim().toLowerCase();
  if (!PAYABLE_PLAN_IDS.has(id)) return "";

  const suffix = currency === "usd" ? "USD" : "INR";
  const specific = envPaymentUrl(`NEXT_PUBLIC_PLAN_PAYMENT_${id.toUpperCase()}_${suffix}`);
  if (specific) return specific;

  const fallback = envPaymentUrl(`NEXT_PUBLIC_PLAN_PAYMENT_${id.toUpperCase()}`);
  return fallback;
}

export function isPayablePlan(planId: string | undefined): boolean {
  return PAYABLE_PLAN_IDS.has((planId || "").trim().toLowerCase());
}

export function planTierRank(planId: string | undefined): number {
  return PLAN_ORDER[(planId || "").trim().toLowerCase()] ?? -1;
}

export function isPlanUpgrade(
  currentPlanId: string,
  targetPlanId: string | undefined
): boolean {
  return planTierRank(targetPlanId) > planTierRank(currentPlanId);
}

export function dashboardPlanPaymentButtonLabel(
  tier: PricingTier,
  currency: PlanPaymentCurrency,
  options: { isCurrent: boolean; isUpgrade: boolean }
): string {
  if (options.isCurrent) return "Current plan";
  const symbol = currency === "usd" ? "$" : "₹";
  const amount = currency === "usd" ? tierPaymentUsdAmount(tier.id) : tierPaymentInrAmount(tier.id);
  if (amount) {
    const verb = options.isUpgrade ? "Upgrade" : "Subscribe";
    return `${verb} · ${symbol}${amount}/mo`;
  }
  return options.isUpgrade ? "Upgrade plan" : "Subscribe";
}

function tierPaymentInrAmount(planId: string | undefined): string | null {
  if (planId === "starter") return "4,999";
  if (planId === "growth") return "19,999";
  return null;
}

function tierPaymentUsdAmount(planId: string | undefined): string | null {
  if (planId === "starter") return "99";
  if (planId === "growth") return "399";
  return null;
}

export function planPaymentCurrencyLabel(currency: PlanPaymentCurrency): string {
  return currency === "usd" ? "USD" : "INR";
}

export type PlanPaymentProviderId = "razorpay" | "dodo";

export type PlanPaymentProviderOption = {
  id: PlanPaymentProviderId;
  name: string;
  description: string;
  /** Best for INR / global etc. — UI copy only */
  hint: string;
};

export const PLAN_PAYMENT_PROVIDERS: PlanPaymentProviderOption[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Cards, UPI, netbanking, and wallets — popular in India.",
    hint: "Recommended for INR",
  },
  {
    id: "dodo",
    name: "Dodo Payments",
    description: "Global cards and international checkout.",
    hint: "Recommended for USD",
  },
];

export function planPaymentAmountDisplay(
  planId: string | undefined,
  currency: PlanPaymentCurrency
): string {
  const symbol = currency === "usd" ? "$" : "₹";
  const amount =
    currency === "usd" ? tierPaymentUsdAmount(planId) : tierPaymentInrAmount(planId);
  return amount ? `${symbol}${amount}/month` : "—";
}
