const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const UserIntegration = require("../models/UserIntegration");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const { normalizeToE164 } = require("./whatsappPhoneUtils");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const {
  maybeHandleWhatsAppAiQualification,
  isWhatsAppAiEnabled,
} = require("./whatsappQualificationAiService");
const { maybeCompleteCampaign } = require("./campaignOutreachSendService");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const { applyMergeFields } = require("./outreachMergeService");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");

function phoneCandidates(raw) {
  const value = String(raw || "").trim();
  const digits = value.replace(/\D/g, "");
  const e164 = normalizeToE164(value);
  return [...new Set([value, digits, e164, e164 ? e164.replace(/\D/g, "") : ""])].filter(Boolean);
}

function sortTouchpoints(touchpoints) {
  return [...(touchpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getWhatsAppSenderFirstName(userId) {
  const doc = await UserIntegration.findOne({
    userId,
    provider: "whatsapp",
  })
    .select("senderName")
    .lean();
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  return "";
}

async function maybeSendReplyFollowUp(enrollment) {
  const nextOrder = Number(enrollment?.nextReplyFollowUpOrder) || 0;
  if (!nextOrder) return { sent: false };

  const plan = await WhatsAppOutreachPlan.findById(enrollment.outreachPlanId).lean();
  if (!plan) return { sent: false };
  const touchpoint = sortTouchpoints(plan.touchpoints).find(
    (tp) => Number(tp.order) === nextOrder && tp.isReplyFollowUp
  );
  if (!touchpoint) return { sent: false };

  const contact = {
    name: enrollment.contactName,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };
  const senderFirstName = await getWhatsAppSenderFirstName(enrollment.userId);
  const body = applyMergeFields(String(touchpoint.body || ""), { contact, senderFirstName }).trim();
  if (!body) return { sent: false };

  const sendResult = await sendWhatsAppSessionMessage(String(enrollment.userId), {
    to: String(enrollment.contactPhone || "").trim(),
    body,
  });

  await logCampaignWhatsAppMessage({
    userId: String(enrollment.userId),
    campaignId: String(enrollment.campaignId),
    enrollmentId: String(enrollment._id),
    candidateKey: enrollment.candidateKey,
    contactPhone: enrollment.contactPhone || "",
    direction: "outbound",
    body,
    sequenceStepOrder: nextOrder,
    sequenceStepLabel: String(touchpoint.label || `Reply question ${nextOrder - 3}`),
    provider: sendResult?.provider || "",
    externalMessageId: sendResult?.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt: new Date(),
  });

  const nextReplyOrder =
    sortTouchpoints(plan.touchpoints).find(
      (tp) => tp.isReplyFollowUp && Number(tp.order) > nextOrder
    )?.order || 0;

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        nextReplyFollowUpOrder: nextReplyOrder,
        lastSentAt: new Date(),
        lastMessageId: sendResult?.messageId || "",
      },
      $inc: { sentCount: 1 },
    }
  );

  notifyCampaignThreadUpdated(String(enrollment.userId), {
    campaignId: String(enrollment.campaignId),
    candidateKey: String(enrollment.candidateKey || ""),
    newMessages: 1,
    hasNewCandidateReply: false,
    source: "reply_followup_sent",
  });

  return { sent: true, order: nextOrder };
}

/**
 * @param {"meta"|"gupshup"} integrationProvider
 * @param {string} [businessKey] Meta phone_number_id or Gupshup source (digits)
 */
async function findEnrollmentForInbound(integrationProvider, businessKey, fromNumber) {
  const candidates = phoneCandidates(fromNumber);
  if (candidates.length === 0) return null;

  const integrationQuery = {
    provider: "whatsapp",
    whatsappProvider: integrationProvider,
  };

  if (integrationProvider === "meta") {
    const phoneNumberId = String(businessKey || "").trim();
    if (!phoneNumberId) return null;
    integrationQuery.metaPhoneNumberId = phoneNumberId;
  }

  const integrations = await UserIntegration.find(integrationQuery).select("userId").lean();
  if (integrations.length === 0) return null;

  let bestEnrollment = null;
  let bestUpdatedAt = 0;

  for (const integration of integrations) {
    const legacy = await CampaignSequenceEnrollment.findOne({
      userId: integration.userId,
      contactPhone: { $in: candidates },
    })
      .sort({ updatedAt: -1 })
      .lean();
    if (legacy) {
      const updatedAt = new Date(legacy.updatedAt || 0).getTime();
      if (updatedAt >= bestUpdatedAt) {
        bestEnrollment = legacy;
        bestUpdatedAt = updatedAt;
      }
    }

    const moduleEnrollment = await OutreachModuleEnrollment.findOne({
      userId: integration.userId,
      contactPhone: { $in: candidates },
      status: { $in: ["active", "paused"] },
    })
      .sort({ updatedAt: -1 })
      .lean();
    if (moduleEnrollment) {
      const updatedAt = new Date(moduleEnrollment.updatedAt || 0).getTime();
      if (updatedAt >= bestUpdatedAt) {
        bestEnrollment = moduleEnrollment;
        bestUpdatedAt = updatedAt;
      }
    }
  }

  return bestEnrollment;
}

function mapDeliveryStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "failed") return "failed";
  if (normalized === "read") return "read";
  if (normalized === "delivered") return "delivered";
  return "sent";
}

async function storeInboundWhatsAppMessage({
  enrollment,
  provider,
  externalMessageId,
  body,
  fromNumber,
  sentAt,
}) {
  if (enrollment?.outreachModuleCampaignId) {
    const { handleOutreachModuleInboundWhatsApp } = require("./outreachModuleSendService");
    return handleOutreachModuleInboundWhatsApp({
      enrollment,
      provider,
      externalMessageId,
      body,
      fromNumber,
      sentAt,
    });
  }

  const normalizedFromPhone = normalizeToE164(fromNumber) || fromNumber;

  const exists = await CampaignWhatsAppMessage.findOne({
    provider,
    externalMessageId,
    direction: "inbound",
  })
    .select("_id")
    .lean();
  if (exists) {
    return { action: "skipped", reason: "duplicate", externalMessageId };
  }

  await logCampaignWhatsAppMessage({
    userId: String(enrollment.userId),
    campaignId: String(enrollment.campaignId),
    enrollmentId: String(enrollment._id),
    candidateKey: enrollment.candidateKey,
    contactPhone: normalizedFromPhone || enrollment.contactPhone || fromNumber,
    direction: "inbound",
    body,
    sequenceStepOrder: null,
    sequenceStepLabel: "",
    provider,
    externalMessageId,
    status: "sent",
    errorMessage: "",
    sentAt,
  });

  const replyCount = Math.max(0, Number(enrollment.replyCount) || 0) + 1;
  const nextStatus =
    enrollment.status === "active" || enrollment.status === "deferred"
      ? "paused"
      : enrollment.status;

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        hasReply: true,
        replyCount,
        lastReplyAt: sentAt,
        lastReplySyncedAt: new Date(),
        contactPhone: normalizedFromPhone || enrollment.contactPhone || fromNumber,
        status: nextStatus,
        nextSendAt: nextStatus === "paused" ? null : enrollment.nextSendAt || null,
        lastError: nextStatus === "paused" ? "Candidate replied" : enrollment.lastError || "",
      },
    }
  );
  if (nextStatus === "paused") {
    await maybeCompleteCampaign(String(enrollment.campaignId));
  }

  notifyCampaignThreadUpdated(String(enrollment.userId), {
    campaignId: String(enrollment.campaignId),
    candidateKey: String(enrollment.candidateKey || ""),
    newMessages: 1,
    hasNewCandidateReply: true,
    source: "whatsapp_reply",
  });

  if (!isWhatsAppAiEnabled()) {
    await maybeSendReplyFollowUp(enrollment).catch((err) => {
      console.error("[whatsapp-inbound] reply-followup failed", err?.message || err);
    });
  } else {
    try {
      await maybeHandleWhatsAppAiQualification({
        enrollmentId: enrollment._id,
        inboundMessageId: externalMessageId,
        inboundBody: body,
      });
    } catch (err) {
      console.error("[whatsapp-inbound] whatsapp-ai failed", err?.message || err);
    }
  }

  return {
    action: "stored",
    externalMessageId,
    enrollmentId: String(enrollment._id),
    campaignId: String(enrollment.campaignId),
  };
}

async function updateOutboundDeliveryStatus({
  provider,
  externalMessageId,
  gsId,
  status,
  errorMessage,
  sentAt,
}) {
  const ids = [...new Set([externalMessageId, gsId].filter(Boolean))];
  if (ids.length === 0) {
    return { action: "skipped", reason: "missing_id" };
  }

  const mapped = mapDeliveryStatus(status);
  const updateResult = await CampaignWhatsAppMessage.updateOne(
    {
      provider,
      direction: "outbound",
      externalMessageId: { $in: ids },
    },
    {
      $set: {
        status: mapped,
        errorMessage: String(errorMessage || "").trim(),
        sentAt,
      },
    }
  );

  return {
    action: updateResult.matchedCount > 0 ? "updated" : "no_match",
    externalMessageId: ids[0],
    status: mapped,
    matched: updateResult.matchedCount,
  };
}

module.exports = {
  phoneCandidates,
  findEnrollmentForInbound,
  storeInboundWhatsAppMessage,
  updateOutboundDeliveryStatus,
  mapDeliveryStatus,
};
