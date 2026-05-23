const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listIntegrationsHandler,
  getGmailStatusHandler,
  connectGmailWithAuthCode,
  disconnectGmailHandler,
  disconnectIntegrationHandler,
} = require("../controllers/integrationController");

const router = express.Router();

router.get("/", authenticate, listIntegrationsHandler);
router.get("/gmail/status", authenticate, getGmailStatusHandler);
router.post("/gmail/callback", authenticate, connectGmailWithAuthCode);
router.delete("/gmail", authenticate, disconnectGmailHandler);
router.delete("/:provider", authenticate, disconnectIntegrationHandler);

module.exports = router;
