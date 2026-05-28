const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const UserIntegration = require("../models/UserIntegration");
const OutreachPlan = require("../models/OutreachPlan");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const { sendGmailMessage } = require("./gmailSendService");
const { applyMergeFields } = require("./outreachMergeService");
const {
  assertWhatsAppReadyForSend,
  sendWhatsAppMessage,
} = require("./whatsappSendService");
const { assertValidRecipientPhone } = require("./whatsappPhoneUtils");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");

const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { recordOutboundSentMessage } = require("./campaignReplySyncService");

const SEND_BATCH_SIZE = Math.max(
  1,
  Math.min(50, Number(process.env.OUTREACH_SEND_BATCH_SIZE) || 20)
);

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Number(days) || 0));
  return d;
}

function addHours(baseDate, hours) {
  const d = new Date(baseDate);
  d.setUTCHours(d.getUTCHours() + Math.max(0, Number(hours) || 0));
  return d;
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

function getTouchpointDelayHours(touchpoint) {
  if (!touchpoint || typeof touchpoint !== "object") return 0;
  if (touchpoint.waitHours != null && Number.isFinite(Number(touchpoint.waitHours))) {
    return Math.max(0, Number(touchpoint.waitHours));
  }
  if (touchpoint.waitDays != null && Number.isFinite(Number(touchpoint.waitDays))) {
    return Math.max(0, Number(touchpoint.waitDays)) * 24;
  }
  return 0;
}

/**
 * Schedule next send using either:
 * - touchpoint object (`waitHours` or `waitDays`)
 * - numeric waitDays (legacy callers)
 */
function scheduledSendAt(baseDate, touchpointOrWaitDays) {
  if (
    touchpointOrWaitDays &&
    typeof touchpointOrWaitDays === "object" &&
    !Array.isArray(touchpointOrWaitDays)
  ) {
    return addHours(baseDate, getTouchpointDelayHours(touchpointOrWaitDays));
  }
  const waitDays = Math.max(0, Number(touchpointOrWaitDays) || 0);
  return addHours(baseDate, waitDays * 24);
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

async function getWhatsAppSenderFirstName(userId) {
  const doc = await UserIntegration.findOne({
    userId: userOid(userId),
    provider: "whatsapp",
  })
    .select("senderName email")
    .lean();
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
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

  const channel = campaign.outreachChannel === "whatsapp" ? "whatsapp" : "gmail";
  const planOid = new mongoose.Types.ObjectId(planId);
  const ownerOid = userOid(userId);

  let plan;
  if (channel === "whatsapp") {
    plan = await WhatsAppOutreachPlan.findOne({ _id: planOid, userId: ownerOid }).lean();
    if (!plan) {
      const err = new Error("WhatsApp outreach plan not found");
      err.statusCode = 404;
      throw err;
    }
  } else {
    plan = await OutreachPlan.findOne({ _id: planOid, userId: ownerOid }).lean();
    if (!plan) {
      const err = new Error("Outreach plan not found");
      err.statusCode = 404;
      throw err;
    }
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

  return { campaign, plan, touchpoints, channel };
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
    if (campaign.outreachChannel === "whatsapp") {
      const plan = await WhatsAppOutreachPlan.findById(campaign.outreachPlanId)
        .select("touchpoints")
        .lean();
      touchpointCount = Array.isArray(plan?.touchpoints) ? plan.touchpoints.length : 0;
    } else {
      const plan = await OutreachPlan.findById(campaign.outreachPlanId).select("touchpoints").lean();
      touchpointCount = Array.isArray(plan?.touchpoints) ? plan.touchpoints.length : 0;
    }
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
  const { campaign, plan, touchpoints, channel } = await loadCampaignAndPlan(userId, campaignId);
  const isWhatsApp = channel === "whatsapp";
  if (isWhatsApp) {
    await assertWhatsAppReadyForSend(userId);
  }
  const now = new Date();
  const contacts = Array.isArray(campaign.contacts) ? campaign.contacts : [];
  const firstReplyFollowUpOrder = isWhatsApp
    ? (touchpoints.find((tp) => tp && tp.isReplyFollowUp)?.order || 0)
    : 0;

  let enrolled = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const result = await upsertEnrollmentForContact({
      campaign,
      plan,
      touchpoints,
      userId,
      contact,
      isWhatsApp,
      now,
    });
    if (result === "enrolled") enrolled += 1;
    else skipped += 1;
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

  if (isWhatsApp && enrolled > 0) {
    setImmediate(() => {
      processDueEnrollments().catch((err) => {
        console.error(
          "[outreach-send] immediate WhatsApp tick:",
          err?.message || err
        );
      });
    });
  }

  return {
    enrolled,
    skipped,
    touchpointCount: touchpoints.length,
    outreachStatus: "active",
  };
}

async function upsertEnrollmentForContact({
  campaign,
  plan,
  touchpoints,
  userId,
  contact,
  isWhatsApp,
  now,
}) {
  const candidateKey = String(contact?.candidateKey || "").trim();
  const email = String(contact?.email || "").trim();
  const phone = String(contact?.phone || "").trim();
  if (!candidateKey) return "skipped";

  const hasContact = isWhatsApp ? Boolean(phone) : Boolean(email && email.includes("@"));
  if (!hasContact) {
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
          contactPhone: phone,
          contactName: String(contact.name || "").trim(),
          contactRole: String(contact.role || "").trim(),
          contactCompany: String(contact.company || "").trim(),
          status: "skipped",
          lastError: isWhatsApp ? "No phone on file" : "No email on file",
          nextSendAt: now,
        },
      },
      { upsert: true, new: true }
    );
    return "skipped";
  }

  const firstTouchpoint = touchpoints[0];
  const firstSendAt = scheduledSendAt(now, firstTouchpoint);

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
        contactPhone: phone,
        contactName: String(contact.name || "").trim(),
        contactRole: String(contact.role || "").trim(),
        contactCompany: String(contact.company || "").trim(),
        currentStepOrder: 1,
        status: "active",
        nextSendAt: firstSendAt,
        lastError: "",
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
  return "enrolled";
}

