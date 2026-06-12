const mongoose = require("mongoose");
const { sendCampaignEmail } = require("../services/emailSendService");
const {
  listOutreachPlans,
  getOutreachPlan,
  createOutreachPlan,
  updateOutreachPlan,
  deleteOutreachPlan,
} = require("../services/outreachPlanService");
const { listSavedOutreachPlans } = require("../services/savedOutreachPlanService");

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

const listPlansHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plans = await listOutreachPlans(uid);
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    return handleError(res, error);
  }
};

const listSavedOutreachPlansHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await listSavedOutreachPlans(uid, {
      page: req.query?.page,
      limit: req.query?.limit,
      channel: req.query?.channel,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plan = await getOutreachPlan(uid, req.params.id);
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plan = await createOutreachPlan(uid, {
      name: req.body?.name,
      touchpoints: req.body?.touchpoints,
      calendlyAutomation: req.body?.calendlyAutomation,
      startSchedule: req.body?.startSchedule,
    });
    return res.status(201).json({ success: true, plan, message: "Outreach plan created" });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const plan = await updateOutreachPlan(uid, req.params.id, {
      name: req.body?.name,
      touchpoints: req.body?.touchpoints,
      calendlyAutomation: req.body?.calendlyAutomation,
      startSchedule: req.body?.startSchedule,
    });
    return res.status(200).json({ success: true, plan, message: "Outreach plan updated" });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await deleteOutreachPlan(uid, req.params.id);
    return res.status(200).json({ success: true, message: "Outreach plan deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

const sendEmailHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);

    const result = await sendCampaignEmail(uid, {
      to: req.body?.to,
      subject: req.body?.subject,
      body: req.body?.body,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent",
      send: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listPlansHandler,
  listSavedOutreachPlansHandler,
  getPlanHandler,
  createPlanHandler,
  updatePlanHandler,
  deletePlanHandler,
  sendEmailHandler,
};
