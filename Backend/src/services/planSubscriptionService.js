const mongoose = require("mongoose");
const User = require("../models/User");
const { recordPlanHistory } = require("../utils/recordPlanHistory");
const { validatePlanIdExists } = require("./planQuotas");
const { getBillingUser } = require("./organizationService");

async function applyPlanToBillingUser({ billingUserId, planId, performedByUserId }) {
  const planCheck = await validatePlanIdExists(planId);
  if (!planCheck.ok) {
    const err = new Error(planCheck.message || "Invalid plan");
    err.code = "INVALID_PLAN";
    throw err;
  }

  const user = await User.findById(billingUserId);
  if (!user) {
    const err = new Error("Billing user not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const planIdBefore =
    typeof user.planId === "string" && user.planId.trim() ? user.planId.trim() : "";
  const planIdAfter = planCheck.planId;

  if (planIdBefore !== planIdAfter) {
    user.planId = planIdAfter;
    await user.save();

    const actorOid =
      performedByUserId && mongoose.Types.ObjectId.isValid(String(performedByUserId))
        ? new mongoose.Types.ObjectId(performedByUserId)
        : null;

    await recordPlanHistory({
      userId: user._id,
      planIdBefore,
      planIdAfter,
      performedBy: actorOid,
    });
  }

  return { user, planIdBefore, planIdAfter, changed: planIdBefore !== planIdAfter };
}

async function resolveBillingContext(actorUserId) {
  const actor = await User.findById(actorUserId);
  if (!actor) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }
  if (actor.role === "admin") {
    const err = new Error("Admins cannot purchase plans through checkout");
    err.code = "ADMIN_CHECKOUT_BLOCKED";
    throw err;
  }

  const billingUser = (await getBillingUser(actor)) || actor;
  return { actor, billingUser };
}

module.exports = {
  applyPlanToBillingUser,
  resolveBillingContext,
};
