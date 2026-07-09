const express = require("express");
const userRoutes = require("./users");
const candidateRoutes = require("./candidates");
const pricingRoutes = require("./pricing");
const integrationRoutes = require("./integrations");
const outreachRoutes = require("./outreach");
const outreachModuleCampaignRoutes = require("./outreachModuleCampaigns");
const campaignRoutes = require("./campaigns");
const platformSettingsRoutes = require("./platformSettings");
const billingRoutes = require("./billing");
const publicCandidatesRoutes = require("./publicCandidates");
const blogRoutes = require("./blog");
const screeningRoutes = require("./screenings");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

router.use("/users", userRoutes);
router.use("/candidates", candidateRoutes);
router.use("/pricing-plans", pricingRoutes);
router.use("/integrations", integrationRoutes);
router.use("/outreach", outreachRoutes);
router.use("/outreach-campaigns", outreachModuleCampaignRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/platform-settings", platformSettingsRoutes);
router.use("/billing", billingRoutes);
router.use("/public-candidates", publicCandidatesRoutes);
router.use("/blog", blogRoutes);
router.use("/screenings", screeningRoutes);

module.exports = router;
