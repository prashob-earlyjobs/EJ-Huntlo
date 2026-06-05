const { getActiveMessagingChannel } = require("./platformSettingsService");
const {
  findEnrollmentForInbound,
  storeInboundWhatsAppMessage,
  updateOutboundDeliveryStatus,
} = require("./whatsappInboundService");

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

function parseMetaStatusError(entry) {
  const arr = toArray(entry?.errors);
  if (arr.length === 0) return "";
  const first = arr[0];
  return String(first?.title || first?.message || "").trim();
}

async function handleInboundMessage({ metadataPhoneNumberId, message }) {
  const from = String(message?.from || "").trim();
  const externalMessageId = String(message?.id || "").trim();

  if (!from || !externalMessageId) {
    return { kind: "inbound", action: "skipped", reason: "missing_fields" };
  }

  const enrollment = await findEnrollmentForInbound(
    "meta",
    metadataPhoneNumberId,
    from
  );
  if (!enrollment) {
    return { kind: "inbound", action: "skipped", reason: "no_enrollment", from, externalMessageId };
  }

  const sentAt = parseTimestampSeconds(message?.timestamp);
  const body = getMessageBody(message);

  const result = await storeInboundWhatsAppMessage({
    enrollment,
    provider: "meta",
    externalMessageId,
    body,
    fromNumber: from,
    sentAt,
  });

  return { kind: "inbound", ...result };
}

async function handleDeliveryStatus(statusEntry) {
  const externalMessageId = String(statusEntry?.id || "").trim();
  if (!externalMessageId) {
    return { kind: "status", action: "skipped", reason: "missing_id" };
  }

  const errorMessage = parseMetaStatusError(statusEntry);
  const sentAt = parseTimestampSeconds(statusEntry?.timestamp);

  const outcome = await updateOutboundDeliveryStatus({
    provider: "meta",
    externalMessageId,
    gsId: "",
    status: statusEntry?.status,
    errorMessage,
    sentAt,
  });

  return { kind: "status", ...outcome };
}

async function processMetaWebhookPayload(payload) {
  const channel = await getActiveMessagingChannel();
  if (channel !== "huntlo_meta") {
    return { processed: 0, outcomes: [], skipped: "platform_uses_gupshup" };
  }

  const outcomes = [];
  const entries = toArray(payload?.entry);

  for (const entry of entries) {
    for (const change of toArray(entry?.changes)) {
      const value = change?.value || {};
      const metadataPhoneNumberId = String(value?.metadata?.phone_number_id || "").trim();

      for (const message of toArray(value?.messages)) {
        const outcome = await handleInboundMessage({ metadataPhoneNumberId, message });
        if (outcome) outcomes.push(outcome);
      }

      for (const status of toArray(value?.statuses)) {
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
