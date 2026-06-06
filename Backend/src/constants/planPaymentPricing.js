/** Monthly plan prices for self-serve checkout (INR paise / USD cents). */
const PLAN_PAYMENT_AMOUNTS = {
  starter: { inrPaise: 499900, usdCents: 9900 },
  growth: { inrPaise: 1999900, usdCents: 39900 },
};

const PAYABLE_PLAN_IDS = new Set(["starter", "growth"]);

const PLAN_ORDER = {
  trial: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

function planTierRank(planId) {
  return PLAN_ORDER[String(planId || "").trim().toLowerCase()] ?? -1;
}

function getPlanPaymentAmount(planId, currency) {
  const id = String(planId || "").trim().toLowerCase();
  if (!PAYABLE_PLAN_IDS.has(id)) return null;
  const row = PLAN_PAYMENT_AMOUNTS[id];
  if (!row) return null;
  const cur = String(currency || "inr").trim().toLowerCase();
  if (cur === "usd") {
    return { amount: row.usdCents, currency: "USD", displaySymbol: "$" };
  }
  return { amount: row.inrPaise, currency: "INR", displaySymbol: "₹" };
}

function canPurchasePlan(currentPlanId, targetPlanId) {
  const current = planTierRank(currentPlanId);
  const target = planTierRank(targetPlanId);
  if (!PAYABLE_PLAN_IDS.has(String(targetPlanId || "").trim().toLowerCase())) {
    return { ok: false, message: "Invalid plan for checkout" };
  }
  if (current === target) {
    return { ok: false, message: "You are already on this plan" };
  }
  if (current > 0 && target < current) {
    return { ok: false, message: "Plan downgrades are not available online. Contact support." };
  }
  return { ok: true };
}

module.exports = {
  PLAN_PAYMENT_AMOUNTS,
  PAYABLE_PLAN_IDS,
  getPlanPaymentAmount,
  canPurchasePlan,
  planTierRank,
};
