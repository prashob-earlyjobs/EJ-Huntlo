const { getActiveMessagingChannel } = require("./platformSettingsService");
const {
  findEnrollmentForInbound,
  storeInboundWhatsAppMessage,
  updateOutboundDeliveryStatus,
} = require("./whatsappInboundService");
const { mapGupshupDeliveryToInternal } = require("../utils/gupshupDeliveryStatus");

function parseTimestampMs(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return new Date();
  return new Date(raw < 1e12 ? raw * 1000 : raw);
}

function isEarlyJobsIncomingPayload(body) {
  if (!body || typeof body !== "object") return false;
  if (body.type === "message" || body.type === "message-event") return false;
  return (
    typeof body.mobile === "string" &&
    body.mobile.trim() !== "" &&
    typeof body.waNumber === "string" &&
    typeof body.type === "string" &&
    body.timestamp !== undefined &&
    body.timestamp !== null
  );
}

function validateEarlyJobsIncoming(body) {
  const type = String(body.type || "").toLowerCase();
  const isTextValid =
    type === "button"
      ? body.text === undefined || typeof body.text === "string"
      : typeof body.text === "string" && String(body.text).length > 0;

  return (
    typeof body.waNumber === "string" &&
    typeof body.mobile === "string" &&
    body.mobile.trim() !== "" &&
    typeof body.name === "string" &&
    isTextValid &&
    typeof body.type === "string" &&
    ["text", "image", "document", "audio", "video", "button"].includes(type) &&
    body.timestamp !== undefined
  );
}

function extractEarlyJobsInboundText(body) {
  const type = String(body.type || "").toLowerCase();
  if (type === "text") {
    return String(body.text || "").trim();
  }
  if (type === "button") {
    let buttonPayload = {};
    try {
      buttonPayload = body.button ? JSON.parse(body.button) : {};
    } catch {
      buttonPayload = { raw: body.button };
    }
    return String(body.text || buttonPayload.text || buttonPayload.title || "Button reply").trim();
  }
  if (["image", "document", "audio", "video"].includes(type)) {
    const caption = String(body.text || "").trim();
    return caption || `[${type} message]`;
  }
  return String(body.text || "").trim();
}

/**
 * EarlyJobs Portal: POST /webhooks/incoming
 * Body: { waNumber, mobile, name, text, type, timestamp, messageId? }
 */
