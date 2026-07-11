const mongoose = require("mongoose");
const CampaignVoiceCall = require("../models/CampaignVoiceCall");
const User = require("../models/User");
const UsageHistory = require("../models/UsageHistory");
const { getBillingUser, getBillingUserId } = require("./organizationService");
const { resolveTierForUser } = require("./planQuotas");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");

class VoiceCallCreditsExceededError extends Error {
  constructor(limit, used, requested) {
    const remaining = Math.max(0, limit - used);
    const message =
      requested > 0 && remaining <= 0
        ? `No credits for AI voice calls. Your plan allows ${limit} calls and all are in use.`
        : `No credits for AI voice calls. Your plan allows ${limit} calls; ${used} are in use (${remaining} remaining). You tried to place ${requested} call${requested === 1 ? "" : "s"}.`;
    super(message);
    this.name = "VoiceCallCreditsExceededError";
    this.code = "VOICE_CALL_CREDITS_EXCEEDED";
    this.statusCode = 403;
    this.limit = limit;
    this.used = used;
    this.requested = requested;
    this.remaining = remaining;
  }
}

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function tierVoiceCallLimit(tier) {
  const n = tier?.aiVoiceCalls;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

async function resolveBillingUserId(actorUserId) {
  const user = await User.findById(actorUserId).lean();
  if (!user) return String(actorUserId);
  const billing = await getBillingUser(user);
  return String(billing?._id || actorUserId);
}

async function resolveBillingUserIdFromFilter(userIdFilter) {
  const raw = String(userIdFilter || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  const user = await User.findById(raw).lean();
  if (!user) return raw;
  const billing = await getBillingUser(user);
  return String(billing?._id || raw);
}

/**
 * Each CampaignVoiceCall document counts as one placed call.
 * @param {{ billingUserId?: string | null }} [opts]
 */
async function countVoiceCallsUsed(opts = {}) {
  const billingUserId =
    opts.billingUserId === null || opts.billingUserId === undefined
      ? null
      : String(opts.billingUserId || "").trim();
  const filter = {};
  if (billingUserId && mongoose.Types.ObjectId.isValid(billingUserId)) {
    filter.userId = userOid(billingUserId);
  }
  return CampaignVoiceCall.countDocuments(filter);
}

async function getVoiceCallCreditsSummary(actorUserId) {
  const billingUserId = await resolveBillingUserId(actorUserId);
  const { tier } = await resolveTierForUser(await User.findById(actorUserId));
  const limit = tierVoiceCallLimit(tier);
  const used = await countVoiceCallsUsed({ billingUserId });
  return {
    callsUsed: used,
    limit,
    remaining: limit == null ? null : Math.max(0, limit - used),
  };
}

/**
 * @param {string} actorUserId
 * @param {number} additionalCalls
 */
async function assertVoiceCallCreditsAvailable(actorUserId, additionalCalls) {
  const requested = Math.max(0, Math.floor(Number(additionalCalls) || 0));
  if (requested <= 0) return;

  const billingUserId = await resolveBillingUserId(actorUserId);
  const actor = await User.findById(actorUserId);
  const { tier } = await resolveTierForUser(actor);
  const limit = tierVoiceCallLimit(tier);
  if (limit == null) return;

  const used = await countVoiceCallsUsed({ billingUserId });
  if (used + requested > limit) {
    throw new VoiceCallCreditsExceededError(limit, used, requested);
  }
}

function pendingCallId(requestId, mobile) {
  const rid = String(requestId || "").trim();
  const digits = normalizeToWhatsAppDigits(mobile);
  return `pending:${rid}:${digits}`;
}

/**
 * Reserve call quota rows immediately after Hunar accepts the bulk request.
 * Webhooks replace pending rows when the real call_id arrives.
 */
async function seedPendingVoiceCalls({ campaign, contacts, requestId }) {
  const campaignId = campaign._id;
  const userId = campaign.userId;
  const agentId = String(campaign.hunarVoiceAgentId || campaign.hunarVoiceAgent?.id || "").trim();
  const rid = String(requestId || "").trim();
  if (!campaignId || !userId || !rid) return 0;

  let seeded = 0;
  for (const contact of contacts) {
    const mobile = normalizeToWhatsAppDigits(contact.phone);
    if (!mobile) continue;
    const callId = pendingCallId(rid, mobile);
    await CampaignVoiceCall.findOneAndUpdate(
      { campaignId, callId },
      {
        $set: {
          userId,
          campaignId,
          callId,
          requestId: rid,
          agentId,
          candidateKey: String(contact.candidateKey || "").trim(),
          contactName: String(contact.name || "").trim(),
          toNumber: mobile,
          status: "queued",
          lifecycleStatus: "queued",
          eventType: "call_queued",
          lastEventAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    seeded += 1;
  }
  return seeded;
}

/**
 * When Hunar sends the real call_id, merge into the pending row for this number.
 */
async function resolvePendingVoiceCall(campaignId, requestId, toNumber) {
  const rid = String(requestId || "").trim();
  const digits = normalizeToWhatsAppDigits(toNumber);
  if (!rid || !digits) return null;
  const callId = pendingCallId(rid, digits);
  return CampaignVoiceCall.findOne({ campaignId, callId }).lean();
}

async function logVoiceCallCreditUsage(actorUserId, amount) {
  const inc = Math.min(1000, Math.max(0, Math.floor(Number(amount) || 0)));
  if (inc <= 0) return;
  if (!actorUserId || !mongoose.Types.ObjectId.isValid(String(actorUserId))) return;

  const actorId = new mongoose.Types.ObjectId(String(actorUserId));
  const billingUserId = (await getBillingUserId(actorUserId)) || actorId;
  const actor = await User.findById(actorId).select("organizationId").lean();

  try {
    await UsageHistory.create({
      userId: actorId,
      billedUserId: billingUserId,
      organizationId: actor?.organizationId || null,
      action: "aiVoiceCalls",
      amount: inc,
    });
  } catch (err) {
    console.error("UsageHistory.create (voice call) failed:", err?.message || err);
  }
}

async function getVoiceCallCreditsAnalytics(userIdFilter) {
  const billingUserId = await resolveBillingUserIdFromFilter(userIdFilter);
  const callsUsed = await countVoiceCallsUsed({ billingUserId });

  let limit = null;
  if (billingUserId) {
    const user = await User.findById(billingUserId).lean();
    if (user) {
      const { tier } = await resolveTierForUser(user);
      limit = tierVoiceCallLimit(tier);
    }
  }

  return {
    callsUsed,
    limit,
    remaining: limit == null ? null : Math.max(0, limit - callsUsed),
  };
}

module.exports = {
  VoiceCallCreditsExceededError,
  countVoiceCallsUsed,
  getVoiceCallCreditsSummary,
  assertVoiceCallCreditsAvailable,
  seedPendingVoiceCalls,
  resolvePendingVoiceCall,
  logVoiceCallCreditUsage,
  getVoiceCallCreditsAnalytics,
  tierVoiceCallLimit,
  pendingCallId,
};
