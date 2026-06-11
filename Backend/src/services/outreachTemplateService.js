const mongoose = require("mongoose");
const OutreachTemplate = require("../models/OutreachTemplate");
const STARTER_TEMPLATES = require("../data/starterOutreachTemplates");

function normalizeTouchpoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tp, index) => {
      const subject = typeof tp?.subject === "string" ? tp.subject.trim() : "";
      if (!subject) return null;
      const order = Number(tp?.order);
      return {
        order: Number.isFinite(order) && order > 0 ? order : index + 1,
        label: typeof tp?.label === "string" ? tp.label.trim() : "",
        subject,
        body: typeof tp?.body === "string" ? tp.body : "",
        waitDays: Math.max(0, Number(tp?.waitDays) || 0),
        waitHours: Math.max(0, Number(tp?.waitHours) || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((tp, index) => ({ ...tp, order: index + 1 }));
}

function creatorLabel(createdBy) {
  if (!createdBy) return "Huntlo";
  if (typeof createdBy === "object") {
    return createdBy.fullName?.trim() || createdBy.email?.split("@")[0] || "User";
  }
  return null;
}

function formatTemplate(doc) {
  const touchpoints = Array.isArray(doc.touchpoints) ? doc.touchpoints : [];
  const totalWait = touchpoints.reduce((sum, tp) => sum + (tp.waitDays || 0), 0);
  return {
    id: String(doc._id),
    name: doc.name || "",
    description:
      doc.description?.trim() ||
      `${touchpoints.length} touchpoint${touchpoints.length === 1 ? "" : "s"} · ${totalWait} days in outreach`,
    planName: doc.planName?.trim() || doc.name || "",
    touchpoints: touchpoints.map((tp) => ({
      order: tp.order,
      label: tp.label || "",
      subject: tp.subject || "",
      body: tp.body || "",
      waitDays: tp.waitDays ?? 0,
      waitHours: tp.waitHours ?? 0,
    })),
    touchpointCount: touchpoints.length,
    isGlobal: Boolean(doc.isGlobal),
    starterKey: doc.starterKey || null,
    createdBy: doc.createdBy ? String(doc.createdBy._id || doc.createdBy) : null,
    createdByName: creatorLabel(doc.createdBy),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function seedGlobalTemplates() {
  for (const starter of STARTER_TEMPLATES) {
    const touchpoints = normalizeTouchpoints(starter.touchpoints);
    await OutreachTemplate.findOneAndUpdate(
      { starterKey: starter.starterKey },
      {
        $set: {
          name: starter.name,
          description: starter.description || "",
          planName: starter.planName || starter.name,
          touchpoints,
          isGlobal: true,
          createdBy: null,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  }
}

async function listOutreachTemplates(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const docs = await OutreachTemplate.find({
    $or: [{ isGlobal: true }, { createdBy: userOid }],
  })
    .sort({ isGlobal: -1, name: 1 })
    .populate("createdBy", "fullName email")
    .lean();
  return docs.map(formatTemplate);
}

async function getOutreachTemplate(userId, templateId) {
  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    const err = new Error("Invalid template id");
    err.statusCode = 400;
    throw err;
  }
  const userOid = new mongoose.Types.ObjectId(userId);
  const doc = await OutreachTemplate.findOne({
    _id: new mongoose.Types.ObjectId(templateId),
    $or: [{ isGlobal: true }, { createdBy: userOid }],
  })
    .populate("createdBy", "fullName email")
    .lean();
  if (!doc) {
    const err = new Error("Template not found");
    err.statusCode = 404;
    throw err;
  }
  return formatTemplate(doc);
}

async function createOutreachTemplate(userId, { name, description, planName, touchpoints }) {
  const templateName = String(name || "").trim();
  if (!templateName) {
    const err = new Error("Template name is required");
    err.statusCode = 400;
    throw err;
  }
  const tps = normalizeTouchpoints(touchpoints);
  if (tps.length === 0) {
    const err = new Error("Add at least one touchpoint with a subject");
    err.statusCode = 400;
    throw err;
  }

  const doc = await OutreachTemplate.create({
    name: templateName,
    description: String(description || "").trim(),
    planName: String(planName || "").trim() || templateName,
    touchpoints: tps,
    isGlobal: false,
    createdBy: new mongoose.Types.ObjectId(userId),
  });
  const populated = await OutreachTemplate.findById(doc._id)
    .populate("createdBy", "fullName email")
    .lean();
  return formatTemplate(populated);
}

module.exports = {
  seedGlobalTemplates,
  listOutreachTemplates,
  getOutreachTemplate,
  createOutreachTemplate,
};