/**
 * If campaign is already active, enroll newly added contacts into the running sequence.
 * Existing enrollments are upserted/reset for these candidate keys only.
 */
async function enrollAddedContactsIfCampaignActive(userId, campaignId, candidateKeys = []) {
  const keys = Array.isArray(candidateKeys)
    ? candidateKeys.map((k) => String(k || "").trim()).filter(Boolean)
    : [];
  if (keys.length === 0) return { enrolled: 0, skipped: 0, active: false };

  const campaign = await Campaign.findOne({
    _id: new mongoose.Types.ObjectId(campaignId),
    userId: userOid(userId),
  }).lean();
  if (!campaign || campaign.outreachStatus !== "active") {
    return { enrolled: 0, skipped: 0, active: false };
  }
  if (!campaign.outreachPlanId) {
    return { enrolled: 0, skipped: 0, active: true };
  }

  const { plan, touchpoints, channel } = await loadCampaignAndPlan(userId, campaignId);
  const isWhatsApp = channel === "whatsapp";
  const keySet = new Set(keys);
  const contacts = (Array.isArray(campaign.contacts) ? campaign.contacts : []).filter((c) =>
    keySet.has(String(c?.candidateKey || "").trim())
  );
  const now = new Date();

  let enrolled = 0;
  let skipped = 0;
  for (const contact of contacts) {
    const result = await upsertEnrollmentForContact({
      campaign: { _id: campaign._id },
      plan,
      touchpoints,
      userId,
      contact,
      isWhatsApp,
      now,
    });
    if (result === "enrolled") enrolled += 1;
    else skipped += 1;
  }

  if (isWhatsApp && enrolled > 0) {
    setImmediate(() => {
      processDueEnrollments().catch((err) => {
        console.error("[outreach-send] immediate WhatsApp tick:", err?.message || err);
      });
    });
  }

  return { enrolled, skipped, active: true };
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
    await CampaignSequenceEnrollment.updateOne(
      { _id: row._id },
      {
        $set: {
          status: "active",
          nextSendAt: scheduledSendAt(now, tp),
          lastError: "",
        },
      }
    );
  }

  await Campaign.updateOne(
    { _id: campaign._id },
    { $set: { outreachStatus: "active" } }
  );

  return { outreachStatus: "active" };
}

async function processEnrollmentDoc(enrollment) {
  const campaign = await Campaign.findById(enrollment.campaignId).lean();
  if (!campaign || campaign.outreachStatus !== "active") {
    return;
  }

  if (campaign.outreachChannel === "whatsapp") {
    return processWhatsAppEnrollmentDoc(enrollment, campaign);
  }

  return processGmailEnrollmentDoc(enrollment, campaign);
}

async function processGmailEnrollmentDoc(enrollment, campaign) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.campaignId);
  const stepOrder = enrollment.currentStepOrder || 1;

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

  const nextSendAt = scheduledSendAt(now, nextTouchpoint);

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        status: "active",
        currentStepOrder: nextOrder,
        nextSendAt,
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
}

