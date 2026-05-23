const mongoose = require("mongoose");
const {
  listCampaigns,
  getCampaign,
  createCampaign,
  addContactsToCampaign,
  deleteCampaign,
} = require("../services/campaignService");

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
    const campaign = await createCampaign(uid, {
      name: req.body?.name,
      contacts: req.body?.contacts,
    });
    return res.status(201).json({
      success: true,
      campaign,
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
    const result = await addContactsToCampaign(uid, req.params.id, req.body?.contacts);
    return res.status(200).json({
      success: true,
      campaign: result.campaign,
      addedCount: result.addedCount,
      skippedCount: result.skippedCount,
      message:
        result.addedCount > 0
          ? `Added ${result.addedCount} contact${result.addedCount === 1 ? "" : "s"}`
          : "No new contacts added",
    });
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
  deleteCampaignHandler,
};
