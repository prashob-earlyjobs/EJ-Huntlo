const express = require("express");
const {
  getPlatformSettingsHandler,
  updatePlatformSettingsHandler,
} = require("../controllers/platformSettingsController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, requireAdmin, getPlatformSettingsHandler);
router.put("/", authenticate, requireAdmin, updatePlatformSettingsHandler);

module.exports = router;
