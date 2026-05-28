const mongoose = require("mongoose");
const OutreachPlan = require("../models/OutreachPlan");

function normalizeTouchpoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tp, index) => {
      const order = Number(tp?.order);
      const subject = typeof tp?.subject === "string" ? tp.subject.trim() : "";
      const body = typeof tp?.body === "string" ? tp.body.trim() : "";
      const label = typeof tp?.label === "string" ? tp.label.trim() : "";
      const waitDays = Math.max(0, Number(tp?.waitDays) || 0);
      if (!subject && !body) return null;
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        label,
        subject,
        body,
        waitDays,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((tp, index) => ({ ...tp, order: index + 1 }));
}

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

function formatPlan(doc) {
  const touchpoints = Array.isArray(doc.touchpoints) ? doc.touchpoints : [];
  const calendlyAutomation = normalizeCalendlyAutomation(doc.calendlyAutomation);
  return {
    id: String(doc._id),
    name: doc.name || "",
    touchpoints: touchpoints.map((tp) => ({
      id: tp._id ? String(tp._id) : "",
      order: tp.order,
      label: tp.label || "",
      subject: tp.subject || "",
      body: tp.body || "",
      waitDays: tp.waitDays ?? 0,
    })),
    touchpointCount: touchpoints.length,
    calendlyAutomation,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listOutreachPlans(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const docs = await OutreachPlan.find({ userId: userOid }).sort({ updatedAt: -1 }).lean();
  return docs.map(formatPlan);
}

async function getOutreachPlan(userId, planId) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    const err = new Error("Invalid outreach plan id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await OutreachPlan.findOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid,
  }).lean();
  if (!doc) {
    const err = new Error("Outreach plan not found");
    err.statusCode = 404;
    throw err;
  }
  return formatPlan(doc);
}

async function createOutreachPlan(userId, { name, touchpoints, calendlyAutomation }) {
  const planName = String(name || "").trim();
  if (!planName) {
    const err = new Error("Plan name is required");
    err.statusCode = 400;
    throw err;
  }
  const tps = normalizeTouchpoints(touchpoints);
  if (tps.length === 0) {
    const err = new Error("Add at least one touchpoint with a subject and message body");
    err.statusCode = 400;
    throw err;
  }
  const missingSubjectCreate = tps.find((tp) => !String(tp.subject || "").trim());
  if (missingSubjectCreate) {
    const err = new Error(`Step ${missingSubjectCreate.order} is missing a subject line.`);
    err.statusCode = 400;
    throw err;
  }
  const missingBodyCreate = tps.find((tp) => !String(tp.body || "").trim());
  if (missingBodyCreate) {
    const err = new Error(
      `Step ${missingBodyCreate.order} is missing the message body. Add your email text before saving.`
    );
    err.statusCode = 400;
    throw err;
  }

  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await OutreachPlan.create({
    userId: userOid,
    name: planName,
    touchpoints: tps,
    calendlyAutomation: normalizeCalendlyAutomation(calendlyAutomation),
  });
  return formatPlan(doc.toObject());
}

async function updateOutreachPlan(userId, planId, { name, touchpoints, calendlyAutomation }) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    const err = new Error("Invalid outreach plan id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await OutreachPlan.findOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid,
  });
  if (!doc) {
    const err = new Error("Outreach plan not found");
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
    if (tps.length === 0) {
      const err = new Error("Add at least one touchpoint with a subject and message body");
      err.statusCode = 400;
      throw err;
    }
    const missingSubject = tps.find((tp) => !String(tp.subject || "").trim());
    if (missingSubject) {
      const err = new Error(`Step ${missingSubject.order} is missing a subject line.`);
      err.statusCode = 400;
      throw err;
    }
    const missingBody = tps.find((tp) => !String(tp.body || "").trim());
    if (missingBody) {
      const err = new Error(
        `Step ${missingBody.order} is missing the message body. Add your email text before saving.`
      );
      err.statusCode = 400;
      throw err;
    }
    doc.touchpoints = tps;
  }

  if (calendlyAutomation !== undefined) {
    doc.calendlyAutomation = normalizeCalendlyAutomation(calendlyAutomation);
  }

  await doc.save();
  return formatPlan(doc.toObject());
}

async function deleteOutreachPlan(userId, planId) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    const err = new Error("Invalid outreach plan id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const result = await OutreachPlan.deleteOne({
    _id: new mongoose.Types.ObjectId(planId),
    userId: userOid,
  });
  return { deleted: result.deletedCount > 0 };
}

module.exports = {
  listOutreachPlans,
  getOutreachPlan,
  createOutreachPlan,
  updateOutreachPlan,
  deleteOutreachPlan,
};
