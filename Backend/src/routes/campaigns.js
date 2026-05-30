const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
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
router.get("/:id/email-report/activity", authenticate, getCampaignEmailReportActivityHandler);
router.get("/:id/email-report", authenticate, getCampaignEmailReportHandler);
router.get("/:id/whatsapp-conversations", authenticate, getCampaignWhatsAppConversationsHandler);
router.get(
  "/:id/whatsapp-conversations/:candidateKey/messages",
  authenticate,
  getCampaignWhatsAppThreadMessagesHandler
);
router.post(
  "/:id/whatsapp-conversations/:candidateKey/messages",
  authenticate,
  sendCampaignWhatsAppSessionMessageHandler
);
router.post(
  "/:id/whatsapp-conversations/:candidateKey/read",
  authenticate,
  markCampaignWhatsAppThreadReadHandler
);
router.post("/:id/sync-replies", authenticate, syncCampaignRepliesHandler);
router.get("/:id/replies", authenticate, listCampaignRepliesHandler);
router.get(
  "/:id/contacts/:candidateKey/email-thread",
  authenticate,
  getContactEmailThreadHandler
);
router.get("/:id", authenticate, getCampaignHandler);
router.get("/:id/contacts", authenticate, listCampaignContactsHandler);
router.post("/:id/contacts", authenticate, addContactsHandler);
router.delete("/:id/contacts/:candidateKey", authenticate, removeCampaignContactHandler);
router.post("/:id/contacts/sync-revealed", authenticate, syncCampaignContactsHandler);
router.patch("/:id/outreach-plan", authenticate, setCampaignOutreachPlanHandler);
router.patch("/:id/job-description", authenticate, updateCampaignJobDescriptionHandler);
router.patch(
  "/:id/calendly-automation",
  authenticate,
  updateCampaignCalendlyAutomationHandler
);
router.delete("/:id", authenticate, deleteCampaignHandler);

module.exports = router;