async function processWhatsAppEnrollmentDoc(enrollment, campaign) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.campaignId);
  const stepOrder = enrollment.currentStepOrder || 1;
  const candidateKey = String(enrollment.candidateKey || "").trim();

  const plan = await WhatsAppOutreachPlan.findById(enrollment.outreachPlanId).lean();
  if (!plan) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "failed", lastError: "WhatsApp outreach plan missing" } }
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
    await maybeCompleteCampaign(campaignId);
    return;
  }

  const contactPhone = String(enrollment.contactPhone || "").trim();
  let normalizedPhone;
  try {
    normalizedPhone = assertValidRecipientPhone(contactPhone);
  } catch {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      { $set: { status: "skipped", lastError: "No valid phone number" } }
    );
    return;
  }

  const senderFirstName = await getWhatsAppSenderFirstName(userId);
  const contact = {
    name: enrollment.contactName,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };

  const templateId = String(touchpoint.templateId || "").trim();
  const body = applyMergeFields(String(touchpoint.body || ""), {
    contact,
    senderFirstName,
  }).trim();

  // TODO(meta-whatsapp-test): Require plan templateId or body before production sends.
  // if (!templateId && !body) {
  //   await CampaignSequenceEnrollment.updateOne(
  //     { _id: enrollmentId },
  //     {
  //       $set: {
  //         status: "failed",
  //         lastError: `WhatsApp step ${stepOrder} is empty`,
  //       },
  //     }
  //   );
  //   return;
  // }

  let sendResult;
  try {
    sendResult = await sendWhatsAppMessage(userId, {
      to: normalizedPhone,
      body,
      // TODO(meta-whatsapp-test): Pass touchpoint.templateId from plan; metaWhatsAppSendService forces hello_world for now.
      templateId: templateId || "hello_world",
    });
  } catch (err) {
    await logCampaignWhatsAppMessage({
      userId,
      campaignId,
      enrollmentId,
      candidateKey,
      contactPhone,
      direction: "outbound",
      body,
      sequenceStepOrder: stepOrder,
      sequenceStepLabel: String(touchpoint.label || `Step ${stepOrder}`),
      provider: "meta",
      externalMessageId: "",
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "WhatsApp send failed",
      sentAt: new Date(),
    });
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "WhatsApp send failed",
        },
      }
    );
    return;
  }

  await logCampaignWhatsAppMessage({
    userId,
    campaignId,
    enrollmentId,
    candidateKey,
    contactPhone,
    direction: "outbound",
    body,
    sequenceStepOrder: stepOrder,
    sequenceStepLabel: String(touchpoint.label || `Step ${stepOrder}`),
    provider: sendResult?.provider || "meta",
    externalMessageId: sendResult?.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt: new Date(),
  });

  const now = new Date();
  const sentCount = (enrollment.sentCount || 0) + 1;
  const nextOrder = stepOrder + 1;
  const nextTouchpoint = getTouchpointByOrder(touchpoints, nextOrder);

  if (!nextTouchpoint) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "completed",
          sentCount,
          lastSentAt: now,
          lastMessageId: sendResult?.messageId || "",
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

  const nextSendAt = scheduledSendAt(now, nextTouchpoint);

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        status: "active",
        currentStepOrder: nextOrder,
        nextSendAt,
        sentCount,
        lastSentAt: now,
        lastMessageId: sendResult?.messageId || "",
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
 * Process enrollments whose nextSendAt is due (immediate or delayed start/wait).
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

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Email outreach metrics for campaign Report / Activity tabs.
 * "Replied" is used instead of opens — Gmail API does not expose read receipts for outreach.
 */
