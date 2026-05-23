const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listIntegrationsHandler,
  getGmailStatusHandler,
  getWhatsAppStatusHandler,
  connectGmailWithAuthCode,
  verifyWhatsAppCredentialsHandler,
  connectWhatsAppHandler,
  disconnectGmailHandler,
  disconnectWhatsAppHandler,
  disconnectIntegrationHandler,
} = require("../controllers/integrationController");

const router = express.Router();

router.get("/", authenticate, listIntegrationsHandler);
router.get("/gmail/status", authenticate, getGmailStatusHandler);
router.get("/whatsapp/status", authenticate, getWhatsAppStatusHandler);
router.post("/gmail/callback", authenticate, connectGmailWithAuthCode);
router.post("/whatsapp/verify", authenticate, verifyWhatsAppCredentialsHandler);
router.post("/whatsapp/connect", authenticate, connectWhatsAppHandler);
router.delete("/gmail", authenticate, disconnectGmailHandler);
router.delete("/whatsapp", authenticate, disconnectWhatsAppHandler);
router.delete("/:provider", authenticate, disconnectIntegrationHandler);

module.exports = router;
