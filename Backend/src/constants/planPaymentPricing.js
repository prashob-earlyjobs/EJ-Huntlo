const PricingPlan = require("../models/PricingPlan");

/** Legacy fallback when admin has not set paymentAmount on a tier. */
const PLAN_PAYMENT_AMOUNTS = {
  starter: { inrPaise: 499900, usdCents: 9900 },
  growth: { inrPaise: 1999900, usdCents: 39900 },
};

const PLAN_ORDER = {
  trial: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

function planTierRank(planId) {
  return PLAN_ORDER[String(planId || "").trim().toLowerCase()] ?? -1;
}

function normalizePaymentMajorAmount(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return Math.floor(v);
  }
  if (typeof v === "string") {
    const compact = v.replace(/,/g, "").trim();
    if (!compact) return null;
    const n = parseInt(compact, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function pricingFromMajorAmount(majorAmount, currency) {
  const cur = String(currency || "inr").trim().toLowerCase();
  if (cur === "usd") {
    return { amount: majorAmount * 100, currency: "USD", displaySymbol: "$" };
  }
  return { amount: majorAmount * 100, currency: "INR", displaySymbol: "₹" };
}

function pricingFromTierDoc(planDoc, currency) {
  if (!planDoc) return null;
  const cur = String(currency || "inr").trim().toLowerCase();
  const primaryAmount = normalizePaymentMajorAmount(planDoc.paymentAmount);
  const primaryCurrency = String(planDoc.paymentCurrency || "")
    .trim()
    .toLowerCase();
  const usdAmount = normalizePaymentMajorAmount(planDoc.paymentAmountUsd);

  if (cur === "usd") {
    if (usdAmount) return pricingFromMajorAmount(usdAmount, "usd");
    if (primaryCurrency === "usd" && primaryAmount) {
      return pricingFromMajorAmount(primaryAmount, "usd");
    }
    return null;
  }

  if (primaryCurrency === "inr" && primaryAmount) {
    return pricingFromMajorAmount(primaryAmount, "inr");
  }
  if (primaryCurrency === "usd" && usdAmount) {
    return null;
  }
  if (primaryAmount && !primaryCurrency) {
    return pricingFromMajorAmount(primaryAmount, "inr");
  }
  return null;
}

function pricingFromLegacyConstants(planId, currency) {
  const id = String(planId || "").trim().toLowerCase();
  const row = PLAN_PAYMENT_AMOUNTS[id];
  if (!row) return null;
  const cur = String(currency || "inr").trim().toLowerCase();
  if (cur === "usd") {
    return { amount: row.usdCents, currency: "USD", displaySymbol: "$" };
  }
  return { amount: row.inrPaise, currency: "INR", displaySymbol: "₹" };
}

async function getPlanPaymentAmount(planId, currency) {
  const id = String(planId || "").trim().toLowerCase();
  if (!id) return null;

  const planDoc = await PricingPlan.findOne({ planId: id }).lean();
  const fromTier = pricingFromTierDoc(planDoc, currency);
  if (fromTier) return fromTier;

  return pricingFromLegacyConstants(id, currency);
}

async function isPlanPayableInCurrency(planId, currency) {
  return Boolean(await getPlanPaymentAmount(planId, currency));
}

async function canPurchasePlan(currentPlanId, targetPlanId, currency) {
  const current = planTierRank(currentPlanId);
  const target = planTierRank(targetPlanId);
  const targetId = String(targetPlanId || "").trim().toLowerCase();

  if (!(await isPlanPayableInCurrency(targetId, currency))) {
    return { ok: false, message: "This plan is not available for checkout in the selected currency" };
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
  getPlanPaymentAmount,
  canPurchasePlan,
  planTierRank,
  isPlanPayableInCurrency,
  normalizePaymentMajorAmount,
};
