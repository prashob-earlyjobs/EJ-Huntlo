const express = require("express");
const userRoutes = require("./users");
const candidateRoutes = require("./candidates");
const pricingRoutes = require("./pricing");

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

module.exports = router;
