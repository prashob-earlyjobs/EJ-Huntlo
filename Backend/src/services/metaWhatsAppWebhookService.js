const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const UserIntegration = require("../models/UserIntegration");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const { logCampaignWhatsAppMessage } = require("./campaignWhatsAppCommsService");
const { normalizeToE164 } = require("./whatsappPhoneUtils");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");

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

async function findEnrollmentForInbound(phoneNumberId, fromNumber) {
  const candidates = phoneCandidates(fromNumber);
  if (!phoneNumberId || candidates.length === 0) return null;

  const integrations = await UserIntegration.find({
    provider: "whatsapp",
    whatsappProvider: "meta",
    metaPhoneNumberId: String(phoneNumberId).trim(),
  })
    .select("userId")
    .lean();

  if (integrations.length === 0) return null;

  for (const integration of integrations) {
    const enrollment = await CampaignSequenceEnrollment.findOne({
      userId: integration.userId,
      contactPhone: { $in: candidates },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (enrollment) return enrollment;
  }

  return null;
}

async function handleInboundMessage({ metadataPhoneNumberId, message }) {
  const from = String(message?.from || "").trim();
  const externalMessageId = String(message?.id || "").trim();
  if (!from || !externalMessageId) return;

  const enrollment = await findEnrollmentForInbound(metadataPhoneNumberId, from);
  if (!enrollment) return;

  const sentAt = parseTimestampSeconds(message?.timestamp);
  const body = getMessageBody(message);

  const exists = await CampaignWhatsAppMessage.findOne({
    provider: "meta",
    externalMessageId,
    direction: "inbound",
  })
    .select("_id")
    .lean();
  if (exists) return;

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
  if (!externalMessageId) return;

  const status = mapMetaStatus(statusEntry?.status);
  const errorMessage = parseMetaStatusError(statusEntry);
  const sentAt = parseTimestampSeconds(statusEntry?.timestamp);

  await CampaignWhatsAppMessage.updateOne(
    { provider: "meta", externalMessageId, direction: "outbound" },
    {
      $set: {
        status,
        errorMessage,
        sentAt,
      },
    }
  );
}

async function processMetaWebhookPayload(payload) {
  const entries = toArray(payload?.entry);
  for (const entry of entries) {
    for (const change of toArray(entry?.changes)) {
      const value = change?.value || {};
      const metadataPhoneNumberId = String(value?.metadata?.phone_number_id || "").trim();

      const messages = toArray(value?.messages);
      for (const message of messages) {
        await handleInboundMessage({ metadataPhoneNumberId, message });
      }

      const statuses = toArray(value?.statuses);
      for (const status of statuses) {
        await handleDeliveryStatus(status);
      }
    }
  }
}

module.exports = {
  processMetaWebhookPayload,
};

