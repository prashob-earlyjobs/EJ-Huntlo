const {
  getScheduleOverview,
  syncAllScheduleBookings,
  listScheduleCandidates,
  createScheduleCandidate,
  createScheduleCandidatesBatch,
  sendDirectSchedulingLink,
} = require("../services/scheduleService");
const { listCalendlyEventTypesForUser } = require("../services/integrationService");
const {
  getScheduleReminderSettings,
  updateScheduleReminderSettings,
} = require("../services/scheduleReminderService");

function handleError(res, error) {
  const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Request failed",
  });
}

const getScheduleOverviewHandler = async (req, res) => {
  try {
    const sync = req.query.sync !== "0";
    const overview = await getScheduleOverview(req.auth?.userId, { sync });
    return res.status(200).json({ success: true, ...overview });
  } catch (error) {
    return handleError(res, error);
  }
};

const syncScheduleHandler = async (req, res) => {
  try {
    const result = await syncAllScheduleBookings(req.auth?.userId);
    const overview = await getScheduleOverview(req.auth?.userId, { sync: false });
    return res.status(200).json({ success: true, ...result, ...overview });
  } catch (error) {
    return handleError(res, error);
  }
};

const listScheduleCandidatesHandler = async (req, res) => {
  try {
    const candidates = await listScheduleCandidates(req.auth?.userId, {
      status: req.query.status,
    });
    return res.status(200).json({ success: true, candidates });
  } catch (error) {
    return handleError(res, error);
  }
};

const createScheduleCandidateHandler = async (req, res) => {
  try {
    const body = req.body || {};
    if (Array.isArray(body.candidates)) {
      const result = await createScheduleCandidatesBatch(req.auth?.userId, body.candidates, {
        sendLinks: body.sendLinks !== false,
        channels: body.channels || {},
      });
      return res.status(201).json({ success: true, ...result });
    }
    const candidate = await createScheduleCandidate(req.auth?.userId, body);
    if (body.sendLink) {
      const sent = await sendDirectSchedulingLink(req.auth?.userId, candidate.id, {
        meetingUri: body.meetingUri,
        meetingName: body.meetingName,
        schedulingUrl: body.schedulingUrl,
        channels: body.channels || {},
      });
      return res.status(201).json({ success: true, candidate: sent.candidate, ...sent });
    }
    return res.status(201).json({ success: true, candidate });
  } catch (error) {
    return handleError(res, error);
  }
};

const sendScheduleCandidateLinkHandler = async (req, res) => {
  try {
    const result = await sendDirectSchedulingLink(req.auth?.userId, req.params.id, req.body || {});
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const listScheduleMeetingsHandler = async (req, res) => {
  try {
    const data = await listCalendlyEventTypesForUser(req.auth?.userId);
    return res.status(200).json({ success: true, meetings: data.meetings || [] });
  } catch (error) {
    return handleError(res, error);
  }
};

const getScheduleReminderSettingsHandler = async (req, res) => {
  try {
    const settings = await getScheduleReminderSettings(req.auth?.userId);
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateScheduleReminderSettingsHandler = async (req, res) => {
  try {
    const settings = await updateScheduleReminderSettings(req.auth?.userId, req.body || {});
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getScheduleOverviewHandler,
  syncScheduleHandler,
  listScheduleCandidatesHandler,
  createScheduleCandidateHandler,
  sendScheduleCandidateLinkHandler,
  listScheduleMeetingsHandler,
  getScheduleReminderSettingsHandler,
  updateScheduleReminderSettingsHandler,
};
