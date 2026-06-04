const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const User = require("../models/User");
const UsageHistory = require("../models/UsageHistory");
const { getBillingUser, getBillingUserId } = require("./organizationService");
const { resolveTierForUser } = require("./planQuotas");

class OutreachCreditsExceededError extends Error {
  /**
   * @param {"email"|"whatsapp"} channel
   */
  constructor(channel, limit, used, requested) {
    const label = channel === "whatsapp" ? "WhatsApp" : "email";
    const remaining = Math.max(0, limit - used);
    const message =
      requested > 0 && remaining <= 0
        ? `No credits for ${label} outreach. Your plan allows ${limit} ${label} outreach contacts and all are in use. Remove contacts from other campaigns or upgrade your plan.`
        : `No credits for ${label} outreach. Your plan allows ${limit} ${label} outreach contacts; ${used} are in use (${remaining} remaining). You tried to add ${requested} contact${requested === 1 ? "" : "s"}.`;
    super(message);
    this.name = "OutreachCreditsExceededError";
    this.code = "OUTREACH_CREDITS_EXCEEDED";
    this.statusCode = 403;
    this.channel = channel;
    this.limit = limit;
    this.used = used;
    this.requested = requested;
    this.remaining = remaining;
  }
}

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function campaignChannelQuery(channel) {
  return channel === "whatsapp"
    ? { outreachChannel: "whatsapp" }
    : { outreachChannel: { $in: ["gmail", null] } };
}

function tierLimitForChannel(tier, channel) {
  const field = channel === "whatsapp" ? "whatsappOutreaches" : "emailOutreaches";
  const n = tier?.[field];
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

async function resolveBillingUserId(actorUserId) {
  const user = await User.findById(actorUserId).lean();
  if (!user) return String(actorUserId);
  const billing = await getBillingUser(user);
  return String(billing?._id || actorUserId);
}

/**
 * Each campaign contact on a channel counts as one thread.
 * @param {"email"|"whatsapp"} channel
 * @param {{ billingUserId?: string | null, excludeCampaignId?: string }} [opts] — omit billingUserId for platform-wide count
 */
async function countOutreachThreadsUsed(channel, opts = {}) {
  const billingUserId =
    opts.billingUserId === null || opts.billingUserId === undefined
      ? null
      : String(opts.billingUserId || "").trim();
  const filter = { ...campaignChannelQuery(channel) };
  if (billingUserId && mongoose.Types.ObjectId.isValid(billingUserId)) {
    filter.userId = userOid(billingUserId);
  }
  const excludeCampaignId = opts.excludeCampaignId;
  if (excludeCampaignId && mongoose.Types.ObjectId.isValid(String(excludeCampaignId))) {
    filter._id = { $ne: new mongoose.Types.ObjectId(String(excludeCampaignId)) };
  }

  const docs = await Campaign.find(filter).select("contacts").lean();
  let total = 0;
  for (const doc of docs) {
    total += Array.isArray(doc.contacts) ? doc.contacts.length : 0;
  }
  return total;
}

async function resolveBillingUserIdFromFilter(userIdFilter) {
  const raw = String(userIdFilter || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  const user = await User.findById(raw).lean();
  if (!user) return raw;
  const billing = await getBillingUser(user);
  return String(billing?._id || raw);
}

async function getOutreachCreditsSummary(actorUserId, channel) {
  const billingUserId = await resolveBillingUserId(actorUserId);
  const { tier } = await resolveTierForUser(await User.findById(actorUserId));
  const limit = tierLimitForChannel(tier, channel);
  const used = await countOutreachThreadsUsed(channel, { billingUserId });
  return {
    channel,
    limit,
    used,
    remaining: limit == null ? null : Math.max(0, limit - used),
  };
}

/**
 * @param {string} actorUserId
 * @param {"email"|"whatsapp"} channel
 * @param {number} additionalThreads
 * @param {{ excludeCampaignId?: string }} [opts]
 */
async function assertOutreachCreditsAvailable(
  actorUserId,
  channel,
  additionalThreads,
  opts = {}
) {
  const requested = Math.max(0, Math.floor(Number(additionalThreads) || 0));
  if (requested <= 0) return;

  const billingUserId = await resolveBillingUserId(actorUserId);
  const actor = await User.findById(actorUserId);
  const { tier } = await resolveTierForUser(actor);
  const limit = tierLimitForChannel(tier, channel);
  if (limit == null) return;

  const used = await countOutreachThreadsUsed(channel, {
    billingUserId,
    excludeCampaignId: opts.excludeCampaignId,
  });
  if (used + requested > limit) {
    throw new OutreachCreditsExceededError(channel, limit, used, requested);
  }
}

function outreachChannelToCreditChannel(outreachChannel) {
  return outreachChannel === "whatsapp" ? "whatsapp" : "email";
}

/** Admin analytics: thread counts (and optional plan limits when scoped to one user). */
/**
 * Audit log for credit utilisation history (meters still use live campaign contact counts).
 * @param {string} actorUserId
 * @param {"email"|"whatsapp"} channel
 * @param {number} amount
 */
async function logOutreachCreditUsage(actorUserId, channel, amount) {
  const inc = Math.min(1000, Math.max(0, Math.floor(Number(amount) || 0)));
  if (inc <= 0) return;
  if (!actorUserId || !mongoose.Types.ObjectId.isValid(String(actorUserId))) return;

  const action = channel === "whatsapp" ? "whatsappOutreaches" : "emailOutreaches";
  const actorId = new mongoose.Types.ObjectId(String(actorUserId));
  const billingUserId = (await getBillingUserId(actorUserId)) || actorId;
  const actor = await User.findById(actorId).select("organizationId").lean();

  try {
    await UsageHistory.create({
      userId: actorId,
      billedUserId: billingUserId,
      organizationId: actor?.organizationId || null,
      action,
      amount: inc,
    });
  } catch (err) {
    console.error("UsageHistory.create (outreach) failed:", err?.message || err);
  }
}

async function getOutreachCreditsAnalytics(userIdFilter) {
  const billingUserId = await resolveBillingUserIdFromFilter(userIdFilter);
  const [emailUsed, whatsappUsed] = await Promise.all([
    countOutreachThreadsUsed("email", { billingUserId }),
    countOutreachThreadsUsed("whatsapp", { billingUserId }),
  ]);

  let emailLimit = null;
  let whatsappLimit = null;
  if (billingUserId) {
    const user = await User.findById(billingUserId).lean();
    if (user) {
      const { tier } = await resolveTierForUser(user);
      emailLimit = tierLimitForChannel(tier, "email");
      whatsappLimit = tierLimitForChannel(tier, "whatsapp");
    }
  }

  return {
    email: {
      threadsUsed: emailUsed,
      limit: emailLimit,
      remaining: emailLimit == null ? null : Math.max(0, emailLimit - emailUsed),
    },
    whatsapp: {
      threadsUsed: whatsappUsed,
      limit: whatsappLimit,
      remaining: whatsappLimit == null ? null : Math.max(0, whatsappLimit - whatsappUsed),
    },
  };
}

module.exports = {
  OutreachCreditsExceededError,
  countOutreachThreadsUsed,
  getOutreachCreditsSummary,
  getOutreachCreditsAnalytics,
  assertOutreachCreditsAvailable,
  logOutreachCreditUsage,
  outreachChannelToCreditChannel,
  tierLimitForChannel,
  resolveBillingUserIdFromFilter,
};
