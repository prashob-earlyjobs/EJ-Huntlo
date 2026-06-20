const User = require("../models/User");
const { getEnrichedTiers } = require("../controllers/pricingController");
const { getBillingUser } = require("./organizationService");
const { utilisationFromUser } = require("../utils/userUsage");

class QuotaExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuotaExceededError";
    this.code = "QUOTA_EXCEEDED";
    this.statusCode = 403;
  }
}

class TeamMemberLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "TeamMemberLimitError";
    this.code = "TEAM_MEMBER_LIMIT";
    this.statusCode = 403;
  }
}

/** null = unlimited; number = max member accounts (accountRole member). */
function getMaxSubUsersForTier(tier) {
  if (!tier) return null;
  if (Object.prototype.hasOwnProperty.call(tier, "maxSubUsers") && tier.maxSubUsers === null) {
    return null;
  }
  const n =
    typeof tier.maxSubUsers === "number" && Number.isFinite(tier.maxSubUsers)
      ? Math.max(0, Math.floor(tier.maxSubUsers))
      : null;
  return n;
}

function getDefaultPlanId(tiers) {
  const list = Array.isArray(tiers) ? tiers : [];
  if (list.length === 0) return "trial";
  const trial = list.find((t) => t.id === "trial");
  if (trial?.id) return trial.id;
  const starter = list.find((t) => t.id === "starter");
  return starter?.id || list[0]?.id || "trial";
}

function normalizePlanId(planId, tiers) {
  const id = typeof planId === "string" ? planId.trim() : "";
  const list = Array.isArray(tiers) ? tiers : [];
  if (list.length === 0) return id || "trial";
  if (id && list.some((t) => t.id === id)) return id;
  return getDefaultPlanId(list);
}

async function resolveTierForUser(user) {
  const billingUser = user ? await getBillingUser(user) : null;
  const billable = billingUser || user;
  const tiers = await getEnrichedTiers();
  const planId = normalizePlanId(billable?.planId, tiers);
  const tier = tiers.find((t) => t.id === planId) || tiers[0] || null;
  return { tiers, planId: tier?.id || planId, tier, billingUser: billable };
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
  const { tier, billingUser } = await resolveTierForUser(user);
  const limit = getLimitForAction(tier, key);
  if (limit == null) return;

  const utilisation = utilisationFromUser(billingUser || user);
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

function teamMemberLimitMessage(tier, maxSubUsers) {
  const planName = tier?.name || "your plan";
  if (maxSubUsers === 0) {
    return `${planName} does not include sub-users. Upgrade your plan to add team members.`;
  }
  return `Sub-user limit reached for ${planName} (${maxSubUsers} max). Upgrade or remove a member.`;
}

/**
 * @param {import("mongoose").Document | object} owner — workspace owner (billing user)
 * @param {number} currentSubMemberCount — existing accountRole "member" count
 */
async function assertCanAddTeamMember(owner, currentSubMemberCount) {
  const { tier } = await resolveTierForUser(owner);
  const maxSubUsers = getMaxSubUsersForTier(tier);
  if (maxSubUsers === null) return;
  const count = Math.max(0, Math.floor(Number(currentSubMemberCount) || 0));
  if (count >= maxSubUsers) {
    throw new TeamMemberLimitError(teamMemberLimitMessage(tier, maxSubUsers));
  }
}

async function getUserPlanSummary(user) {
  const { planId, tier, tiers, billingUser } = await resolveTierForUser(user);
  const billable = billingUser || user;
  const billingUserId = billable?._id ? String(billable._id) : "";
  const utilisation = utilisationFromUser(billable);
  let emailThreadsUsed = 0;
  let whatsappThreadsUsed = 0;
  let voiceCallsUsed = 0;
  if (billingUserId) {
    const { countOutreachThreadsUsed } = require("./outreachCreditsService");
    const { countVoiceCallsUsed } = require("./voiceCallCreditsService");
    [emailThreadsUsed, whatsappThreadsUsed, voiceCallsUsed] = await Promise.all([
      countOutreachThreadsUsed("email", { billingUserId }),
      countOutreachThreadsUsed("whatsapp", { billingUserId }),
      countVoiceCallsUsed({ billingUserId }),
    ]);
  }
  return {
    planId,
    planName: tier?.name || planId,
    campaignsEnabled: Boolean(tier?.campaignsEnabled),
    outreachesEnabled: Boolean(tier?.outreachesEnabled),
    limits: {
      searches: tier?.searches ?? null,
      candidateUnlocks: tier?.candidateUnlocks ?? null,
      verifiedEmails: tier?.verifiedEmails ?? null,
      phoneNumbers: tier?.phoneNumbers ?? null,
      emailOutreaches: tier?.emailOutreaches ?? null,
      whatsappOutreaches: tier?.whatsappOutreaches ?? null,
      aiVoiceCalls: tier?.aiVoiceCalls ?? null,
      maxSubUsers: getMaxSubUsersForTier(tier),
    },
    utilisation,
    outreachThreads: {
      email: emailThreadsUsed,
      whatsapp: whatsappThreadsUsed,
    },
    voiceCallsUsed,
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
  TeamMemberLimitError,
  getDefaultPlanId,
  normalizePlanId,
  resolveTierForUser,
  getMaxSubUsersForTier,
  assertQuotaAvailable,
  assertQuotaAvailableByUserId,
  assertCanAddTeamMember,
  getUserPlanSummary,
  validatePlanIdExists,
  getEnrichedTiers,
};
