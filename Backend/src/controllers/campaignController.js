const mongoose = require("mongoose");
const {
  listCampaigns,
  getCampaign,
  createCampaign,
  addContactsToCampaign,
  deleteCampaign,
  syncCampaignContactsFromUserCache,
  setCampaignOutreachPlan,
} = require("../services/campaignService");
const {
  createAndStartCampaignRevealJob,
  getActiveRevealJobForCampaign,
  startCampaignRevealJob,
  getCampaignRevealJob,
} = require("../services/campaignRevealJobService");
const {
  launchCampaignSequence,
  pauseCampaignSequence,
  resumeCampaignSequence,
  getSequenceStatus,
} = require("../services/campaignOutreachSendService");

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

const listCampaignsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const campaigns = await listCampaigns(uid);
    return res.status(200).json({ success: true, campaigns });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const campaign = await getCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, campaign });
  } catch (error) {
    return handleError(res, error);
  }
};

const createCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    const revealInBackground = req.body?.revealInBackground !== false;
    const campaign = await createCampaign(uid, {
      name: req.body?.name,
      contacts,
    });

    let revealJob = null;
    let revealJobError = null;
    if (revealInBackground && contacts.length > 0) {
      const candidateKeys = contacts
        .map((c) => String(c?.candidateKey || "").trim())
        .filter(Boolean);
      if (candidateKeys.length > 0) {
        try {
          revealJob = await createAndStartCampaignRevealJob(
            uid,
            campaign.id,
            candidateKeys
          );
        } catch (revealErr) {
          revealJobError =
            revealErr instanceof Error
              ? revealErr.message
              : "Background reveal could not start";
        }
      }
    }

    return res.status(201).json({
      success: true,
      campaign,
      revealJob,
      revealJobError,
      message: "Campaign created",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const addContactsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    const revealInBackground = req.body?.revealInBackground !== false;
    const result = await addContactsToCampaign(uid, req.params.id, contacts);

    let revealJob = null;
    let revealJobError = null;
    const keysToReveal =
      result.addedCount > 0 && Array.isArray(result.addedCandidateKeys)
        ? result.addedCandidateKeys
        : [];
    if (revealInBackground && keysToReveal.length > 0) {
      try {
        revealJob = await createAndStartCampaignRevealJob(
          uid,
          req.params.id,
          keysToReveal
        );
      } catch (revealErr) {
        revealJobError =
          revealErr instanceof Error
            ? revealErr.message
            : "Background reveal could not start";
      }
    }

    return res.status(200).json({
      success: true,
      campaign: result.campaign,
      addedCount: result.addedCount,
      skippedCount: result.skippedCount,
      revealJob,
      revealJobError,
      message:
        result.addedCount > 0
          ? `Added ${result.addedCount} contact${result.addedCount === 1 ? "" : "s"}`
          : "No new contacts added",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignRevealJobHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const job = await getCampaignRevealJob(uid, req.params.jobId);
    return res.status(200).json({ success: true, job });
  } catch (error) {
    return handleError(res, error);
  }
};

const getActiveCampaignRevealJobHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const job = await getActiveRevealJobForCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, job });
  } catch (error) {
    return handleError(res, error);
  }
};

const startCampaignRevealJobHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const existing = await getActiveRevealJobForCampaign(uid, req.params.id);
    if (existing) {
      return res.status(200).json({
        success: true,
        job: existing,
        message: "Reveal already in progress",
      });
    }
    const candidateKeys = Array.isArray(req.body?.candidateKeys)
      ? req.body.candidateKeys.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const job = await startCampaignRevealJob(uid, req.params.id, candidateKeys);
    return res.status(200).json({
      success: true,
      job,
      message: "Reveal started in background",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const syncCampaignContactsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const campaign = await syncCampaignContactsFromUserCache(uid, req.params.id);
    return res.status(200).json({ success: true, campaign });
  } catch (error) {
    return handleError(res, error);
  }
};

const setCampaignOutreachPlanHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const outreachPlanId =
      req.body?.outreachPlanId === null || req.body?.outreachPlanId === ""
        ? null
        : req.body?.outreachPlanId;
    const campaign = await setCampaignOutreachPlan(uid, req.params.id, outreachPlanId);
    return res.status(200).json({ success: true, campaign, message: "Campaign sequence updated" });
  } catch (error) {
    return handleError(res, error);
  }
};

const launchCampaignSequenceHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const result = await launchCampaignSequence(uid, req.params.id);
    const campaign = await getCampaign(uid, req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
      campaign,
      message: `Sequence launched for ${result.enrolled} contact${result.enrolled === 1 ? "" : "s"}`,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const pauseCampaignSequenceHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const result = await pauseCampaignSequence(uid, req.params.id);
    const campaign = await getCampaign(uid, req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
      campaign,
      message: "Sequence paused",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const resumeCampaignSequenceHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const result = await resumeCampaignSequence(uid, req.params.id);
    const campaign = await getCampaign(uid, req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
      campaign,
      message: "Sequence resumed",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignSequenceStatusHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const status = await getSequenceStatus(uid, req.params.id);
    return res.status(200).json({ success: true, sequence: status });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await deleteCampaign(uid, req.params.id);
    return res.status(200).json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listCampaignsHandler,
  getCampaignHandler,
  createCampaignHandler,
  addContactsHandler,
  getCampaignRevealJobHandler,
  getActiveCampaignRevealJobHandler,
  startCampaignRevealJobHandler,
  syncCampaignContactsHandler,
  setCampaignOutreachPlanHandler,
  launchCampaignSequenceHandler,
  pauseCampaignSequenceHandler,
  resumeCampaignSequenceHandler,
  getCampaignSequenceStatusHandler,
  deleteCampaignHandler,
};
