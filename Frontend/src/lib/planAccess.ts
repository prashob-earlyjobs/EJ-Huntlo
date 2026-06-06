import type { PricingPlansPayload, PricingTier } from "@/lib/pricingPlans";

const LEGACY_PRODUCT_PLAN_IDS = new Set(["growth", "enterprise"]);

export type PlanAccessOptions = {
  /** When false, product gates stay open until pricing plans have loaded. */
  plansReady?: boolean;
};

export function findPlanTier(
  planId: string,
  plans: PricingPlansPayload | null | undefined
): PricingTier | undefined {
  const id = String(planId || "").trim();
  if (!id || !plans?.tiers?.length) return undefined;
  const idLower = id.toLowerCase();
  return (
    plans.tiers.find((tier) => tier.id === id) ??
    plans.tiers.find((tier) => String(tier.id || "").toLowerCase() === idLower)
  );
}

function legacyProductAccess(planId: string) {
  return LEGACY_PRODUCT_PLAN_IDS.has(String(planId || "").trim());
}

function resolveProductAccess(
  planId: string,
  plans: PricingPlansPayload | null | undefined,
  key: "campaignsEnabled" | "integrationsEnabled" | "outreachesEnabled",
  opts?: PlanAccessOptions
): boolean {
  if (opts?.plansReady === false) return true;
  const tier = findPlanTier(planId, plans);
  if (tier && typeof tier[key] === "boolean") return tier[key];
  return legacyProductAccess(planId);
}

export function hasCampaignsAccess(
  planId: string,
  plans?: PricingPlansPayload | null,
  opts?: PlanAccessOptions
): boolean {
  return resolveProductAccess(planId, plans, "campaignsEnabled", opts);
}

export function hasIntegrationsAccess(
  planId: string,
  plans?: PricingPlansPayload | null,
  opts?: PlanAccessOptions
): boolean {
  return resolveProductAccess(planId, plans, "integrationsEnabled", opts);
}

export function hasOutreachesAccess(
  planId: string,
  plans?: PricingPlansPayload | null,
  opts?: PlanAccessOptions
): boolean {
  return resolveProductAccess(planId, plans, "outreachesEnabled", opts);
}

/** @deprecated Use hasCampaignsAccess / hasIntegrationsAccess / hasOutreachesAccess */
export function hasCampaignsAndIntegrationsAccess(
  planId: string,
  plans?: PricingPlansPayload | null,
  opts?: PlanAccessOptions
): boolean {
  return hasCampaignsAccess(planId, plans, opts);
}

export function hasOutreachThreadUtilisation(
  planId: string,
  plans?: PricingPlansPayload | null,
  opts?: PlanAccessOptions
): boolean {
  if (opts?.plansReady === false) return false;
  const tier = findPlanTier(planId, plans);
  if (!tier) return legacyProductAccess(planId);
  const outreachProduct =
    Boolean(tier.campaignsEnabled) || Boolean(tier.outreachesEnabled);
  if (!outreachProduct) return false;
  return (
    (typeof tier.emailOutreaches === "number" && tier.emailOutreaches > 0) ||
    (typeof tier.whatsappOutreaches === "number" && tier.whatsappOutreaches > 0)
  );
}

export const CAMPAIGNS_LOCKED_MESSAGE =
  "Campaigns are not included in your current plan. Upgrade or ask your admin to enable campaigns for your plan.";

export const INTEGRATIONS_LOCKED_MESSAGE =
  "Integrations are not included in your current plan. Upgrade or ask your admin to enable integrations for your plan.";

export const OUTREACHES_LOCKED_MESSAGE =
  "Outreaches are not included in your current plan. Upgrade or ask your admin to enable outreaches for your plan.";
