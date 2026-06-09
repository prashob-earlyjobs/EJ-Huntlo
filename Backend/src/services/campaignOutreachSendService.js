const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const UserIntegration = require("../models/UserIntegration");
const OutreachPlan = require("../models/OutreachPlan");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const { sendGmailMessage } = require("./gmailSendService");
const { applyMergeFields, applyWhatsAppMergeFields } = require("./outreachMergeService");
const {
  assertWhatsAppReadyForSend,
  sendWhatsAppMessage,
} = require("./whatsappSendService");
const { assertValidRecipientPhone } = require("./whatsappPhoneUtils");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const {
  findCampaignInScope,
  findCampaignDocumentInScope,
  campaignOwnerUserId,
  campaignAccessFilterForActor,
} = require("../utils/campaignScope");

const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { recordOutboundSentMessage } = require("./campaignReplySyncService");
const { buildUnveilActivitiesForCampaign } = require("./campaignRevealActivityService");
const { getActiveRevealJobForCampaign } = require("./campaignRevealJobService");

const SEND_BATCH_SIZE = Math.max(
  1,
  Math.min(50, Number(process.env.OUTREACH_SEND_BATCH_SIZE) || 20)
);

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

const {
  computeFirstSendAt,
  normalizeStartSchedule,
  scheduledSendAt,
} = require("../utils/outreachScheduleUtils");
const { syncEnrollmentSchedulesForPlan } = require("./campaignEnrollmentScheduleSync");
const {
  assertGmailLaunchCapacity,
  reserveGmailDailySends,
  assertCanSendGmailToday,
  recordGmailSend,
} = require("./gmailDailySendLimitService");
const {
  assertOutreachCreditsAvailable,
  outreachChannelToCreditChannel,
} = require("./outreachCreditsService");

