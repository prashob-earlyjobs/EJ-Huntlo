const {
  processGupshupWebhookPayload,
  processEarlyJobsIncoming,
  processEarlyJobsDeliveryReport,
  processEarlyJobsStatusUpdate,
  isEarlyJobsIncomingPayload,
} = require("../services/gupshupWhatsAppWebhookService");
const {
  logWebhookReceived,
  logWebhookResponse,
  logWebhookError,
} = require("../utils/gupshupLogger");

function respondOk(res, route, result) {
  const payload = { success: true, ...result };
  logWebhookResponse({ route, httpStatus: 200, payload });
  return res.status(200).json(payload);
}

/** POST — EarlyJobs incoming + legacy unified payload */
async function receiveGupshupIncomingHandler(req, res) {
  const route = "incoming";
  logWebhookReceived({ route, method: req.method, query: req.query, body: req.body });

  try {
    const body = req.body || {};

    const result = isEarlyJobsIncomingPayload(body)
      ? await processEarlyJobsIncoming(body)
      : (await processGupshupWebhookPayload(body)).outcomes?.[0] || {
          action: "skipped",
          reason: "unrecognized_payload",
        };

    return respondOk(res, route, { result });
  } catch (error) {
    logWebhookError({ route, error });
    logWebhookResponse({ route, httpStatus: 200, emptyBody: true });
    return res.status(200).end();
  }
}

/** GET/POST — EarlyJobs delivery reports */
async function receiveGupshupDeliveryReportHandler(req, res) {
  const route = "delivery-report";
  logWebhookReceived({ route, method: req.method, query: req.query, body: req.body });

  try {
    const result = await processEarlyJobsDeliveryReport(req);
    return respondOk(res, route, result);
  } catch (error) {
    logWebhookError({ route, error });
    const payload = { success: false, message: error?.message || "delivery_report_failed" };
    logWebhookResponse({ route, httpStatus: 200, payload });
    return res.status(200).json(payload);
  }
}

/** POST — simple status { messageId, status } */
async function receiveGupshupStatusHandler(req, res) {
  const route = "status";
  logWebhookReceived({ route, method: req.method, query: req.query, body: req.body });

  try {
    const result = await processEarlyJobsStatusUpdate(req.body || {});
    return respondOk(res, route, { result });
  } catch (error) {
    logWebhookError({ route, error });
    const payload = { success: false, message: error?.message || "status_failed" };
    logWebhookResponse({ route, httpStatus: 200, payload });
    return res.status(200).json(payload);
  }
}

/** Legacy single URL — auto-detect payload shape */
async function receiveGupshupWebhookHandler(req, res) {
  const route = "unified";
  logWebhookReceived({ route, method: req.method, query: req.query, body: req.body });

  try {
    if (req.method === "GET" && req.query?.externalId) {
      return receiveGupshupDeliveryReportHandler(req, res);
    }

    const body = req.body || {};
    if (isEarlyJobsIncomingPayload(body)) {
      return receiveGupshupIncomingHandler(req, res);
    }
    if (body.messageId && body.status && !body.type) {
      return receiveGupshupStatusHandler(req, res);
    }
    if (body.externalId || (body.response && !body.type)) {
      return receiveGupshupDeliveryReportHandler(req, res);
    }

    const result = await processGupshupWebhookPayload(body);
    logWebhookResponse({ route, httpStatus: 200, emptyBody: true });
    console.log("[gupshup] webhook unified processed", safeLogResult(result));
    return res.status(200).end();
  } catch (error) {
    logWebhookError({ route, error });
    logWebhookResponse({ route, httpStatus: 200, emptyBody: true });
    return res.status(200).end();
  }
}

function safeLogResult(result) {
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

module.exports = {
  receiveGupshupIncomingHandler,
  receiveGupshupDeliveryReportHandler,
  receiveGupshupStatusHandler,
  receiveGupshupWebhookHandler,
};
