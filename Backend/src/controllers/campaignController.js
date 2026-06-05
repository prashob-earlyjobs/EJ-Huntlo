const mongoose = require("mongoose");
const {
  listCampaigns,
  listCampaignContacts,
  getCampaign,
  createCampaign,
  addContactsToCampaign,
  removeContactFromCampaign,
  deleteCampaign,
  syncCampaignContactsFromUserCache,
  setCampaignOutreachPlan,
  updateCampaignJobDescription,
  updateCampaignCalendlyAutomation,
} = require("../services/campaignService");
const {
  createAndStartCampaignRevealJob,
  getActiveRevealJobForCampaign,
  startCampaignRevealJob,
  getCampaignRevealJob,
} = require("../services/campaignRevealJobService");
const {
  launchCampaignSequence,
  enrollAddedContactsIfCampaignActive,
  pauseCampaignSequence,
  resumeCampaignSequence,
  getSequenceStatus,
  getEmailCampaignReport,
  getEmailCampaignReportActivity,
} = require("../services/campaignOutreachSendService");
const {
  getCampaignWhatsAppConversations,
  getCampaignWhatsAppThreadMessages,
  sendCampaignWhatsAppSessionMessage,
  markCampaignWhatsAppThreadRead,
} = require("../services/campaignWhatsAppCommsService");
const {
  syncCampaignReplies,
  listCampaignReplies,
  listContactEmailThread,
} = require("../services/campaignReplySyncService");

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
  if (error.activeCampaign) body.activeCampaign = error.activeCampaign;
  if (error.gmailDailyLimit) body.gmailDailyLimit = error.gmailDailyLimit;
  if (error.campaignContactLimit) body.campaignContactLimit = error.campaignContactLimit;
  if (error.code === "OUTREACH_CREDITS_EXCEEDED") {
    body.outreachCredits = {
      channel: error.channel,
      limit: error.limit,
      used: error.used,
      requested: error.requested,
      remaining: error.remaining,
    };
  }
  return res.status(status).json(body);
}

const listCampaignsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const page = req.query?.page ? Number(req.query.page) : undefined;
    const limit = req.query?.limit ? Number(req.query.limit) : undefined;
    const result = await listCampaigns(uid, { page, limit });
    return res.status(200).json({ success: true, ...result });
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

const listCampaignContactsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const page = req.query?.page ? Number(req.query.page) : undefined;
    const limit = req.query?.limit ? Number(req.query.limit) : undefined;
    const search = req.query?.search ? String(req.query.search) : "";
    const disposition = req.query?.disposition ? String(req.query.disposition) : "";
    const result = await listCampaignContacts(uid, req.params.id, {
      page,
      limit,
      search,
      disposition,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const createCampaignHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    const revealInBackground = req.body?.revealInBackground === true;
    const { campaign, limitSkippedCount } = await createCampaign(uid, {
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
      limitSkippedCount: limitSkippedCount || 0,
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
    const revealInBackground = req.body?.revealInBackground === true;
    const result = await addContactsToCampaign(uid, req.params.id, contacts);
    let sequenceEnroll = null;
    let sequenceEnrollError = null;
    if (result.addedCount > 0 && Array.isArray(result.addedCandidateKeys)) {
      try {
        sequenceEnroll = await enrollAddedContactsIfCampaignActive(
          uid,
          req.params.id,
          result.addedCandidateKeys
        );
      } catch (enrollErr) {
        sequenceEnrollError =
          enrollErr instanceof Error
            ? enrollErr.message
            : "Could not auto-enroll added contacts into active sequence";
      }
    }

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
      limitSkippedCount: result.limitSkippedCount || 0,
      sequenceEnroll,
      sequenceEnrollError,
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

const removeCampaignContactHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await removeContactFromCampaign(uid, req.params.id, req.params.candidateKey);
    return res.status(200).json({
      success: true,
      campaign: result.campaign,
      removed: result.removed,
      message: result.removed > 0 ? "Contact removed" : "Contact not found in campaign",
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
    const outreachChannel =
      req.body?.outreachChannel === "whatsapp" ? "whatsapp" : "gmail";
    const campaign = await setCampaignOutreachPlan(
      uid,
      req.params.id,
      outreachPlanId,
      outreachChannel
    );
    return res.status(200).json({ success: true, campaign, message: "Campaign sequence updated" });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCampaignJobDescriptionHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const campaign = await updateCampaignJobDescription(
      uid,
      req.params.id,
      req.body?.jobDescription
    );
    return res.status(200).json({
      success: true,
      campaign,
      message: "Job description saved",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCampaignCalendlyAutomationHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const campaign = await updateCampaignCalendlyAutomation(
      uid,
      req.params.id,
      req.body?.calendlyAutomation
    );
    return res.status(200).json({
      success: true,
      campaign,
      message: "Interview link saved",
    });
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
      revealJob: result.revealJob || null,
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

const getCampaignEmailReportHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const report = await getEmailCampaignReport(uid, req.params.id);
    return res.status(200).json({ success: true, report });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignEmailReportActivityHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const data = await getEmailCampaignReportActivity(uid, req.params.id, {
      page: req.query?.page,
      limit: req.query?.limit,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignWhatsAppConversationsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const data = await getCampaignWhatsAppConversations(uid, req.params.id, {
      threadPage: req.query?.threadPage,
      threadPageSize: req.query?.threadPageSize,
      messagePageSize: req.query?.messagePageSize,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCampaignWhatsAppThreadMessagesHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const data = await getCampaignWhatsAppThreadMessages(
      uid,
      req.params.id,
      req.params.candidateKey,
      {
        page: req.query?.page,
        pageSize: req.query?.pageSize,
      }
    );
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
};

const sendCampaignWhatsAppSessionMessageHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    const result = await sendCampaignWhatsAppSessionMessage(
      uid,
      req.params.id,
      req.params.candidateKey,
      body
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const markCampaignWhatsAppThreadReadHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    const result = await markCampaignWhatsAppThreadRead(
      uid,
      req.params.id,
      req.params.candidateKey
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const syncCampaignRepliesHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const result = await syncCampaignReplies(uid, req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
      message:
        result.newReplies > 0
          ? `Stored ${result.newReplies} new reply message(s)`
          : "Replies synced",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getContactEmailThreadHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const sync =
      req.query?.sync === "1" ||
      req.query?.sync === "true" ||
      String(req.query?.sync || "").toLowerCase() === "yes";
    const result = await listContactEmailThread(uid, req.params.id, req.params.candidateKey, {
      sync,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const listCampaignRepliesHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);
    await getCampaign(uid, req.params.id);
    const candidateKey = req.query?.candidateKey
      ? String(req.query.candidateKey).trim()
      : "";
    const replies = await listCampaignReplies(uid, req.params.id, { candidateKey });
    return res.status(200).json({ success: true, replies });
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
  listCampaignContactsHandler,
  createCampaignHandler,
  addContactsHandler,
  removeCampaignContactHandler,
  getCampaignRevealJobHandler,
  getActiveCampaignRevealJobHandler,
  startCampaignRevealJobHandler,
  syncCampaignContactsHandler,
  setCampaignOutreachPlanHandler,
  updateCampaignJobDescriptionHandler,
  updateCampaignCalendlyAutomationHandler,
  launchCampaignSequenceHandler,
  pauseCampaignSequenceHandler,
  resumeCampaignSequenceHandler,
  getCampaignSequenceStatusHandler,
  getCampaignEmailReportHandler,
  getCampaignEmailReportActivityHandler,
  getCampaignWhatsAppConversationsHandler,
  getCampaignWhatsAppThreadMessagesHandler,
  sendCampaignWhatsAppSessionMessageHandler,
  markCampaignWhatsAppThreadReadHandler,
  syncCampaignRepliesHandler,
  listCampaignRepliesHandler,
  getContactEmailThreadHandler,
  deleteCampaignHandler,
};
