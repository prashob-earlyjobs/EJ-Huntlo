const mongoose = require("mongoose");
const {
  getScreeningDashboardStats,
  listScreenings,
  getScreeningDetail,
  getScreeningCandidateDetail,
  createVoiceScreening,
  launchScreening,
  pauseScreening,
  recordScreeningCandidateAction,
  generateScreeningQuestions,
} = require("../services/screeningService");

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

const getStatsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getScreeningDashboardStats(uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const listScreeningsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await listScreenings(uid, {
      page: req.query?.page,
      limit: req.query?.limit,
      status: req.query?.status,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getScreeningHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getScreeningDetail(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCandidateHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await getScreeningCandidateDetail(
      uid,
      req.params.id,
      req.params.candidateId
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const createScreeningHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await createVoiceScreening(uid, req.body || {});
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const launchScreeningHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await launchScreening(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const pauseScreeningHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await pauseScreening(uid, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const recordCandidateActionHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await recordScreeningCandidateAction(
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

const generateQuestionsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await generateScreeningQuestions(uid, req.body || {});
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getStatsHandler,
  listScreeningsHandler,
  getScreeningHandler,
  getCandidateHandler,
  createScreeningHandler,
  launchScreeningHandler,
  pauseScreeningHandler,
  recordCandidateActionHandler,
  generateQuestionsHandler,
};
