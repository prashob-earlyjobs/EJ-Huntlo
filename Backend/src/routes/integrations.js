const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listIntegrationsHandler,
  getGmailStatusHandler,
  getWhatsAppStatusHandler,
  getWhatsAppMetaWebhookSetupHandler,
  getCalendlyStatusHandler,
  getCalendlyMeetingLinksHandler,
  connectGmailWithAuthCode,
  verifyWhatsAppCredentialsHandler,
  connectWhatsAppHandler,
  verifyCalendlyCredentialsHandler,
  connectCalendlyHandler,
  listCalendlyEventTypesHandler,
  disconnectGmailHandler,
  disconnectWhatsAppHandler,
  disconnectCalendlyHandler,
  disconnectIntegrationHandler,
} = require("../controllers/integrationController");
const {
  verifyMetaWebhookHandler,
  receiveMetaWebhookHandler,
} = require("../controllers/metaWhatsAppWebhookController");
const {
  receiveGupshupWebhookHandler,
  receiveGupshupIncomingHandler,
  receiveGupshupDeliveryReportHandler,
  receiveGupshupStatusHandler,
} = require("../controllers/gupshupWhatsAppWebhookController");

const router = express.Router();

// Meta webhook endpoints (public)
router.get("/whatsapp/meta/webhook", verifyMetaWebhookHandler);
router.post("/whatsapp/meta/webhook", receiveMetaWebhookHandler);
router.post("/whatsapp/gupshup/webhook/incoming", receiveGupshupIncomingHandler);
router.all("/whatsapp/gupshup/webhook/delivery-report", receiveGupshupDeliveryReportHandler);
router.post("/whatsapp/gupshup/webhook/status", receiveGupshupStatusHandler);
router.post("/whatsapp/gupshup/webhook", receiveGupshupWebhookHandler);
router.get("/whatsapp/gupshup/webhook", receiveGupshupWebhookHandler);

router.get("/", authenticate, listIntegrationsHandler);
router.get("/gmail/status", authenticate, getGmailStatusHandler);
router.get("/whatsapp/status", authenticate, getWhatsAppStatusHandler);
router.get(
  "/whatsapp/meta-webhook-setup",
  authenticate,
  getWhatsAppMetaWebhookSetupHandler
);
router.get("/calendly/status", authenticate, getCalendlyStatusHandler);
router.get("/calendly/links", authenticate, getCalendlyMeetingLinksHandler);
router.post("/gmail/callback", authenticate, connectGmailWithAuthCode);
router.post("/whatsapp/verify", authenticate, verifyWhatsAppCredentialsHandler);
router.post("/whatsapp/connect", authenticate, connectWhatsAppHandler);
router.post("/calendly/verify", authenticate, verifyCalendlyCredentialsHandler);
router.post("/calendly/connect", authenticate, connectCalendlyHandler);
router.get("/calendly/event-types", authenticate, listCalendlyEventTypesHandler);
router.delete("/gmail", authenticate, disconnectGmailHandler);
router.delete("/whatsapp", authenticate, disconnectWhatsAppHandler);
router.delete("/calendly", authenticate, disconnectCalendlyHandler);
router.delete("/:provider", authenticate, disconnectIntegrationHandler);

module.exports = router;
