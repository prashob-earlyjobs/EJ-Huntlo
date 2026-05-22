const mongoose = require("mongoose");
const User = require("../models/User");
const UsageHistory = require("../models/UsageHistory");
const { assertQuotaAvailableByUserId } = require("../services/planQuotas");
const { getBillingUserId } = require("../services/organizationService");
const { USAGE_FIELD, utilisationFromUser } = require("./userUsage");

/**
 * Quota is charged to the workspace owner; usage history records the acting user.
 * @param {string} userId — actor (sub-user or owner)
 * @param {keyof typeof USAGE_FIELD} key
 * @param {number} [amount]
 */
async function incrementUserUsage(userId, key, amount = 1) {
  const field = USAGE_FIELD[key];
  if (!field || !userId || !mongoose.Types.ObjectId.isValid(String(userId))) return;

  const actorId = new mongoose.Types.ObjectId(String(userId));
  const billingUserId = (await getBillingUserId(userId)) || actorId;

  await assertQuotaAvailableByUserId(String(billingUserId), key, amount);

  const inc = Math.min(1000, Math.max(1, Math.floor(Number(amount) || 1)));
  await User.updateOne({ _id: billingUserId }, { $inc: { [field]: inc } });

  const actor = await User.findById(actorId).select("organizationId").lean();
  try {
    await UsageHistory.create({
      userId: actorId,
      billedUserId: billingUserId,
      organizationId: actor?.organizationId || null,
      action: key,
      amount: inc,
    });
  } catch (err) {
    console.error("UsageHistory.create failed:", err?.message || err);
  }
}

module.exports = {
  incrementUserUsage,
  utilisationFromUser,
  USAGE_FIELD,
};
