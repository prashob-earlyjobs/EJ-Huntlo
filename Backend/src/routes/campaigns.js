const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listCampaignsHandler,
  getCampaignHandler,
  createCampaignHandler,
  addContactsHandler,
  deleteCampaignHandler,
} = require("../controllers/campaignController");

const router = express.Router();

router.get("/", authenticate, listCampaignsHandler);
router.post("/", authenticate, createCampaignHandler);
router.get("/:id", authenticate, getCampaignHandler);
router.post("/:id/contacts", authenticate, addContactsHandler);
router.delete("/:id", authenticate, deleteCampaignHandler);

module.exports = router;
