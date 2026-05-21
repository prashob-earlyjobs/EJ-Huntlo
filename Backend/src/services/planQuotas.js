const User = require("../models/User");
const { DEFAULT_PRICING_PLANS, getEnrichedTiers } = require("../controllers/pricingController");
const { utilisationFromUser } = require("../utils/userUsage");

class QuotaExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuotaExceededError";
    this.code = "QUOTA_EXCEEDED";
    this.statusCode = 403;
  }
}

function getDefaultPlanId(tiers) {
  const list = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_PRICING_PLANS.tiers;
  const trial = list.find((t) => t.id === "trial");
  if (trial?.id) return trial.id;
  const starter = list.find((t) => t.id === "starter");
  return starter?.id || list[0]?.id || "trial";
}

function normalizePlanId(planId, tiers) {
  const id = typeof planId === "string" ? planId.trim() : "";
  const list = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_PRICING_PLANS.tiers;
  if (id && list.some((t) => t.id === id)) return id;
  return getDefaultPlanId(list);
}

async function resolveTierForUser(user) {
  const tiers = await getEnrichedTiers();
  const planId = normalizePlanId(user?.planId, tiers);
  const tier = tiers.find((t) => t.id === planId) || tiers[0] || null;
  return { tiers, planId: tier?.id || planId, tier };
}

function getLimitForAction(tier, key) {
  if (!tier) return null;
  if (key === "candidateSearches" || key === "linkedinLookups") {
    return typeof tier.searches === "number" && tier.searches > 0 ? tier.searches : null;
  }
  const map = {
    emailUnveils: "verifiedEmails",
    candidateUnveils: "candidateUnlocks",
    mobileUnveils: "phoneNumbers",
  };
  const field = map[key];
  if (!field) return null;
  const n = tier[field];
  return typeof n === "number" && n > 0 ? n : null;
}

function getUsedForAction(utilisation, key) {
  if (key === "candidateSearches" || key === "linkedinLookups") {
    return utilisation.candidateSearches + utilisation.linkedinLookups;
  }
  return utilisation[key] ?? 0;
}

function quotaExceededMessage(key, tier) {
  const labels = {
    candidateSearches: "candidate search",
    linkedinLookups: "LinkedIn search",
    emailUnveils: "email unveil",
    candidateUnveils: "candidate unveil",
    mobileUnveils: "mobile unveil",
  };
  const planName = tier?.name || "your plan";
  return `Plan quota exceeded for ${labels[key] || key} on ${planName}. Upgrade or contact support.`;
}

/**
 * @param {import("mongoose").Document | object} user
 * @param {keyof typeof import("../utils/userUsage").USAGE_FIELD} key
 * @param {number} [amount]
 */
async function assertQuotaAvailable(user, key, amount = 1) {
  const inc = Math.min(1000, Math.max(1, Math.floor(Number(amount) || 1)));
  const { tier } = await resolveTierForUser(user);
  const limit = getLimitForAction(tier, key);
  if (limit == null) return;

  const utilisation = utilisationFromUser(user);
  const used = getUsedForAction(utilisation, key);
  if (used + inc > limit) {
    throw new QuotaExceededError(quotaExceededMessage(key, tier));
  }
}

async function assertQuotaAvailableByUserId(userId, key, amount = 1) {
  if (!userId) return;
  const user = await User.findById(userId);
  if (!user) return;
  await assertQuotaAvailable(user, key, amount);
}

async function getUserPlanSummary(user) {
  const { planId, tier, tiers } = await resolveTierForUser(user);
  return {
    planId,
    planName: tier?.name || planId,
    limits: {
      searches: tier?.searches ?? null,
      candidateUnlocks: tier?.candidateUnlocks ?? null,
      verifiedEmails: tier?.verifiedEmails ?? null,
      phoneNumbers: tier?.phoneNumbers ?? null,
    },
    availablePlanIds: tiers.map((t) => t.id).filter(Boolean),
  };
}

async function validatePlanIdExists(planId) {
  const tiers = await getEnrichedTiers();
  const raw = typeof planId === "string" ? planId.trim() : "";
  if (!raw) return { ok: true, planId: getDefaultPlanId(tiers) };
  if (!tiers.some((t) => t.id === raw)) {
    return { ok: false, message: `Unknown plan: ${raw}` };
  }
  return { ok: true, planId: raw };
}

module.exports = {
  QuotaExceededError,
  getDefaultPlanId,
  normalizePlanId,
  resolveTierForUser,
  assertQuotaAvailable,
  assertQuotaAvailableByUserId,
  getUserPlanSummary,
  validatePlanIdExists,
  getEnrichedTiers,
};
