const mongoose = require("mongoose");
const User = require("../models/User");
const UsageHistory = require("../models/UsageHistory");
const { assertQuotaAvailableByUserId } = require("../services/planQuotas");
const { USAGE_FIELD, utilisationFromUser } = require("./userUsage");

/**
 * @param {string} userId
 * @param {keyof typeof USAGE_FIELD} key
 * @param {number} [amount]
 */
async function incrementUserUsage(userId, key, amount = 1) {
  const field = USAGE_FIELD[key];
  if (!field || !userId || !mongoose.Types.ObjectId.isValid(String(userId))) return;

  await assertQuotaAvailableByUserId(userId, key, amount);

  const inc = Math.min(1000, Math.max(1, Math.floor(Number(amount) || 1)));
  await User.updateOne({ _id: userId }, { $inc: { [field]: inc } });
  try {
    await UsageHistory.create({
      userId: new mongoose.Types.ObjectId(String(userId)),
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
