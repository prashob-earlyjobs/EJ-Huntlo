const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const UserIntegration = require("../models/UserIntegration");
const OutreachPlan = require("../models/OutreachPlan");
const { sendGmailMessage } = require("./gmailSendService");
const { applyMergeFields } = require("./outreachMergeService");

const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { recordOutboundSentMessage } = require("./campaignReplySyncService");

const SEND_BATCH_SIZE = Math.max(
  1,
  Math.min(50, Number(process.env.OUTREACH_SEND_BATCH_SIZE) || 20)
);

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function sortTouchpoints(touchpoints) {
  return [...(touchpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function getTouchpointByOrder(touchpoints, order) {
  const step = Number(order);
  return (
    sortTouchpoints(touchpoints).find((tp) => Number(tp.order) === step) || null
  );
}

/** Matches editor "immediate" — waitDays 0 on this step (send now, no day delay). */
function isImmediateTouchpoint(touchpoint) {
  return Math.max(0, Number(touchpoint?.waitDays) || 0) === 0;
}

async function getSenderFirstName(userId) {
  const doc = await UserIntegration.findOne({
    userId: userOid(userId),
    provider: "gmail",
  })
    .select("senderName email")
    .lean();
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  if (doc?.email?.includes("@")) {
    return doc.email.split("@")[0];
  }
  return "";
}

async function loadCampaignAndPlan(userId, campaignId) {
  const campaign = await Campaign.findOne({
    _id: new mongoose.Types.ObjectId(campaignId),
    userId: userOid(userId),
  }).lean();

  if (!campaign) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const planId = campaign.outreachPlanId ? String(campaign.outreachPlanId) : "";
  if (!planId) {
    const err = new Error("Link an outreach sequence to this campaign before launching.");
    err.statusCode = 400;
    throw err;
  }

  const plan = await OutreachPlan.findOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid(userId),
  }).lean();

  if (!plan) {
    const err = new Error("Outreach plan not found");
    err.statusCode = 404;
    throw err;
  }

  const touchpoints = sortTouchpoints(plan.touchpoints);
  if (touchpoints.length === 0) {
    const err = new Error("Outreach plan has no touchpoints");
    err.statusCode = 400;
    throw err;
  }

  const emptyBodyStep = touchpoints.find((tp) => !String(tp.body || "").trim());
  if (emptyBodyStep) {
    const err = new Error(
      `Step ${emptyBodyStep.order} has an empty message body. Save your sequence in the Editor tab before launching.`
    );
    err.statusCode = 400;
    throw err;
  }

  return { campaign, plan, touchpoints };
}

function formatEnrollment(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(o._id),
    campaignId: String(o.campaignId),
    candidateKey: o.candidateKey || "",
    contactEmail: o.contactEmail || "",
    contactName: o.contactName || "",
    status: o.status || "active",
    currentStepOrder: o.currentStepOrder || 1,
    nextSendAt: o.nextSendAt,
    lastSentAt: o.lastSentAt,
    sentCount: o.sentCount || 0,
    lastError: o.lastError || "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function getSequenceStatus(userId, campaignId) {
  const campaign = await Campaign.findOne({
    _id: new mongoose.Types.ObjectId(campaignId),
    userId: userOid(userId),
  }).lean();

  if (!campaign) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

  let touchpointCount = 0;
  if (campaign.outreachPlanId) {
    const plan = await OutreachPlan.findById(campaign.outreachPlanId).select("touchpoints").lean();
    touchpointCount = Array.isArray(plan?.touchpoints) ? plan.touchpoints.length : 0;
  }

  const counts = await CampaignSequenceEnrollment.aggregate([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId),
        userId: userOid(userId),
      },
    },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const enrollments = {
    active: 0,
    paused: 0,
    deferred: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  for (const row of counts) {
    const key = row._id;
    if (Object.prototype.hasOwnProperty.call(enrollments, key)) {
      enrollments[key] = row.count;
    }
    enrollments.total += row.count;
  }

  return {
    outreachStatus: campaign.outreachStatus || "idle",
    outreachPlanId: campaign.outreachPlanId ? String(campaign.outreachPlanId) : "",
    touchpointCount,
    enrollments,
  };
}

/**
 * Enroll all campaign contacts with an email and start the sequence clock.
 */
async function launchCampaignSequence(userId, campaignId) {
  const { campaign, plan, touchpoints } = await loadCampaignAndPlan(userId, campaignId);
  const now = new Date();
  const contacts = Array.isArray(campaign.contacts) ? campaign.contacts : [];

  let enrolled = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const candidateKey = String(contact.candidateKey || "").trim();
    const email = String(contact.email || "").trim();
    if (!candidateKey) {
      skipped += 1;
      continue;
    }
    if (!email || !email.includes("@")) {
      await CampaignSequenceEnrollment.findOneAndUpdate(
        {
          campaignId: campaign._id,
          candidateKey,
        },
        {
          $set: {
            userId: userOid(userId),
            outreachPlanId: plan._id,
            contactEmail: "",
            contactName: String(contact.name || "").trim(),
            contactRole: String(contact.role || "").trim(),
            contactCompany: String(contact.company || "").trim(),
            status: "skipped",
            lastError: "No email on file",
            nextSendAt: now,
          },
        },
        { upsert: true, new: true }
      );
      skipped += 1;
      continue;
    }

    const firstTouchpoint = touchpoints[0];
    const immediateStart = isImmediateTouchpoint(firstTouchpoint);

    await CampaignSequenceEnrollment.findOneAndUpdate(
      {
        campaignId: campaign._id,
        candidateKey,
      },
      {
        $set: {
          userId: userOid(userId),
          outreachPlanId: plan._id,
          contactEmail: email,
          contactName: String(contact.name || "").trim(),
          contactRole: String(contact.role || "").trim(),
          contactCompany: String(contact.company || "").trim(),
          currentStepOrder: 1,
          status: immediateStart ? "active" : "deferred",
          nextSendAt: immediateStart ? now : null,
          lastError: immediateStart
            ? ""
            : "Delayed schedule — timer only sends immediate steps for now",
          sentCount: 0,
          hasReply: false,
          replyCount: 0,
          replyDisposition: "unknown",
          autoReplyCount: 0,
          lastAutoRepliedToMessageId: "",
        },
        $unset: {
          lastSentAt: 1,
          lastMessageId: 1,
          lastThreadId: 1,
          lastReplyAt: 1,
          lastReplySyncedAt: 1,
          replyDispositionAt: 1,
          lastAutoReplyAt: 1,
        },
      },
      { upsert: true, new: true }
    );
    enrolled += 1;
  }

  await Campaign.updateOne(
    { _id: campaign._id },
    {
      $set: {
        outreachStatus: "active",
        outreachStartedAt: now,
      },
    }
  );

  return {
    enrolled,
    skipped,
    touchpointCount: touchpoints.length,
    outreachStatus: "active",
  };
}