async function getEmailCampaignReport(userId, campaignId) {
  const campaign = await Campaign.findOne({
    _id: new mongoose.Types.ObjectId(campaignId),
    userId: userOid(userId),
  })
    .select("contacts outreachChannel outreachStatus outreachStartedAt name")
    .lean();

  if (!campaign) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const channel = campaign.outreachChannel === "whatsapp" ? "whatsapp" : "email";
  const totalContacts = Array.isArray(campaign.contacts) ? campaign.contacts.length : 0;
  const contactsWithEmail = (campaign.contacts || []).filter((c) =>
    String(c.email || "")
      .trim()
      .includes("@")
  ).length;

  if (channel === "whatsapp") {
    return {
      channel,
      campaignName: campaign.name || "",
      outreachStatus: campaign.outreachStatus || "idle",
      totalContacts,
      contactsWithEmail: 0,
      enrolled: 0,
      sent: 0,
      replied: 0,
      interested: 0,
      notInterested: 0,
      notDelivered: 0,
      awaitingReply: 0,
      matrix: [],
      recentActivity: [],
      note: "Switch to the WhatsApp tab for WhatsApp delivery and read metrics.",
    };
  }

  const enrollments = await CampaignSequenceEnrollment.find({
    campaignId: campaign._id,
    userId: userOid(userId),
  })
    .select(
      "candidateKey contactName contactEmail status sentCount hasReply replyDisposition lastSentAt lastReplyAt lastError updatedAt"
    )
    .lean();

  let sent = 0;
  let notDelivered = 0;
  let replied = 0;
  let interested = 0;
  let notInterested = 0;

  const recentActivity = [];

  for (const row of enrollments) {
    const name = String(row.contactName || "").trim() || "Contact";
    const status = row.status || "";

    if (status === "failed" || status === "skipped") {
      notDelivered += 1;
      recentActivity.push({
        type: status === "skipped" ? "skipped" : "failed",
        candidateKey: row.candidateKey || "",
        contactName: name,
        contactEmail: row.contactEmail || "",
        at: row.updatedAt || row.lastSentAt || new Date(),
        detail: row.lastError || (status === "skipped" ? "No email on file" : "Send failed"),
      });
      continue;
    }

    if ((row.sentCount || 0) > 0) {
      sent += 1;
      if (row.hasReply) replied += 1;
      if (row.replyDisposition === "interested") interested += 1;
      if (row.replyDisposition === "not_interested") notInterested += 1;

      if (row.lastSentAt) {
        recentActivity.push({
          type: "sent",
          candidateKey: row.candidateKey || "",
          contactName: name,
          contactEmail: row.contactEmail || "",
          at: row.lastSentAt,
          detail: `Step ${row.sentCount || 1} sent`,
        });
      }
      if (row.hasReply && row.lastReplyAt) {
        recentActivity.push({
          type:
            row.replyDisposition === "interested"
              ? "interested"
              : row.replyDisposition === "not_interested"
                ? "not_interested"
                : "reply",
          candidateKey: row.candidateKey || "",
          contactName: name,
          contactEmail: row.contactEmail || "",
          at: row.lastReplyAt,
          detail:
            row.replyDisposition === "interested"
              ? "Marked interested"
              : row.replyDisposition === "not_interested"
                ? "Marked not interested"
                : "Candidate replied",
        });
      }
    }
  }

  const awaitingReply = Math.max(0, sent - replied);
  const sentDenom = sent || 0;

  const matrix = [
    {
      key: "sent",
      label: "Sent",
      count: sent,
      rate: sentDenom > 0 ? 100 : 0,
      description: "Contacts who received at least one sequence email",
    },
    {
      key: "replied",
      label: "Replied",
      count: replied,
      rate: pct(replied, sentDenom),
      description:
        "Candidates who replied (Gmail does not provide open/read tracking for outreach)",
    },
    {
      key: "interested",
      label: "Interested",
      count: interested,
      rate: pct(interested, sentDenom),
      description: "Replies classified as interested",
    },
    {
      key: "not_interested",
      label: "Not interested",
      count: notInterested,
      rate: pct(notInterested, sentDenom),
      description: "Replies classified as not interested",
    },
    {
      key: "not_delivered",
      label: "Not delivered",
      count: notDelivered,
      rate: pct(notDelivered, enrollments.length || totalContacts),
      description: "Skipped (no email) or failed to send",
    },
    {
      key: "awaiting_reply",
      label: "Awaiting reply",
      count: awaitingReply,
      rate: pct(awaitingReply, sentDenom),
      description: "Sent at least one email but no reply yet",
    },
  ];

  recentActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    channel,
    campaignName: campaign.name || "",
    outreachStatus: campaign.outreachStatus || "idle",
    outreachStartedAt: campaign.outreachStartedAt || null,
    totalContacts,
    contactsWithEmail,
    enrolled: enrollments.length,
    sent,
    replied,
    interested,
    notInterested,
    notDelivered,
    awaitingReply,
    matrix,
    recentActivity: recentActivity.slice(0, 50),
    note: null,
  };
}

async function deleteEnrollmentsForCampaign(campaignId) {
  const { deleteWhatsAppMessagesForCampaign } = require("./campaignWhatsAppCommsService");
  await CampaignSequenceEnrollment.deleteMany({
    campaignId: new mongoose.Types.ObjectId(campaignId),
  });
  await deleteWhatsAppMessagesForCampaign(campaignId);
}

module.exports = {
  launchCampaignSequence,
  enrollAddedContactsIfCampaignActive,
  pauseCampaignSequence,
  resumeCampaignSequence,
  getSequenceStatus,
  getEmailCampaignReport,
  processDueEnrollments,
  deleteEnrollmentsForCampaign,
  formatEnrollment,
};
