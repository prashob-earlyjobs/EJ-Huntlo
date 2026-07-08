const mongoose = require("mongoose");
const {
  getOutreachModuleDashboardStats,
  listOutreachModuleCampaigns,
  getOutreachModuleCampaign,
  createOutreachModuleDraft,
  saveOutreachModuleCampaignStep,
  getOutreachModuleCampaignBuilder,
  createOutreachModuleCampaign,
  updateOutreachModuleCampaign,
  deleteOutreachModuleCampaign,
  launchOutreachModuleCampaign,
  pauseOutreachModuleCampaign,
  resumeOutreachModuleCampaign,
  getOutreachModuleCampaignTracking,
  recordOutreachModuleCandidateAction,
  getOutreachModuleCandidateInteractions,
} = require("../services/outreachModuleCampaignService");
const { listOutreachModuleCandidatePool, importOutreachModuleCandidatesFromCsv } = require("../services/outreachModuleCandidatePoolService");

function invalidSession(res) {
  return res.status(401).json({ success: false, message: "Authentication required" });
}

function handleError(res, error) {
  const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
  const body = {
    success: false,
    message: error.message || "Request failed",
  };
  if (error.code) body.code = error.code;
  return res.status(status).json(body);
}

const getDashboardStatsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getOutreachModuleDashboardStats(uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const listCandidatePoolHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await listOutreachModuleCandidatePool(uid, {
      search: req.query?.search,
      location: req.query?.location,
      experience: req.query?.experience,
      source: req.query?.source,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const importCandidateCsvHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    const result = await importOutreachModuleCandidatesFromCsv(uid, contacts);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const listCampaignsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await listOutreachModuleCampaigns(uid, {
      page: req.query?.page,
      limit: req.query?.limit,
      status: req.query?.status,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getOutreachModuleCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const createCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await createOutreachModuleCampaign(uid, req.body || {});
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const createDraftHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await createOutreachModuleDraft(uid, req.body || {});
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const saveCampaignStepHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await saveOutreachModuleCampaignStep(
      uid,
      req.params.id,
      req.params.stepKey,
      req.body || {}
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignBuilderHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getOutreachModuleCampaignBuilder(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await updateOutreachModuleCampaign(uid, req.params.id, req.body || {});
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await deleteOutreachModuleCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const launchCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await launchOutreachModuleCampaign(uid, req.params.id, req.body || {});
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const pauseCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await pauseOutreachModuleCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const resumeCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await resumeOutreachModuleCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getTrackingHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getOutreachModuleCampaignTracking(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCandidateInteractionsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getOutreachModuleCandidateInteractions(
      uid,
      req.params.id,
      req.params.candidateId
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const recordCandidateActionHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await recordOutreachModuleCandidateAction(
      uid,
      req.params.id,
      req.params.candidateId,
      req.body || {}
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getDashboardStatsHandler,
  listCandidatePoolHandler,
  importCandidateCsvHandler,
  listCampaignsHandler,
  getCampaignHandler,
  createCampaignHandler,
  createDraftHandler,
  saveCampaignStepHandler,
  getCampaignBuilderHandler,
  updateCampaignHandler,
  deleteCampaignHandler,
  launchCampaignHandler,
  pauseCampaignHandler,
  resumeCampaignHandler,
  getTrackingHandler,
  getCandidateInteractionsHandler,
  recordCandidateActionHandler,
};