async function pauseCampaignSequence(userId, campaignId) {
  const campaign = await Campaign.findOne({
    _id: new mongoose.Types.ObjectId(campaignId),
    userId: userOid(userId),
  });
  if (!campaign) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

  await CampaignSequenceEnrollment.updateMany(
    {
      campaignId: campaign._id,
      userId: userOid(userId),
      status: "active",
    },
    { $set: { status: "paused" } }
  );

  campaign.outreachStatus = "paused";
  await campaign.save();

  return { outreachStatus: "paused" };
}

async function resumeCampaignSequence(userId, campaignId) {
  const { campaign, touchpoints } = await loadCampaignAndPlan(userId, campaignId);
  const now = new Date();

  const paused = await CampaignSequenceEnrollment.find({
    campaignId: campaign._id,
    userId: userOid(userId),
    status: "paused",
  }).lean();

  for (const row of paused) {
    const tp = getTouchpointByOrder(touchpoints, row.currentStepOrder || 1);
    if (tp && isImmediateTouchpoint(tp)) {
      await CampaignSequenceEnrollment.updateOne(
        { _id: row._id },
        { $set: { status: "active", nextSendAt: now, lastError: "" } }
      );
    } else {
      await CampaignSequenceEnrollment.updateOne(
        { _id: row._id },
        { $set: { status: "deferred", nextSendAt: null } }
      );
    }
  }

  await Campaign.updateOne(
    { _id: campaign._id },
    { $set: { outreachStatus: "active" } }
  );

  return { outreachStatus: "active" };
}

