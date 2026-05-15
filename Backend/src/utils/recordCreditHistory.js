const CreditHistory = require("../models/CreditHistory");

/**
 * Append one ledger row when credits change.
 */
const recordCreditHistory = async ({
  userId,
  balanceBefore,
  balanceAfter,
  reason,
  performedBy,
}) => {
  const bb = Math.max(0, Math.floor(Number(balanceBefore)));
  const ba = Math.max(0, Math.floor(Number(balanceAfter)));

  await CreditHistory.create({
    userId,
    balanceBefore: bb,
    balanceAfter: ba,
    delta: ba - bb,
    reason,
    performedBy: performedBy || undefined,
  });
};

module.exports = { recordCreditHistory };
