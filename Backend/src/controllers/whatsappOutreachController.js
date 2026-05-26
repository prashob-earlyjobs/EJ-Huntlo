const mongoose = require("mongoose");
const {
  listWhatsAppOutreachPlans,
  getWhatsAppOutreachPlan,
  createWhatsAppOutreachPlan,
  updateWhatsAppOutreachPlan,
  deleteWhatsAppOutreachPlan,
} = require("../services/whatsappOutreachPlanService");

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

const listWhatsAppPlansHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plans = await listWhatsAppOutreachPlans(uid);
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    return handleError(res, error);
  }
};

const getWhatsAppPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plan = await getWhatsAppOutreachPlan(uid, req.params.id);
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    return handleError(res, error);
  }
};

const createWhatsAppPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plan = await createWhatsAppOutreachPlan(uid, {
      name: req.body?.name,
      touchpoints: req.body?.touchpoints,
    });
    return res.status(201).json({
      success: true,
      plan,
      message: "WhatsApp sequence created",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateWhatsAppPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plan = await updateWhatsAppOutreachPlan(uid, req.params.id, {
      name: req.body?.name,
      touchpoints: req.body?.touchpoints,
    });
    return res.status(200).json({
      success: true,
      plan,
      message: "WhatsApp sequence updated",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteWhatsAppPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await deleteWhatsAppOutreachPlan(uid, req.params.id);
    return res.status(200).json({ success: true, message: "WhatsApp sequence deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listWhatsAppPlansHandler,
  getWhatsAppPlanHandler,
  createWhatsAppPlanHandler,
  updateWhatsAppPlanHandler,
  deleteWhatsAppPlanHandler,
};
