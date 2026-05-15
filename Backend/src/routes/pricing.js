const express = require("express");
const { getPricingPlans, updatePricingPlans } = require("../controllers/pricingController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", getPricingPlans);
router.put("/", authenticate, requireAdmin, updatePricingPlans);

module.exports = router;
