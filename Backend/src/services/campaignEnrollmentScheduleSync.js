const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const OutreachPlan = require("../models/OutreachPlan");
const { computeFirstSendAt } = require("../utils/outreachScheduleUtils");

function sortTouchpoints(touchpoints) {
  return [...(touchpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Recompute step-1 `nextSendAt` for active Gmail enrollments that have not sent yet.
 */
async function syncEnrollmentSchedulesForPlan(planId, { triggerSend = true } = {}) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { updated: 0 };
  }

  const plan = await OutreachPlan.findById(planId).lean();
  if (!plan) return { updated: 0 };

  const touchpoints = sortTouchpoints(plan.touchpoints);
  const firstTouchpoint = touchpoints[0];
  if (!firstTouchpoint) return { updated: 0 };

  const now = new Date();
  const firstSendAt = computeFirstSendAt(now, plan.startSchedule, firstTouchpoint);

  const campaigns = await Campaign.find({
    outreachPlanId: new mongoose.Types.ObjectId(planId),
    outreachStatus: { $in: ["active", "completed"] },
    outreachChannel: { $ne: "whatsapp" },
  })
    .select("_id")
    .lean();

  if (campaigns.length === 0) return { updated: 0 };

  const campaignIds = campaigns.map((c) => c._id);
  const result = await CampaignSequenceEnrollment.updateMany(
    {
      campaignId: { $in: campaignIds },
      status: "active",
      currentStepOrder: 1,
      sentCount: 0,
    },
    { $set: { nextSendAt: firstSendAt } }
  );

  const updated = result.modifiedCount || 0;
  const norm = require("../utils/outreachScheduleUtils").normalizeStartSchedule(
    plan.startSchedule || {}
  );
  console.log(
    `[outreach-send] schedule sync plan=${planId} mode=${norm.mode} firstSendAt=${firstSendAt.toISOString()} updated=${updated}`
  );

  if (
    triggerSend &&
    (updated > 0 || firstSendAt.getTime() <= now.getTime())
  ) {
    setImmediate(() => {
      const { processDueEnrollments } = require("./campaignOutreachSendService");
      processDueEnrollments().catch((err) => {
        console.error("[outreach-send] post-schedule-sync tick:", err?.message || err);
      });
    });
  }

  return { updated, firstSendAt: firstSendAt.toISOString(), mode: norm.mode };
}

module.exports = {
  syncEnrollmentSchedulesForPlan,
};
