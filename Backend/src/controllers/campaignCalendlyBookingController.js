const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  listCampaignScheduledInterviews,
  syncCampaignCalendlyBookings,
  sendCandidateSchedulingLink,
  processCalendlyWebhookEvent,
} = require("../services/campaignCalendlyBookingService");

function invalidSession(res) {
  return res.status(401).json({ success: false, message: "Authentication required" });
}

function handleError(res, error) {
  const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Request failed",
  });
}

function verifyCalendlySignature(rawBody, signatureHeader, signingKey) {
  const key = String(signingKey || "").trim();
  const header = String(signatureHeader || "").trim();
  if (!key || !header || !rawBody) return true;

  const parts = header.split(",").reduce((acc, piece) => {
    const [k, v] = piece.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${rawBody}`;
  const digest = crypto.createHmac("sha256", key).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return digest === signature;
  }
}

const listScheduledInterviewsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await listCampaignScheduledInterviews(uid, req.params.id, {
      sync: req.query?.sync !== "0",
      includeCanceled: req.query?.includeCanceled === "1",
      allowSyncFailure: req.query?.sync === "0",
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const syncScheduledInterviewsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await syncCampaignCalendlyBookings(uid, req.params.id);
    const interviews = await listCampaignScheduledInterviews(uid, req.params.id, {
      sync: false,
      includeCanceled: true,
    });
    return res.status(200).json({ success: true, ...result, ...interviews });
  } catch (error) {
    return handleError(res, error);
  }
};

const sendSchedulingLinkHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await sendCandidateSchedulingLink(uid, req.params.id, req.params.candidateId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const handleCalendlyWebhook = async (req, res) => {
  try {
    const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY || "";
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body || {});
    const signature = req.headers["calendly-webhook-signature"];

    if (signingKey && !verifyCalendlySignature(rawBody, signature, signingKey)) {
      return res.status(401).json({ success: false, message: "Invalid Calendly webhook signature" });
    }

    const body = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body || {};
    const payload = body?.payload || body;
    const result = await processCalendlyWebhookEvent(payload);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listScheduledInterviewsHandler,
  syncScheduledInterviewsHandler,
  sendSchedulingLinkHandler,
  handleCalendlyWebhook,
};
