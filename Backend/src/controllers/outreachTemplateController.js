const mongoose = require("mongoose");
const {
  listOutreachTemplates,
  getOutreachTemplate,
  createOutreachTemplate,
} = require("../services/outreachTemplateService");

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

const listTemplatesHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const templates = await listOutreachTemplates(uid);
    return res.status(200).json({ success: true, templates });
  } catch (error) {
    return handleError(res, error);
  }
};

const getTemplateHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const template = await getOutreachTemplate(uid, req.params.id);
    return res.status(200).json({ success: true, template });
  } catch (error) {
    return handleError(res, error);
  }
};

const createTemplateHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const template = await createOutreachTemplate(uid, {
      name: req.body?.name,
      description: req.body?.description,
      planName: req.body?.planName,
      touchpoints: req.body?.touchpoints,
    });
    return res.status(201).json({ success: true, template, message: "Template created" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listTemplatesHandler,
  getTemplateHandler,
  createTemplateHandler,
};