async function handleEarlyJobsIncoming(body) {
  if (!validateEarlyJobsIncoming(body)) {
    return { kind: "inbound", action: "skipped", reason: "invalid_earlyjobs_payload" };
  }

  const from = String(body.mobile || "").trim();
  const sentAt = parseTimestampMs(body.timestamp);
  const text = extractEarlyJobsInboundText(body);
  const externalMessageId =
    String(body.messageId || body.replyId || "").trim() ||
    `gs_${String(body.waNumber || "wa")}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const enrollment = await findEnrollmentForInbound("gupshup", "", from);
  if (!enrollment) {
    return { kind: "inbound", action: "skipped", reason: "no_enrollment", from };
  }

  const result = await storeInboundWhatsAppMessage({
    enrollment,
    provider: "gupshup",
    externalMessageId,
    body: text,
    fromNumber: from,
    sentAt,
  });

  return { kind: "inbound", format: "earlyjobs", ...result };
}

function getGupshupWaApiInboundBody(innerPayload) {
  if (!innerPayload || typeof innerPayload !== "object") return "";
  const type = String(innerPayload.type || "").trim().toLowerCase();
  const payload = innerPayload.payload;
  if (type === "text" && payload && typeof payload.text === "string") {
    return payload.text;
  }
  if (type === "button_reply" && payload && typeof payload.title === "string") {
    return payload.title;
  }
  if (type === "list_reply" && payload && typeof payload.title === "string") {
    return payload.title;
  }
  if (payload && typeof payload.caption === "string") return payload.caption;
  return "";
}

async function handleGupshupWaApiInboundMessage(body) {
  const inner = body?.payload;
  const from = String(inner?.source || inner?.sender?.phone || "").trim();
  const externalMessageId = String(inner?.id || "").trim();
  const text = getGupshupWaApiInboundBody(inner);
  const sentAt = parseTimestampMs(body?.timestamp);

  if (!from || !externalMessageId) {
    return { kind: "inbound", action: "skipped", reason: "missing_fields" };
  }

  const enrollment = await findEnrollmentForInbound("gupshup", "", from);
  if (!enrollment) {
    return { kind: "inbound", action: "skipped", reason: "no_enrollment", from };
  }

  const result = await storeInboundWhatsAppMessage({
    enrollment,
    provider: "gupshup",
    externalMessageId,
    body: text,
    fromNumber: from,
    sentAt,
  });

  return { kind: "inbound", format: "gupshup_wa_api", ...result };
}

async function handleGupshupWaApiMessageEvent(body) {
  const event = body?.payload;
  const eventType = String(event?.type || "").trim().toLowerCase();
  const externalMessageId = String(event?.id || "").trim();
  const gsId = String(event?.gsId || "").trim();
  const ts = event?.payload?.ts ?? body?.timestamp;
  const sentAt = parseTimestampMs(ts);

  if (!externalMessageId && !gsId) {
    return { kind: "status", action: "skipped", reason: "missing_id" };
  }

  let errorMessage = "";
  if (eventType === "failed") {
    errorMessage = String(event?.payload?.reason || event?.payload?.code || "Delivery failed").trim();
  }

  const outcome = await updateOutboundDeliveryStatus({
    provider: "gupshup",
    externalMessageId,
    gsId,
    status: eventType,
    errorMessage,
    sentAt,
  });

  return { kind: "status", format: "gupshup_wa_api", ...outcome };
}

function collectDeliveryReportsFromRequest(req) {
  const reports = [];

  if (req.method === "GET") {
    const { externalId } = req.query;
    if (externalId) {
      reports.push({
        externalId: String(externalId),
        deliveredTS: req.query.deliveredTS
          ? parseInt(String(req.query.deliveredTS), 10)
          : null,
        status: req.query.status,
        cause: req.query.cause,
        phoneNo: req.query.phoneNo,
        errCode: req.query.errCode,
        noOfFrags: req.query.noOfFrags,
        mask: req.query.mask,
      });
    }
    return reports;
  }

  const body = req.body;
  if (Array.isArray(body)) {
    return body;
  }
  if (body?.response && Array.isArray(body.response)) {
    return body.response;
  }
  if (body?.response && typeof body.response === "string") {
    try {
      const parsed = JSON.parse(body.response);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  if (body && typeof body === "object" && (body.externalId || body.eventType)) {
    return [body];
  }
  return reports;
}

async function processOneDeliveryReport(report) {
  const externalId = String(report.externalId || "").trim();
  if (!externalId) {
    return { action: "skipped", reason: "missing_externalId" };
  }

  const mappedStatus = mapGupshupDeliveryToInternal(
    report.eventType || report.status,
    report.cause,
    report.errCode || report.errorCode
  );

  const errorMessage =
    mappedStatus === "failed"
      ? String(report.cause || report.errCode || report.errorCode || "Delivery failed").trim()
      : "";

  const sentAt = parseTimestampMs(
    report.eventTs || report.deliveredTS || Date.now()
  );

  const outcome = await updateOutboundDeliveryStatus({
    provider: "gupshup",
    externalMessageId: externalId,
    gsId: "",
    status: mappedStatus,
    errorMessage,
    sentAt,
  });

  return {
    externalId,
    mappedStatus,
    ...outcome,
  };
}

/**
 * EarlyJobs Portal: GET/POST /webhooks/delivery-report
 */
async function processEarlyJobsDeliveryReport(req) {
  const channel = await getActiveMessagingChannel();
  if (channel !== "gupshup") {
    return { processed: 0, outcomes: [], skipped: "platform_uses_meta" };
  }

  const reports = collectDeliveryReportsFromRequest(req);
  if (reports.length === 0) {
    return { processed: 0, outcomes: [], message: "no_reports" };
  }

  const outcomes = [];
  for (const report of reports) {
    try {
      outcomes.push(await processOneDeliveryReport(report));
    } catch (err) {
      outcomes.push({
        action: "error",
        reason: err?.message || "process_failed",
        externalId: report.externalId,
      });
    }
  }

  const updated = outcomes.filter((o) => o.action === "updated").length;
  return {
    processed: outcomes.length,
    updated,
    failed: outcomes.length - updated,
    outcomes,
  };
}

/**
 * EarlyJobs Portal: POST /webhooks/status — { messageId, status }
 */
async function processEarlyJobsStatusUpdate(body) {
  const channel = await getActiveMessagingChannel();
  if (channel !== "gupshup") {
    return { processed: 0, skipped: "platform_uses_meta" };
  }

  const messageId = String(body?.messageId || "").trim();
  const status = String(body?.status || "").trim().toLowerCase();
  if (!messageId || !status) {
    return { action: "skipped", reason: "missing_messageId_or_status" };
  }

  const valid = ["sent", "delivered", "read", "failed"];
  if (!valid.includes(status)) {
    return { action: "skipped", reason: "unknown_status", status };
  }

  const outcome = await updateOutboundDeliveryStatus({
    provider: "gupshup",
    externalMessageId: messageId,
    gsId: "",
    status,
    errorMessage: status === "failed" ? String(body?.reason || "").trim() : "",
    sentAt: new Date(),
  });

  return { kind: "status", format: "earlyjobs_simple", ...outcome };
}

async function processGupshupWebhookPayload(rawBody) {
  const channel = await getActiveMessagingChannel();
  if (channel !== "gupshup") {
    return { processed: 0, outcomes: [], skipped: "platform_uses_meta" };
  }

  if (isEarlyJobsIncomingPayload(rawBody)) {
    const outcome = await handleEarlyJobsIncoming(rawBody);
    return { processed: 1, outcomes: [outcome] };
  }

  const events = Array.isArray(rawBody) ? rawBody : [rawBody];
  const outcomes = [];

  for (const body of events) {
    if (!body || typeof body !== "object") continue;

    if (isEarlyJobsIncomingPayload(body)) {
      outcomes.push(await handleEarlyJobsIncoming(body));
      continue;
    }

    const type = String(body.type || "").trim().toLowerCase();
    if (type === "message") {
      outcomes.push(await handleGupshupWaApiInboundMessage(body));
      continue;
    }
    if (type === "message-event") {
      outcomes.push(await handleGupshupWaApiMessageEvent(body));
    }
  }

  return { processed: outcomes.length, outcomes };
}

module.exports = {
  processGupshupWebhookPayload,
  processEarlyJobsIncoming: handleEarlyJobsIncoming,
  processEarlyJobsDeliveryReport,
  processEarlyJobsStatusUpdate,
  isEarlyJobsIncomingPayload,
};