async function processEnrollmentDoc(enrollment) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.campaignId);
  const stepOrder = enrollment.currentStepOrder || 1;

  const campaign = await Campaign.findById(enrollment.campaignId).lean();
  if (!campaign || campaign.outreachStatus !== "active") {
    return;
  }

  const plan = await OutreachPlan.findById(enrollment.outreachPlanId).lean();
  if (!plan) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "failed", lastError: "Outreach plan missing" } }
    );
    return;
  }

  const touchpoints = sortTouchpoints(plan.touchpoints);
  const touchpoint = getTouchpointByOrder(touchpoints, stepOrder);
  if (!touchpoint) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "completed", lastError: "" } }
    );
    return;
  }

  if (!isImmediateTouchpoint(touchpoint)) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "deferred",
          nextSendAt: null,
          lastError: "Delayed schedule — timer only sends immediate steps for now",
        },
      }
    );
    return;
  }

  const email = String(enrollment.contactEmail || "").trim();
  if (!email.includes("@")) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "skipped", lastError: "No valid email" } }
    );
    return;
  }

  const senderFirstName = await getSenderFirstName(userId);
  const contact = {
    name: enrollment.contactName,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };
  const subject = applyMergeFields(touchpoint.subject, { contact, senderFirstName }).trim();
  const body = applyMergeFields(String(touchpoint.body || ""), {
    contact,
    senderFirstName,
  }).trim();

  if (!body) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError:
            "Touchpoint body is empty. Edit the sequence, add message text to step " +
            stepOrder +
            ", save, and launch again.",
        },
      }
    );
    return;
  }

  let sendResult;
  try {
    sendResult = await sendGmailMessage(userId, {
      to: email,
      subject,
      body,
    });
  } catch (err) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "Send failed",
        },
      }
    );
    return;
  }

  await recordOutboundSentMessage({
    enrollment,
    sendResult,
    subject,
    body,
    toEmail: email,
  });

  const now = new Date();
  const sentCount = (enrollment.sentCount || 0) + 1;
  const nextOrder = stepOrder + 1;
  const nextTouchpoint = getTouchpointByOrder(touchpoints, nextOrder);
  const candidateKey = String(enrollment.candidateKey || "").trim();

  if (!nextTouchpoint) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "completed",
          sentCount,
          lastSentAt: now,
          lastMessageId: sendResult.messageId || "",
          lastThreadId: sendResult.threadId || "",
          lastError: "",
        },
      }
    );
    await maybeCompleteCampaign(campaignId);
    notifyCampaignThreadUpdated(userId, {
      campaignId,
      candidateKey,
      newMessages: 1,
      hasNewCandidateReply: false,
      source: "outreach_sent",
    });
    return;
  }

  if (isImmediateTouchpoint(nextTouchpoint)) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "active",
          currentStepOrder: nextOrder,
          nextSendAt: now,
          sentCount,
          lastSentAt: now,
          lastMessageId: sendResult.messageId || "",
          lastThreadId: sendResult.threadId || "",
          lastError: "",
        },
      }
    );
    notifyCampaignThreadUpdated(userId, {
      campaignId,
      candidateKey,
      newMessages: 1,
      hasNewCandidateReply: false,
      source: "outreach_sent",
    });
    return;
  }

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        status: "deferred",
        currentStepOrder: nextOrder,
        nextSendAt: null,
        sentCount,
        lastSentAt: now,
        lastMessageId: sendResult.messageId || "",
        lastThreadId: sendResult.threadId || "",
        lastError: "Delayed schedule — timer only sends immediate steps for now",
      },
    }
  );
  notifyCampaignThreadUpdated(userId, {
    campaignId,
    candidateKey,
    newMessages: 1,
    hasNewCandidateReply: false,
    source: "outreach_sent",
  });
}

async function maybeCompleteCampaign(campaignId) {
  const remaining = await CampaignSequenceEnrollment.countDocuments({
    campaignId: new mongoose.Types.ObjectId(campaignId),
    status: { $in: ["active", "paused", "deferred"] },
  });
  if (remaining === 0) {
    await Campaign.updateOne(
      { _id: new mongoose.Types.ObjectId(campaignId) },
      { $set: { outreachStatus: "completed" } }
    );
  }
}

/**
 * Process enrollments due for an immediate send (waitDays === 0 on current step).
 * Delayed steps (waitDays > 0) stay deferred until a future scheduler is added.
 */
async function processDueEnrollments() {
  const now = new Date();
  const activeCampaignIds = await Campaign.find({ outreachStatus: "active" })
    .distinct("_id")
    .lean();
  if (activeCampaignIds.length === 0) return 0;

  const due = await CampaignSequenceEnrollment.find({
    status: "active",
    nextSendAt: { $lte: now },
    campaignId: { $in: activeCampaignIds },
  })
    .sort({ nextSendAt: 1 })
    .limit(SEND_BATCH_SIZE)
    .lean();

  let processed = 0;
  for (const enrollment of due) {
    try {
      const plan = await OutreachPlan.findById(enrollment.outreachPlanId)
        .select("touchpoints")
        .lean();
      const touchpoints = sortTouchpoints(plan?.touchpoints);
      const touchpoint = getTouchpointByOrder(
        touchpoints,
        enrollment.currentStepOrder || 1
      );
      if (!touchpoint || !isImmediateTouchpoint(touchpoint)) {
        continue;
      }
      await processEnrollmentDoc(enrollment);
      processed += 1;
    } catch (err) {
      console.error(
        `[outreach-send] enrollment ${enrollment._id}:`,
        err?.message || err
      );
    }
  }

  return processed;
}

async function deleteEnrollmentsForCampaign(campaignId) {
  await CampaignSequenceEnrollment.deleteMany({
    campaignId: new mongoose.Types.ObjectId(campaignId),
  });
}

module.exports = {
  launchCampaignSequence,
  pauseCampaignSequence,
  resumeCampaignSequence,
  getSequenceStatus,
  processDueEnrollments,
  deleteEnrollmentsForCampaign,
  formatEnrollment,
};
