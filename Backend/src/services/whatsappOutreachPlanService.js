const mongoose = require("mongoose");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");

const MESSAGE_MAX_LENGTH = 4096;

function normalizeCalendlyAutomation(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const enabled = Boolean(o?.enabled);
  if (!enabled) {
    return {
      enabled: false,
      meetingUri: "",
      meetingName: "",
      schedulingUrl: "",
      durationMinutes: 0,
      kind: "",
    };
  }
  return {
    enabled: true,
    meetingUri: String(o?.meetingUri || "").trim(),
    meetingName: String(o?.meetingName || "").trim(),
    schedulingUrl: String(o?.schedulingUrl || "").trim(),
    durationMinutes: Math.max(0, Number(o?.durationMinutes) || 0),
    kind: String(o?.kind || "").trim(),
  };
}

function normalizeTouchpoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tp, index) => {
      const order = Number(tp?.order);
      const label = typeof tp?.label === "string" ? tp.label.trim() : "";
      const body = typeof tp?.body === "string" ? tp.body : "";
      const waitHours = Math.max(0, Number(tp?.waitHours) || 0);
      const templateId = typeof tp?.templateId === "string" ? tp.templateId.trim() : "";
      const isNoReplyFallback = Boolean(tp?.isNoReplyFallback);
      const isReplyFollowUp = Boolean(tp?.isReplyFollowUp);
      const trimmedBody = body.trim();
      if (!trimmedBody) return null;
      if (trimmedBody.length > MESSAGE_MAX_LENGTH) {
        const err = new Error(
          `Message ${Number.isFinite(order) && order > 0 ? order : index + 1} exceeds ${MESSAGE_MAX_LENGTH} characters`
        );
        err.statusCode = 400;
        throw err;
      }
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        label,
        body: trimmedBody,
        waitHours,
        templateId,
        isNoReplyFallback,
        isReplyFollowUp,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((tp, index) => ({ ...tp, order: index + 1 }));
}

function validateTouchpoints(touchpoints) {
  if (touchpoints.length === 0) {
    const err = new Error("Add at least one message step");
    err.statusCode = 400;
    throw err;
  }
  const opening = touchpoints.find((tp) => tp.order === 1);
  if (!opening?.body) {
    const err = new Error("Opening message is required");
    err.statusCode = 400;
    throw err;
  }
  if (!opening.templateId) {
    const err = new Error("Opening message template is required");
    err.statusCode = 400;
    throw err;
  }
  const fb1 = touchpoints.find((tp) => tp.order === 2);
  const fb2 = touchpoints.find((tp) => tp.order === 3);
  if (!fb1?.templateId || !fb1.body) {
    const err = new Error("No-reply follow-up 1 template is required");
    err.statusCode = 400;
    throw err;
  }
  if (!fb2?.templateId || !fb2.body) {
    const err = new Error("No-reply follow-up 2 template is required");
    err.statusCode = 400;
    throw err;
  }
  const replyFollowUps = touchpoints.filter((tp) => tp.isReplyFollowUp);
  if (replyFollowUps.length < 4) {
    const err = new Error("Add 4 reply-based questions after the opening message");
    err.statusCode = 400;
    throw err;
  }
}

function formatPlan(doc) {
  const touchpoints = Array.isArray(doc.touchpoints) ? doc.touchpoints : [];
  const calendlyAutomation = normalizeCalendlyAutomation(doc.calendlyAutomation);
  return {
    id: String(doc._id),
    channel: "whatsapp",
    name: doc.name || "",
    jobDescription: String(doc.jobDescription || "").trim(),
    calendlyAutomation,
    touchpoints: touchpoints.map((tp) => ({
      id: tp._id ? String(tp._id) : "",
      order: tp.order,
      label: tp.label || "",
      body: tp.body || "",
      waitHours: tp.waitHours ?? 0,
      templateId: tp.templateId || undefined,
      isNoReplyFallback: Boolean(tp.isNoReplyFallback),
      isReplyFollowUp: Boolean(tp.isReplyFollowUp),
    })),
    touchpointCount: touchpoints.length,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listWhatsAppOutreachPlans(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const docs = await WhatsAppOutreachPlan.find({ userId: userOid })
    .sort({ updatedAt: -1 })
    .lean();
  return docs.map(formatPlan);
}

async function getWhatsAppOutreachPlan(userId, planId) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    const err = new Error("Invalid WhatsApp outreach plan id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await WhatsAppOutreachPlan.findOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid,
  }).lean();
  if (!doc) {
    const err = new Error("WhatsApp outreach plan not found");
    err.statusCode = 404;
    throw err;
  }
  return formatPlan(doc);
}

async function createWhatsAppOutreachPlan(userId, { name, touchpoints, jobDescription, calendlyAutomation }) {
  const planName = String(name || "").trim();
  if (!planName) {
    const err = new Error("Plan name is required");
    err.statusCode = 400;
    throw err;
  }
  const tps = normalizeTouchpoints(touchpoints);
  validateTouchpoints(tps);

  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await WhatsAppOutreachPlan.create({
    userId: userOid,
    name: planName,
    jobDescription: String(jobDescription || "").trim(),
    touchpoints: tps,
    calendlyAutomation: normalizeCalendlyAutomation(calendlyAutomation),
  });
  return formatPlan(doc.toObject());
}

async function updateWhatsAppOutreachPlan(userId, planId, { name, touchpoints, jobDescription, calendlyAutomation }) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    const err = new Error("Invalid WhatsApp outreach plan id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await WhatsAppOutreachPlan.findOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid,
  });
  if (!doc) {
    const err = new Error("WhatsApp outreach plan not found");
    err.statusCode = 404;
    throw err;
  }

  if (name !== undefined) {
    const planName = String(name || "").trim();
    if (!planName) {
      const err = new Error("Plan name is required");
      err.statusCode = 400;
      throw err;
    }
    doc.name = planName;
  }

  if (touchpoints !== undefined) {
    const tps = normalizeTouchpoints(touchpoints);
    validateTouchpoints(tps);
    doc.touchpoints = tps;
  }

  if (jobDescription !== undefined) {
    doc.jobDescription = String(jobDescription || "").trim();
  }

  if (calendlyAutomation !== undefined) {
    doc.calendlyAutomation = normalizeCalendlyAutomation(calendlyAutomation);
  }

  await doc.save();
  return formatPlan(doc.toObject());
}

async function deleteWhatsAppOutreachPlan(userId, planId) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    const err = new Error("Invalid WhatsApp outreach plan id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const result = await WhatsAppOutreachPlan.deleteOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid,
  });
  return { deleted: result.deletedCount > 0 };
}

module.exports = {
  listWhatsAppOutreachPlans,
  getWhatsAppOutreachPlan,
  createWhatsAppOutreachPlan,
  updateWhatsAppOutreachPlan,
  deleteWhatsAppOutreachPlan,
};
