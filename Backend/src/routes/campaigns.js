const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
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
  syncCampaignRepliesHandler,
  listCampaignRepliesHandler,
  getContactEmailThreadHandler,
  deleteCampaignHandler,
} = require("../controllers/campaignController");

const router = express.Router();

router.get("/", authenticate, listCampaignsHandler);
router.post("/", authenticate, createCampaignHandler);
router.get("/reveal-jobs/:jobId", authenticate, getCampaignRevealJobHandler);
router.get("/:id/reveal-job/active", authenticate, getActiveCampaignRevealJobHandler);
router.post("/:id/reveal-contacts", authenticate, startCampaignRevealJobHandler);
router.post("/:id/launch-sequence", authenticate, launchCampaignSequenceHandler);
router.post("/:id/pause-sequence", authenticate, pauseCampaignSequenceHandler);
router.post("/:id/resume-sequence", authenticate, resumeCampaignSequenceHandler);
router.get("/:id/sequence-status", authenticate, getCampaignSequenceStatusHandler);
router.post("/:id/sync-replies", authenticate, syncCampaignRepliesHandler);
router.get("/:id/replies", authenticate, listCampaignRepliesHandler);
router.get(
  "/:id/contacts/:candidateKey/email-thread",
  authenticate,
  getContactEmailThreadHandler
);
router.get("/:id", authenticate, getCampaignHandler);
router.post("/:id/contacts", authenticate, addContactsHandler);
router.post("/:id/contacts/sync-revealed", authenticate, syncCampaignContactsHandler);
router.patch("/:id/outreach-plan", authenticate, setCampaignOutreachPlanHandler);
router.delete("/:id", authenticate, deleteCampaignHandler);

module.exports = router;
