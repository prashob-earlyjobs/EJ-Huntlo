const { Webhook } = require("standardwebhooks");
const { getDodoConfig } = require("./dodoPaymentsService");
const { fulfillPlanPaymentOrderFromDodo } = require("./planPaymentService");

function verifyAndParseWebhook(rawBody, headers) {
  const { webhookSecret } = getDodoConfig();
  if (!webhookSecret) {
    const err = new Error("Dodo webhook secret is not configured");
    err.code = "DODO_WEBHOOK_NOT_CONFIGURED";
    err.statusCode = 503;
    throw err;
  }

  const webhookId = headers["webhook-id"] || headers["Webhook-Id"];
  const signature = headers["webhook-signature"] || headers["Webhook-Signature"];
  const timestamp = headers["webhook-timestamp"] || headers["Webhook-Timestamp"];

  if (!webhookId || !signature || !timestamp) {
    const err = new Error("Missing webhook signature headers");
    err.code = "INVALID_WEBHOOK_HEADERS";
    err.statusCode = 400;
    throw err;
  }

  const wh = new Webhook(webhookSecret);
  const payloadStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "");
  wh.verify(payloadStr, {
    "webhook-id": String(webhookId),
    "webhook-signature": String(signature),
    "webhook-timestamp": String(timestamp),
  });

  return JSON.parse(payloadStr);
}

async function processDodoWebhookEvent(event) {
  const type = event?.type || "";
  if (type !== "payment.succeeded" && type !== "subscription.active") {
    return { handled: false, type };
  }

  const data = event?.data || {};
  const metadata = {
    ...(event?.metadata && typeof event.metadata === "object" ? event.metadata : {}),
    ...(data?.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    ...(data?.checkout_session?.metadata && typeof data.checkout_session.metadata === "object"
      ? data.checkout_session.metadata
      : {}),
  };

  const paymentId = data?.payment_id || data?.id || null;
  const status =
    type === "subscription.active"
      ? "active"
      : data?.status || "succeeded";

  return fulfillPlanPaymentOrderFromDodo({
    huntloOrderId: metadata.huntlo_order_id || metadata.huntloOrderId,
    dodoPaymentId: paymentId ? String(paymentId) : "",
    dodoSessionId: metadata.dodo_session_id || data?.checkout_session_id || "",
    status: String(status),
    webhookId: event?.webhook_id,
  });
}

module.exports = {
  verifyAndParseWebhook,
  processDodoWebhookEvent,
};
