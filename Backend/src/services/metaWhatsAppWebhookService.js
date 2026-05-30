const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const UserIntegration = require("../models/UserIntegration");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const { normalizeToE164 } = require("./whatsappPhoneUtils");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { applyMergeFields } = require("./outreachMergeService");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const {
  maybeHandleWhatsAppAiQualification,
  isWhatsAppAiEnabled,
} = require("./whatsappQualificationAiService");

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getMessageBody(message) {
  if (!message || typeof message !== "object") return "";
  if (typeof message.text?.body === "string") return message.text.body;
  if (typeof message.button?.text === "string") return message.button.text;
  if (typeof message.interactive?.button_reply?.title === "string") {
    return message.interactive.button_reply.title;
  }
  if (typeof message.interactive?.list_reply?.title === "string") {
    return message.interactive.list_reply.title;
  }
  if (typeof message.image?.caption === "string") return message.image.caption;
  if (typeof message.video?.caption === "string") return message.video.caption;
  if (typeof message.document?.caption === "string") return message.document.caption;
  return "";
}

function parseTimestampSeconds(value) {
  const secs = Number(value);
  if (!Number.isFinite(secs) || secs <= 0) return new Date();
  return new Date(secs * 1000);
}

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
    provider: sendResult?.provider || "meta",
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

async function findEnrollmentForInbound(phoneNumberId, fromNumber) {
  const candidates = phoneCandidates(fromNumber);
  if (!phoneNumberId || candidates.length === 0) {
    console.log("[meta-webhook] enrollment lookup skipped", {
      phoneNumberId: phoneNumberId || "(missing)",
      fromNumber: fromNumber || "(missing)",
      candidateCount: candidates.length,
    });
    return null;
  }

  const integrations = await UserIntegration.find({
    provider: "whatsapp",
    whatsappProvider: "meta",
    metaPhoneNumberId: String(phoneNumberId).trim(),
  })
    .select("userId")
    .lean();

  if (integrations.length === 0) {
    console.log("[meta-webhook] no integration for phone_number_id", {
      phoneNumberId,
      fromNumber,
      phoneCandidates: candidates,
    });
    return null;
  }

  for (const integration of integrations) {
    const enrollment = await CampaignSequenceEnrollment.findOne({
      userId: integration.userId,
      contactPhone: { $in: candidates },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (enrollment) {
      console.log("[meta-webhook] enrollment matched", {
        phoneNumberId,
        fromNumber,
        userId: String(enrollment.userId),
        enrollmentId: String(enrollment._id),
        campaignId: String(enrollment.campaignId),
        candidateKey: String(enrollment.candidateKey || ""),
        contactPhone: enrollment.contactPhone || "",
      });
      return enrollment;
    }
  }

  console.log("[meta-webhook] no enrollment for sender", {
    phoneNumberId,
    fromNumber,
    phoneCandidates: candidates,
    integrationUserIds: integrations.map((i) => String(i.userId)),
  });
  return null;
}

async function handleInboundMessage({ metadataPhoneNumberId, message }) {
  const from = String(message?.from || "").trim();
  const externalMessageId = String(message?.id || "").trim();
  const messageType = String(message?.type || "unknown").trim();

  if (!from || !externalMessageId) {
    console.log("[meta-webhook] inbound skipped (missing from or id)", {
      phoneNumberId: metadataPhoneNumberId,
      from: from || "(missing)",
      externalMessageId: externalMessageId || "(missing)",
      messageType,
    });
    return { kind: "inbound", action: "skipped", reason: "missing_fields" };
  }

  console.log("[meta-webhook] inbound message", {
    phoneNumberId: metadataPhoneNumberId,
    from,
    externalMessageId,
    messageType,
    timestamp: message?.timestamp,
  });

  const enrollment = await findEnrollmentForInbound(metadataPhoneNumberId, from);
  if (!enrollment) {
    return { kind: "inbound", action: "skipped", reason: "no_enrollment", from, externalMessageId };
  }

  const sentAt = parseTimestampSeconds(message?.timestamp);
  const body = getMessageBody(message);

  const exists = await CampaignWhatsAppMessage.findOne({
    provider: "meta",
    externalMessageId,
    direction: "inbound",
  })
    .select("_id")
    .lean();
  if (exists) {
    console.log("[meta-webhook] inbound duplicate ignored", {
      externalMessageId,
      existingId: String(exists._id),
    });
    return { kind: "inbound", action: "skipped", reason: "duplicate", externalMessageId };
  }

  await logCampaignWhatsAppMessage({
    userId: String(enrollment.userId),
    campaignId: String(enrollment.campaignId),
    enrollmentId: String(enrollment._id),
    candidateKey: enrollment.candidateKey,
    contactPhone: enrollment.contactPhone || from,
    direction: "inbound",
    body,
    sequenceStepOrder: null,
    sequenceStepLabel: "",
    provider: "meta",
    externalMessageId,
    status: "sent",
    errorMessage: "",
    sentAt,
  });

  const replyCount = Math.max(0, Number(enrollment.replyCount) || 0) + 1;
  const nextStatus =
    enrollment.status === "active" || enrollment.status === "deferred" ? "paused" : enrollment.status;

  await CampaignSequenceEnrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        hasReply: true,
        replyCount,
        lastReplyAt: sentAt,
        lastReplySyncedAt: new Date(),
        status: nextStatus,
        nextSendAt: nextStatus === "paused" ? null : enrollment.nextSendAt || null,
        lastError: nextStatus === "paused" ? "Candidate replied" : enrollment.lastError || "",
      },
    }
  );

  notifyCampaignThreadUpdated(String(enrollment.userId), {
    campaignId: String(enrollment.campaignId),
    candidateKey: String(enrollment.candidateKey || ""),
    newMessages: 1,
    hasNewCandidateReply: true,
    source: "whatsapp_reply",
  });

  const bodyPreview = body.length > 120 ? `${body.slice(0, 120)}…` : body;
  console.log("[meta-webhook] inbound stored", {
    externalMessageId,
    enrollmentId: String(enrollment._id),
    campaignId: String(enrollment.campaignId),
    candidateKey: String(enrollment.candidateKey || ""),
    replyCount,
    enrollmentStatus: nextStatus,
    bodyLength: body.length,
    bodyPreview: bodyPreview || "(empty)",
  });

  if (!isWhatsAppAiEnabled()) {
    const followUpResult = await maybeSendReplyFollowUp(enrollment).catch((err) => {
      console.error("[meta-webhook] reply-followup failed", err?.message || err);
      return { sent: false };
    });

    if (followUpResult.sent) {
      return {
        kind: "inbound",
        action: "stored",
        externalMessageId,
        enrollmentId: String(enrollment._id),
        campaignId: String(enrollment.campaignId),
      };
    }
  }

  try {
    const aiResult = await maybeHandleWhatsAppAiQualification({
      enrollmentId: enrollment._id,
      inboundMessageId: externalMessageId,
      inboundBody: body,
    });
    if (aiResult?.handled) {
      console.log("[meta-webhook] whatsapp-ai handled inbound", {
        campaignId: String(enrollment.campaignId),
        candidateKey: String(enrollment.candidateKey || ""),
        decision: aiResult.decision,
      });
    }
  } catch (err) {
    console.error("[meta-webhook] whatsapp-ai failed", err?.message || err);
  }

  return {
    kind: "inbound",
    action: "stored",
    externalMessageId,
    enrollmentId: String(enrollment._id),
    campaignId: String(enrollment.campaignId),
  };
}

function mapMetaStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "failed") return "failed";
  if (normalized === "read") return "read";
  if (normalized === "delivered") return "delivered";
  return "sent";
}

function parseMetaStatusError(entry) {
  const arr = toArray(entry?.errors);
  if (arr.length === 0) return "";
  const first = arr[0];
  return String(first?.title || first?.message || "").trim();
}

async function handleDeliveryStatus(statusEntry) {
  const externalMessageId = String(statusEntry?.id || "").trim();
  if (!externalMessageId) {
    console.log("[meta-webhook] status skipped (missing id)", {
      rawStatus: statusEntry?.status,
      recipient: statusEntry?.recipient_id,
    });
    return { kind: "status", action: "skipped", reason: "missing_id" };
  }

  const status = mapMetaStatus(statusEntry?.status);
  const errorMessage = parseMetaStatusError(statusEntry);
  const sentAt = parseTimestampSeconds(statusEntry?.timestamp);

  const updateResult = await CampaignWhatsAppMessage.updateOne(
    { provider: "meta", externalMessageId, direction: "outbound" },
    {
      $set: {
        status,
        errorMessage,
        sentAt,
      },
    }
  );

  console.log("[meta-webhook] status update", {
    externalMessageId,
    metaStatus: statusEntry?.status,
    mappedStatus: status,
    recipient: statusEntry?.recipient_id,
    matched: updateResult.matchedCount,
    modified: updateResult.modifiedCount,
    errorMessage: errorMessage || undefined,
  });

  return {
    kind: "status",
    action: updateResult.matchedCount > 0 ? "updated" : "no_match",
    externalMessageId,
    status,
    matched: updateResult.matchedCount,
  };
}

async function processMetaWebhookPayload(payload) {
  const outcomes = [];
  const entries = toArray(payload?.entry);

  for (const entry of entries) {
    for (const change of toArray(entry?.changes)) {
      const value = change?.value || {};
      const metadataPhoneNumberId = String(value?.metadata?.phone_number_id || "").trim();
      const field = String(change?.field || "").trim();

      const messages = toArray(value?.messages);
      const statuses = toArray(value?.statuses);

      if (messages.length > 0 || statuses.length > 0) {
        console.log("[meta-webhook] processing change", {
          field: field || "(unknown)",
          phoneNumberId: metadataPhoneNumberId || "(missing)",
          messageCount: messages.length,
          statusCount: statuses.length,
        });
      }

      for (const message of messages) {
        const outcome = await handleInboundMessage({ metadataPhoneNumberId, message });
        if (outcome) outcomes.push(outcome);
      }

      for (const status of statuses) {
        const outcome = await handleDeliveryStatus(status);
        if (outcome) outcomes.push(outcome);
      }
    }
  }

  return {
    processed: outcomes.length,
    outcomes,
  };
}

module.exports = {
  processMetaWebhookPayload,
};

