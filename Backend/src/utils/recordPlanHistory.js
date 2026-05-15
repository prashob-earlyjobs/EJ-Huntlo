const PlanHistory = require("../models/PlanHistory");

/**
 * Log when a user's pricing plan is assigned or changed.
 */
const recordPlanHistory = async ({ userId, planIdBefore, planIdAfter, performedBy }) => {
  const after = String(planIdAfter || "").trim();
  if (!after || !userId) return;

  const before = String(planIdBefore || "").trim();

  await PlanHistory.create({
    userId,
    planIdBefore: before,
    planIdAfter: after,
    performedBy: performedBy || undefined,
  });
};

module.exports = { recordPlanHistory };