function sortTouchpoints(touchpoints) {
  return [...(touchpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function getTouchpointByOrder(touchpoints, order) {
  const step = Number(order);
  return (
    sortTouchpoints(touchpoints).find((tp) => Number(tp.order) === step) || null
  );
}

/** Prevent duplicate sends when multiple scheduler ticks overlap. */
async function claimEnrollmentForSend(enrollment) {
  const now = new Date();
  const stepOrder = enrollment.currentStepOrder || 1;
  const sentCount = enrollment.sentCount || 0;
  const processingUntil = new Date(now.getTime() + 10 * 60 * 1000);

  const claimFilter = {
    _id: enrollment._id,
    status: "active",
    currentStepOrder: stepOrder,
    sentCount,
    nextSendAt: { $lte: now },
  };
  if (stepOrder > 1) {
    claimFilter.hasReply = { $ne: true };
  }

  const claimed = await CampaignSequenceEnrollment.findOneAndUpdate(
    claimFilter,
    { $set: { nextSendAt: processingUntil } },
    { new: true }
  ).lean();

  return claimed;
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

async function loadCampaignAndPlan(actorUserId, campaignId) {
  const campaign = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaign);

  const planId = campaign.outreachPlanId ? String(campaign.outreachPlanId) : "";
  if (!planId) {
    const err = new Error("Link an outreach sequence to this campaign before launching.");
    err.statusCode = 400;
    throw err;
  }

  const channel = campaign.outreachChannel === "whatsapp" ? "whatsapp" : "gmail";
  const planOid = new mongoose.Types.ObjectId(planId);
  const ownerOid = userOid(ownerUserId);

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

  return { campaign, plan, touchpoints, channel, ownerUserId };
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

async function getSequenceStatus(actorUserId, campaignId) {
  const campaign = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaign);

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
        userId: userOid(ownerUserId),
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
async function launchCampaignSequence(actorUserId, campaignId) {
  const activeRevealJob = await getActiveRevealJobForCampaign(actorUserId, campaignId);
  if (activeRevealJob) {
    const err = new Error(
      "Contact unveil is still in progress. Wait for it to finish before launching."
    );
    err.code = "REVEAL_IN_PROGRESS";
    err.statusCode = 409;
    throw err;
  }

  let { campaign, plan, touchpoints, channel, ownerUserId } = await loadCampaignAndPlan(
    actorUserId,
    campaignId
  );
  const isWhatsApp = channel === "whatsapp";
  if (isWhatsApp) {
    await assertWhatsAppReadyForSend(ownerUserId);
  }

  const now = new Date();
  const { loadAllContactsForCampaign } = require("./campaignContactService");
  const contacts = await loadAllContactsForCampaign(campaignId);

  const creditChannel = outreachChannelToCreditChannel(channel);
  await assertOutreachCreditsAvailable(actorUserId, creditChannel, contacts.length, {
    excludeCampaignId: String(campaign._id),
  });

  if (!isWhatsApp) {
    await assertGmailLaunchCapacity(ownerUserId, contacts);
  }

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
      userId: ownerUserId,
      contact,
      isWhatsApp,
      now,
      firstReplyFollowUpOrder,
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

  if (!isWhatsApp && enrolled > 0) {
    await reserveGmailDailySends(ownerUserId, enrolled);
  }

  if (!isWhatsApp && enrolled > 0 && plan?._id) {
    const sync = await syncEnrollmentSchedulesForPlan(String(plan._id), {
      triggerSend: false,
    });
    const norm = normalizeStartSchedule(plan.startSchedule || {}, touchpoints[0]);
    const firstTp = touchpoints[0];
    const firstSendAt = computeFirstSendAt(now, plan.startSchedule, firstTp);
    console.log(
      `[outreach-send] launch plan=${plan._id} mode=${norm.mode} scheduledAt=${norm.scheduledAt || "(none)"} firstSendAt=${firstSendAt.toISOString()} enrollmentsSynced=${sync.updated}`
    );
  }

  if (enrolled > 0) {
    setImmediate(() => {
      processDueEnrollments().catch((err) => {
        console.error(
          "[outreach-send] post-launch send tick:",
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
    revealJob: null,
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
  firstReplyFollowUpOrder = 0,
}) {
  const candidateKey = String(contact?.candidateKey || "").trim();
  const email = String(contact?.email || "").trim();
  let phone = String(contact?.phone || "").trim();
  if (isWhatsApp && phone) {
    try {
      phone = assertValidRecipientPhone(phone);
    } catch {
      phone = String(contact?.phone || "").trim();
    }
  }
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
  const firstSendAt = computeFirstSendAt(now, plan.startSchedule, firstTouchpoint);

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
        nextReplyFollowUpOrder: isWhatsApp ? firstReplyFollowUpOrder : 0,
      },
      $unset: {
        lastSentAt: 1,
        lastMessageId: 1,
        lastThreadId: 1,
        lastReplyAt: 1,
        lastReplySyncedAt: 1,
        replyDispositionAt: 1,
        lastAutoReplyAt: 1,
        lastWhatsAppAiHandledMessageId: 1,
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
async function enrollAddedContactsIfCampaignActive(actorUserId, campaignId, candidateKeys = []) {
  const keys = Array.isArray(candidateKeys)
    ? candidateKeys.map((k) => String(k || "").trim()).filter(Boolean)
    : [];
  if (keys.length === 0) return { enrolled: 0, skipped: 0, active: false };

  const campaign = await findCampaignInScope(actorUserId, campaignId);
  if (!["active", "completed"].includes(campaign.outreachStatus || "idle")) {
    return { enrolled: 0, skipped: 0, active: false };
  }
  if (!campaign.outreachPlanId) {
    return { enrolled: 0, skipped: 0, active: true };
  }

  const { plan, touchpoints, channel, ownerUserId } = await loadCampaignAndPlan(
    actorUserId,
    campaignId
  );
  const isWhatsApp = channel === "whatsapp";
  const { loadContactsByCandidateKeys } = require("./campaignContactService");
  const contacts = await loadContactsByCandidateKeys(campaignId, keys);
  const now = new Date();

  let enrolled = 0;
  let skipped = 0;
  for (const contact of contacts) {
    const firstReplyFollowUpOrder = isWhatsApp
      ? (touchpoints.find((tp) => tp && tp.isReplyFollowUp)?.order || 0)
      : 0;
    const result = await upsertEnrollmentForContact({
      campaign: { _id: campaign._id },
      plan,
      touchpoints,
      userId: ownerUserId,
      contact,
      isWhatsApp,
      now,
      firstReplyFollowUpOrder,
    });
    if (result === "enrolled") enrolled += 1;
    else skipped += 1;
  }

  if (enrolled > 0) {
    setImmediate(() => {
      processDueEnrollments().catch((err) => {
        console.error("[outreach-send] post-enroll send tick:", err?.message || err);
      });
    });
  }

  return { enrolled, skipped, active: true };
}

async function pauseCampaignSequence(actorUserId, campaignId) {
  const campaign = await findCampaignDocumentInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaign);

  await CampaignSequenceEnrollment.updateMany(
    {
      campaignId: campaign._id,
      userId: userOid(ownerUserId),
      status: "active",
    },
    { $set: { status: "paused" } }
  );

  campaign.outreachStatus = "paused";
  await campaign.save();

  return { outreachStatus: "paused" };
}

async function resumeCampaignSequence(actorUserId, campaignId) {
  const { campaign, plan, touchpoints, channel, ownerUserId } = await loadCampaignAndPlan(
    actorUserId,
    campaignId
  );
  const now = new Date();
  const isWhatsApp = channel === "whatsapp";

  const paused = await CampaignSequenceEnrollment.find({
    campaignId: campaign._id,
    userId: userOid(ownerUserId),
    status: "paused",
  }).lean();

  let resumed = 0;
  for (const row of paused) {
    if (row.hasReply) continue;
    const stepOrder = row.currentStepOrder || 1;
    const tp = getTouchpointByOrder(touchpoints, stepOrder);
    let nextSendAt = scheduledSendAt(now, tp);
    if (
      !isWhatsApp &&
      stepOrder === 1 &&
      (row.sentCount || 0) === 0 &&
      plan?.startSchedule
    ) {
      nextSendAt = computeFirstSendAt(now, plan.startSchedule, tp);
    }
    await CampaignSequenceEnrollment.updateOne(
      { _id: row._id },
      {
        $set: {
          status: "active",
          nextSendAt,
          lastError: "",
        },
      }
    );
    resumed += 1;
  }

  await Campaign.updateOne(
    { _id: campaign._id },
    { $set: { outreachStatus: "active" } }
  );

  if (resumed > 0) {
    setImmediate(() => {
      processDueEnrollments().catch((err) => {
        console.error("[outreach-send] post-resume send tick:", err?.message || err);
      });
    });
  }

  return { outreachStatus: "active" };
}

async function processEnrollmentDoc(enrollment) {
  const campaign = await Campaign.findById(enrollment.campaignId).lean();
  const status = campaign?.outreachStatus || "idle";
  if (!campaign || !["active", "completed"].includes(status)) {
    return;
  }

  const claimed = await claimEnrollmentForSend(enrollment);
  if (!claimed) {
    return;
  }

  if (campaign.outreachChannel === "whatsapp") {
    return processWhatsAppEnrollmentDoc(claimed, campaign);
  }

  return processGmailEnrollmentDoc(claimed, campaign);
}

async function processGmailEnrollmentDoc(enrollment, campaign) {
  const enrollmentId = enrollment._id;
  const userId = String(enrollment.userId);
  const campaignId = String(enrollment.campaignId);
  const stepOrder = enrollment.currentStepOrder || 1;

  if (stepOrder > 1 && enrollment.hasReply) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "paused",
          lastError: "Reply received — sequence paused",
        },
      }
    );
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
    email: enrollment.contactEmail,
    phone: enrollment.contactPhone,
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
    await assertCanSendGmailToday(userId);
    sendResult = await sendGmailMessage(userId, {
      to: email,
      subject,
      body,
    });
    await recordGmailSend(userId);
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
  await maybeCompleteCampaign(campaignId);

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
    return;
  }

  if (touchpoint.isReplyFollowUp && !enrollment.hasReply) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "active",
          currentStepOrder: stepOrder,
          nextSendAt: null,
          lastError: "",
        },
      }
    );
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
    email: enrollment.contactEmail,
    phone: enrollment.contactPhone,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };

  const templateId = String(touchpoint.templateId || "").trim();
  const body = applyWhatsAppMergeFields(String(touchpoint.body || ""), {
    contact,
    senderFirstName,
    campaign,
    templateId,
  }).trim();

  if (!templateId && !body) {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollmentId },
      {
        $set: {
          status: "failed",
          lastError: `WhatsApp step ${stepOrder} needs a Meta template name or message body`,
        },
      }
    );
    return;
  }

  let sendResult;
  try {
    sendResult = await sendWhatsAppMessage(userId, {
      to: normalizedPhone,
      body,
      templateId,
      contact,
      senderFirstName,
      campaign,
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
      provider: "",
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
  await maybeCompleteCampaign(campaignId);

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

/**
 * Mark campaign completed on the first successful email/WhatsApp send from the sequence.
 * Follow-up steps continue while status is completed (see processDueEnrollments).
 */
async function maybeCompleteCampaign(campaignId) {
  const campaignOid = new mongoose.Types.ObjectId(campaignId);
  const result = await Campaign.updateOne(
    { _id: campaignOid, outreachStatus: "active" },
    { $set: { outreachStatus: "completed" } }
  );
  if (!result.modifiedCount) return false;

  const campaign = await Campaign.findById(campaignOid).select("userId").lean();
  if (!campaign) return false;

  const { notifyCampaignThreadUpdated } = require("../realtime/notify");
  notifyCampaignThreadUpdated(String(campaign.userId), {
    campaignId: String(campaignId),
    candidateKey: "",
    newMessages: 0,
    hasNewCandidateReply: false,
    source: "campaign_completed",
    outreachStatus: "completed",
  });

  return true;
}

/**
 * Process enrollments whose nextSendAt is due (immediate or delayed start/wait).
 */
async function processDueEnrollments() {
  const now = new Date();
  const runningCampaignIds = await Campaign.find({
    outreachStatus: { $in: ["active", "completed"] },
  })
    .distinct("_id")
    .lean();
  if (runningCampaignIds.length === 0) return 0;

  const due = await CampaignSequenceEnrollment.find({
    status: "active",
    nextSendAt: { $lte: now },
    campaignId: { $in: runningCampaignIds },
  })
    .sort({ nextSendAt: 1 })
    .limit(SEND_BATCH_SIZE)
    .lean();

  if (due.length > 0) {
    console.log(
      `[outreach-scheduler] ${due.length} due enrollment(s), oldest nextSendAt ${due[0].nextSendAt?.toISOString?.() || due[0].nextSendAt}`
    );
  }

  let processed = 0;
  for (const enrollment of due) {
    try {
      await processEnrollmentDoc(enrollment);
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[outreach-send] enrollment ${enrollment._id}:`, message);
      await CampaignSequenceEnrollment.updateOne(
        { _id: enrollment._id },
        {
          $set: {
            status: "failed",
            lastError: message.slice(0, 500),
          },
        }
      );
    }
  }

  if (processed > 0) {
    console.log(`[outreach-scheduler] sent ${processed} enrollment(s)`);
  }

  return processed;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function formatReportCandidate(row, { isWhatsApp, status }) {
  const name = String(row.contactName || "").trim() || "Unnamed contact";
  const enrollmentStatus = status || row.status || "";
  let detail = String(row.lastError || "").trim();
  if (enrollmentStatus === "skipped") {
    detail = detail || (isWhatsApp ? "No phone on file" : "No email on file");
  } else if (enrollmentStatus === "failed") {
    detail = detail || (isWhatsApp ? "WhatsApp send failed" : "Send failed");
  } else if (row.replyDisposition === "interested") {
    detail = "Interested";
  } else if (row.replyDisposition === "not_interested") {
    detail = "Not interested";
  } else if (row.hasReply) {
    detail = "Replied";
  } else if ((row.sentCount || 0) > 0) {
    detail = `Sent ${row.sentCount || 1} message${(row.sentCount || 0) === 1 ? "" : "s"}`;
  }

  return {
    candidateKey: String(row.candidateKey || "").trim(),
    name,
    email: String(row.contactEmail || "").trim(),
    phone: String(row.contactPhone || "").trim(),
    role: String(row.contactRole || "").trim(),
    company: String(row.contactCompany || "").trim(),
    enrollmentStatus,
    replyDisposition: String(row.replyDisposition || "unknown"),
    sentCount: row.sentCount || 0,
    hasReply: Boolean(row.hasReply),
    detail,
    lastSentAt: row.lastSentAt || null,
    lastReplyAt: row.lastReplyAt || null,
  };
}

function sortReportCandidates(list) {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function parseActivityPagination(options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(
    50,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 20)
  );
  return { page, limit };
}

function paginateActivityList(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * limit;
  return {
    activities: items.slice(skip, skip + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    },
  };
}

function buildRecentActivityFromEnrollments(enrollments, channel) {
  const isWhatsApp = channel === "whatsapp";
  const recentActivity = [];

  for (const row of enrollments) {
    const name = String(row.contactName || "").trim() || "Contact";
    const status = row.status || "";
    const contactEmail = String(row.contactEmail || "").trim();
    const contactPhone = String(row.contactPhone || "").trim();

    if (status === "failed" || status === "skipped") {
      recentActivity.push({
        type: status === "skipped" ? "skipped" : "failed",
        candidateKey: row.candidateKey || "",
        contactName: name,
        contactEmail,
        contactPhone,
        at: row.updatedAt || row.lastSentAt || new Date(),
        detail:
          row.lastError ||
          (status === "skipped"
            ? isWhatsApp
              ? "No phone on file"
              : "No email on file"
            : isWhatsApp
              ? "WhatsApp send failed"
              : "Send failed"),
      });
      continue;
    }

    if ((row.sentCount || 0) > 0) {
      if (row.lastSentAt) {
        recentActivity.push({
          type: "sent",
          candidateKey: row.candidateKey || "",
          contactName: name,
          contactEmail,
          contactPhone,
          at: row.lastSentAt,
          detail: isWhatsApp
            ? `Message ${row.sentCount || 1} sent`
            : `Step ${row.sentCount || 1} sent`,
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
          contactEmail,
          contactPhone,
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

  recentActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return recentActivity;
}

async function loadCampaignReportEnrollments(actorUserId, campaignId) {
  const campaign = await findCampaignInScope(actorUserId, campaignId, {
    select: "outreachChannel outreachStatus outreachStartedAt name userId contactCount",
  });
  const ownerUserId = campaignOwnerUserId(campaign);
  const {
    countContactsForCampaign,
    countContactsWithEmail,
    countContactsWithPhone,
  } = require("./campaignContactService");

  const channel = campaign.outreachChannel === "whatsapp" ? "whatsapp" : "email";
  const totalContacts = await countContactsForCampaign(campaignId);
  const contactsWithEmail = await countContactsWithEmail(campaignId);
  const contactsWithPhone = await countContactsWithPhone(campaignId);

  const enrollments = await CampaignSequenceEnrollment.find({
    campaignId: campaign._id,
    userId: userOid(ownerUserId),
  })
    .select(
      "candidateKey contactName contactEmail contactPhone contactRole contactCompany status sentCount hasReply replyDisposition lastSentAt lastReplyAt lastError updatedAt"
    )
    .lean();

  return {
    channel,
    campaign,
    enrollments,
    totalContacts,
    contactsWithEmail,
    contactsWithPhone,
  };
}

function buildCampaignReportFromEnrollments({
  channel,
  campaign,
  enrollments,
  totalContacts,
  contactsWithEmail,
  contactsWithPhone,
}) {
  const isWhatsApp = channel === "whatsapp";
  let sent = 0;
  let notDelivered = 0;
  let replied = 0;
  let interested = 0;
  let notInterested = 0;

  const breakdown = {
    sent: [],
    replied: [],
    interested: [],
    not_interested: [],
    not_delivered: [],
    awaiting_reply: [],
  };

  for (const row of enrollments) {
    const name = String(row.contactName || "").trim() || "Contact";
    const status = row.status || "";
    const contactEmail = String(row.contactEmail || "").trim();
    const contactPhone = String(row.contactPhone || "").trim();

    if (status === "failed" || status === "skipped") {
      notDelivered += 1;
      breakdown.not_delivered.push(
        formatReportCandidate(row, { isWhatsApp, status })
      );
      continue;
    }

    if ((row.sentCount || 0) > 0) {
      sent += 1;
      const candidate = formatReportCandidate(row, { isWhatsApp, status });
      breakdown.sent.push(candidate);

      if (row.hasReply) {
        replied += 1;
        breakdown.replied.push(candidate);
      } else {
        breakdown.awaiting_reply.push(candidate);
      }

      if (row.replyDisposition === "interested") {
        interested += 1;
        breakdown.interested.push(candidate);
      }
      if (row.replyDisposition === "not_interested") {
        notInterested += 1;
        breakdown.not_interested.push(candidate);
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
      description: isWhatsApp
        ? "Contacts who received at least one WhatsApp message"
        : "Contacts who received at least one sequence email",
    },
    {
      key: "replied",
      label: "Replied",
      count: replied,
      rate: pct(replied, sentDenom),
      description: isWhatsApp
        ? "Candidates who replied on WhatsApp"
        : "Candidates who replied (Gmail does not provide open/read tracking for outreach)",
    },
    {
      key: "interested",
      label: "Interested",
      count: interested,
      rate: pct(interested, sentDenom),
      description: isWhatsApp
        ? "Candidates classified as interested (AI qualification or manual outcome)"
        : "Replies classified as interested",
    },
    {
      key: "not_interested",
      label: "Not interested",
      count: notInterested,
      rate: pct(notInterested, sentDenom),
      description: isWhatsApp
        ? "Candidates classified as not interested"
        : "Replies classified as not interested",
    },
    {
      key: "not_delivered",
      label: "Not delivered",
      count: notDelivered,
      rate: pct(notDelivered, enrollments.length || totalContacts),
      description: isWhatsApp
        ? "Skipped (no phone) or failed to send"
        : "Skipped (no email) or failed to send",
    },
    {
      key: "awaiting_reply",
      label: "Awaiting reply",
      count: awaitingReply,
      rate: pct(awaitingReply, sentDenom),
      description: isWhatsApp
        ? "Sent at least one message but no reply yet"
        : "Sent at least one email but no reply yet",
    },
  ];

  for (const key of Object.keys(breakdown)) {
    breakdown[key] = sortReportCandidates(breakdown[key]);
  }

  return {
    channel,
    campaignName: campaign.name || "",
    outreachStatus: campaign.outreachStatus || "idle",
    outreachStartedAt: campaign.outreachStartedAt || null,
    totalContacts,
    contactsWithEmail,
    contactsWithPhone,
    enrolled: enrollments.length,
    sent,
    replied,
    interested,
    notInterested,
    notDelivered,
    awaitingReply,
    matrix,
    breakdown,
    note: null,
  };
}

/**
 * Outreach metrics for campaign Report / Activity tabs (Gmail and WhatsApp).
 * "Replied" is used instead of opens — Gmail API does not expose read receipts for outreach.
 */
async function getEmailCampaignReport(userId, campaignId) {
  const ctx = await loadCampaignReportEnrollments(userId, campaignId);
  return buildCampaignReportFromEnrollments(ctx);
}

/**
 * Paginated outreach activity for the Activity tab.
 */
async function getEmailCampaignReportActivity(userId, campaignId, options = {}) {
  const { page, limit } = parseActivityPagination(options);
  const ctx = await loadCampaignReportEnrollments(userId, campaignId);
  const outreachActivities = buildRecentActivityFromEnrollments(ctx.enrollments, ctx.channel);
  const unveilActivities = await buildUnveilActivitiesForCampaign(userId, campaignId);
  const allActivities = [...outreachActivities, ...unveilActivities].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const { activities, pagination } = paginateActivityList(allActivities, page, limit);

  return {
    channel: ctx.channel,
    campaignName: ctx.campaign.name || "",
    outreachStatus: ctx.campaign.outreachStatus || "idle",
    activities,
    pagination,
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
  getEmailCampaignReportActivity,
  processDueEnrollments,
  maybeCompleteCampaign,
  deleteEnrollmentsForCampaign,
  formatEnrollment,
};
