const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listIntegrationsHandler,
  getGmailStatusHandler,
  getWhatsAppStatusHandler,
  getCalendlyStatusHandler,
  connectGmailWithAuthCode,
  verifyWhatsAppCredentialsHandler,
  connectWhatsAppHandler,
  verifyCalendlyCredentialsHandler,
  connectCalendlyHandler,
  disconnectGmailHandler,
  disconnectWhatsAppHandler,
  disconnectCalendlyHandler,
  disconnectIntegrationHandler,
} = require("../controllers/integrationController");

const router = express.Router();

router.get("/", authenticate, listIntegrationsHandler);
router.get("/gmail/status", authenticate, getGmailStatusHandler);
router.get("/whatsapp/status", authenticate, getWhatsAppStatusHandler);
router.get("/calendly/status", authenticate, getCalendlyStatusHandler);
router.post("/gmail/callback", authenticate, connectGmailWithAuthCode);
router.post("/whatsapp/verify", authenticate, verifyWhatsAppCredentialsHandler);
router.post("/whatsapp/connect", authenticate, connectWhatsAppHandler);
router.post("/calendly/verify", authenticate, verifyCalendlyCredentialsHandler);
router.post("/calendly/connect", authenticate, connectCalendlyHandler);
router.delete("/gmail", authenticate, disconnectGmailHandler);
router.delete("/whatsapp", authenticate, disconnectWhatsAppHandler);
router.delete("/calendly", authenticate, disconnectCalendlyHandler);
router.delete("/:provider", authenticate, disconnectIntegrationHandler);

module.exports = router;
