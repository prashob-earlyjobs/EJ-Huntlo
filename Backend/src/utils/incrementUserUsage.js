const mongoose = require("mongoose");
const User = require("../models/User");
const UsageHistory = require("../models/UsageHistory");

/** Maps logical keys → User schema field names for $inc. */
const USAGE_FIELD = {
  candidateSearches: "usageCandidateSearches",
  emailUnveils: "usageEmailUnveils",
  candidateUnveils: "usageCandidateUnveils",
  mobileUnveils: "usageMobileUnveils",
  linkedinLookups: "usageLinkedinLookups",
};

function utilisationFromUser(user) {
  return {
    candidateSearches: Math.max(0, Math.floor(Number(user?.usageCandidateSearches ?? 0))),
    emailUnveils: Math.max(0, Math.floor(Number(user?.usageEmailUnveils ?? 0))),
    candidateUnveils: Math.max(0, Math.floor(Number(user?.usageCandidateUnveils ?? 0))),
    mobileUnveils: Math.max(0, Math.floor(Number(user?.usageMobileUnveils ?? 0))),
    linkedinLookups: Math.max(0, Math.floor(Number(user?.usageLinkedinLookups ?? 0))),
  };
}

/**
 * @param {string} userId
 * @param {keyof typeof USAGE_FIELD} key
 * @param {number} [amount]
 */
async function incrementUserUsage(userId, key, amount = 1) {
  const field = USAGE_FIELD[key];
  if (!field || !userId || !mongoose.Types.ObjectId.isValid(String(userId))) return;
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
