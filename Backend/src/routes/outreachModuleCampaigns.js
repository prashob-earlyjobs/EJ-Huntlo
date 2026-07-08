const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
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
} = require("../controllers/outreachModuleCampaignController");

const router = express.Router();

/** Dashboard outreach module — separate from /api/outreach (plans) and /api/campaigns (execution). */

router.get("/stats", authenticate, getDashboardStatsHandler);
router.get("/candidates/pool", authenticate, listCandidatePoolHandler);
router.post("/candidates/import-csv", authenticate, importCandidateCsvHandler);

router.get("/", authenticate, listCampaignsHandler);
router.post("/drafts", authenticate, createDraftHandler);
router.post("/", authenticate, createCampaignHandler);
router.get("/:id/builder", authenticate, getCampaignBuilderHandler);
router.patch("/:id/steps/:stepKey", authenticate, saveCampaignStepHandler);
router.get("/:id", authenticate, getCampaignHandler);
router.put("/:id", authenticate, updateCampaignHandler);
router.delete("/:id", authenticate, deleteCampaignHandler);

router.post("/:id/launch", authenticate, launchCampaignHandler);
router.post("/:id/pause", authenticate, pauseCampaignHandler);
router.post("/:id/resume", authenticate, resumeCampaignHandler);
router.get("/:id/tracking", authenticate, getTrackingHandler);

router.get(
  "/:id/candidates/:candidateId/interactions",
  authenticate,
  getCandidateInteractionsHandler
);
router.post(
  "/:id/candidates/:candidateId/actions",
  authenticate,
  recordCandidateActionHandler
);

module.exports = router;
