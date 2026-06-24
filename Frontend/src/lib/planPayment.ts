import type { PricingTier } from "@/lib/pricingPlans";

export type PlanPaymentCurrency = "inr" | "usd";

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

/** Legacy fallback when admin has not set payment fields on a tier. */
const LEGACY_PAYMENT_AMOUNTS: Record<string, { inr: number; usd: number }> = {
  starter: { inr: 4999, usd: 99 },
  growth: { inr: 19999, usd: 399 },
};

function tierPaymentMajorAmount(
  tier: PricingTier,
  currency: PlanPaymentCurrency
): number | null {
  const primary = tier.paymentAmount ?? null;
  const primaryCurrency = tier.paymentCurrency ?? null;
  const usd = tier.paymentAmountUsd ?? null;

  if (currency === "usd") {
    if (usd) return usd;
    if (primaryCurrency === "usd" && primary) return primary;
    return null;
  }

  if (primaryCurrency === "inr" && primary) return primary;
  if (primary && !primaryCurrency) return primary;
  return null;
}

function legacyPaymentMajorAmount(
  planId: string | undefined,
  currency: PlanPaymentCurrency
): number | null {
  const id = (planId || "").trim().toLowerCase();
  const row = LEGACY_PAYMENT_AMOUNTS[id];
  if (!row) return null;
  return currency === "usd" ? row.usd : row.inr;
}

export function resolveTierPaymentMajorAmount(
  tier: PricingTier,
  currency: PlanPaymentCurrency
): number | null {
  return (
    tierPaymentMajorAmount(tier, currency) ??
    legacyPaymentMajorAmount(tier.id, currency)
  );
}

export type TierDisplayPriceLines = {
  primary: string;
  secondary: string | null;
  /** Split primary for landing typography (amount + /month). */
  amount: string;
  period: string;
};

function formatPriceLine(
  amount: number,
  currency: PlanPaymentCurrency,
  suffix: string
): string {
  const symbol = currency === "usd" ? "$" : "₹";
  return `${symbol}${formatPaymentAmount(amount)}${suffix}`;
}

function splitDisplayPriceLine(line: string): { amount: string; period: string } {
  const raw = line.trim();
  if (!raw) return { amount: "—", period: "" };
  if (/^free$/i.test(raw)) return { amount: raw, period: "" };
  if (/^custom$/i.test(raw)) return { amount: "Custom", period: "" };

  const slashMo = raw.match(/^(.+?)(\/month(?:\/seat)?)$/i);
  if (slashMo) {
    return { amount: slashMo[1].trim(), period: slashMo[2] };
  }

  return { amount: raw, period: "" };
}

export function resolveTierBillingCurrency(tier: PricingTier): PlanPaymentCurrency | null {
  if (tier.paymentCurrency === "inr" || tier.paymentCurrency === "usd") {
    return tier.paymentCurrency;
  }
  const planId = tier.id?.trim().toLowerCase();
  if (planId && LEGACY_PAYMENT_AMOUNTS[planId]) return "inr";
  return null;
}

/** Amount + currency stored on the tier (no alternate-currency switching). */
export function tierDbPaymentMajorAmount(tier: PricingTier): number | null {
  const currency = resolveTierBillingCurrency(tier);
  if (!currency) return null;

  const amount = tier.paymentAmount;
  if (typeof amount === "number" && amount > 0 && tier.paymentCurrency === currency) {
    return Math.floor(amount);
  }

  return legacyPaymentMajorAmount(tier.id, currency);
}

export function tierDbDisplayPriceLines(
  tier: PricingTier,
  options?: { seatSuffix?: boolean }
): TierDisplayPriceLines {
  const planId = tier.id?.trim().toLowerCase() || "";
  const suffix = options?.seatSuffix !== false ? "/month/seat" : "/month";

  if (planId === "trial") {
    const primary = "Free";
    const split = splitDisplayPriceLine(primary);
    return { primary, secondary: null, amount: split.amount, period: split.period };
  }

  const currency = resolveTierBillingCurrency(tier);
  const amount = tierDbPaymentMajorAmount(tier);

  if (planId === "enterprise" && !amount) {
    const primary = tier.primaryPrice?.trim() || "Custom";
    const secondary = tier.secondaryPrice?.trim() || null;
    const split = splitDisplayPriceLine(primary);
    return { primary, secondary, amount: split.amount, period: split.period };
  }

  if (!currency || !amount) {
    const primary = tier.primaryPrice?.trim() || "—";
    const split = splitDisplayPriceLine(primary);
    return { primary, secondary: null, amount: split.amount, period: split.period };
  }

  const primary = formatPriceLine(amount, currency, suffix);
  const split = splitDisplayPriceLine(primary);
  return {
    primary,
    secondary: null,
    amount: split.amount,
    period: split.period,
  };
}

/** Dashboard plan cards — price from DB payment fields only. */
export function tierDashboardDisplayPriceLines(tier: PricingTier): TierDisplayPriceLines {
  return tierDbDisplayPriceLines(tier, { seatSuffix: true });
}

/** Checkout / payment link per plan and currency (Razorpay, Stripe, etc.). */
export function getPlanPaymentUrl(
  planId: string | undefined,
  currency: PlanPaymentCurrency
): string {
  const id = (planId || "").trim().toLowerCase();
  if (!id || !LEGACY_PAYMENT_AMOUNTS[id]) return "";

  const suffix = currency === "usd" ? "USD" : "INR";
  const specific = envPaymentUrl(`NEXT_PUBLIC_PLAN_PAYMENT_${id.toUpperCase()}_${suffix}`);
  if (specific) return specific;

  return envPaymentUrl(`NEXT_PUBLIC_PLAN_PAYMENT_${id.toUpperCase()}`);
}

export function isPayablePlan(
  tier: PricingTier,
  currency?: PlanPaymentCurrency
): boolean {
  const billingCurrency = currency ?? resolveTierBillingCurrency(tier);
  if (!billingCurrency) return false;
  return tierDbPaymentMajorAmount(tier) !== null;
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

function formatPaymentAmount(amount: number): string {
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function dashboardPlanPaymentButtonLabel(
  tier: PricingTier,
  options: { isCurrent: boolean; isUpgrade: boolean }
): string {
  if (options.isCurrent) return "Current plan";
  const currency = resolveTierBillingCurrency(tier);
  if (!currency) return options.isUpgrade ? "Upgrade plan" : "Subscribe";
  const symbol = currency === "usd" ? "$" : "₹";
  const amount = tierDbPaymentMajorAmount(tier);
  if (amount) {
    const verb = options.isUpgrade ? "Upgrade" : "Subscribe";
    return `${verb} · ${symbol}${formatPaymentAmount(amount)}/mo`;
  }
  return options.isUpgrade ? "Upgrade plan" : "Subscribe";
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

export function planPaymentAmountDisplay(tier: PricingTier): string {
  return tierDashboardDisplayPriceLines(tier).primary;
}
