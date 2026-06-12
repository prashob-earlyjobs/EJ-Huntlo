const mongoose = require("mongoose");
const {
  connectGmail,
  connectOutlookOAuth,
  getOutlookOAuthAuthorizePayload,
  getOutlookStatus,
  sendOutlookTest,
  connectZohoMail,
  verifyZohoMailIntegrationCredentials,
  getZohoMailOAuthAuthorizePayload,
  getZohoMailStatus,
  sendZohoMailTest,
  connectWhatsApp,
  verifyWhatsAppIntegrationCredentials,
  connectCalendly,
  verifyCalendlyCredentials,
  getGmailStatus,
  getWhatsAppStatus,
  getWhatsAppMetaWebhookSetup,
  getCalendlyStatus,
  getCalendlyMeetingLinks,
  listCalendlyEventTypesForUser,
  listUserIntegrations,
  disconnectGmail,
  disconnectOutlook,
  disconnectZohoMail,
  disconnectWhatsApp,
  disconnectCalendly,
  disconnectIntegration,
} = require("../services/integrationService");

function invalidSession(res) {
  return res.status(400).json({ success: false, message: "Invalid session" });
}

const listIntegrationsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const integrations = await listUserIntegrations(uid);
    return res.status(200).json({ success: true, integrations });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load integrations",
    });
  }
};

const getGmailStatusHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const status = await getGmailStatus(uid);
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load Gmail status",
    });
  }
};

/** POST /api/integrations/gmail/callback — auth code from @react-oauth/google */
const connectGmailWithAuthCode = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    const code = req.body?.code;

    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    if (typeof code !== "string" || !code) {
      return res.status(400).json({ success: false, message: "code is required" });
    }

    const integration = await connectGmail(uid, code);
    return res.status(200).json({
      success: true,
      integration,
      message: "Gmail connected",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to connect Gmail",
    });
  }
};

const getWhatsAppStatusHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const status = await getWhatsAppStatus(uid, req);
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load WhatsApp status",
    });
  }
};

/** GET /api/integrations/whatsapp/meta-webhook-setup — callback URL + verify token for own Meta */
const getWhatsAppMetaWebhookSetupHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const metaWebhookSetup = await getWhatsAppMetaWebhookSetup(req);
    return res.status(200).json({
      success: true,
      requiresMetaWebhookSetup: true,
      metaWebhookSetup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load WhatsApp webhook setup",
    });
  }
};

/** POST /api/integrations/whatsapp/verify — test credentials before connect */
const verifyWhatsAppCredentialsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const result = await verifyWhatsAppIntegrationCredentials(req.body || {});
    return res.status(200).json({
      success: true,
      verified: result.verified,
      mode: result.mode,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      verified: false,
      message: error.message || "Credential verification failed",
    });
  }
};

/** POST /api/integrations/whatsapp/connect */
const connectWhatsAppHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const integration = await connectWhatsApp(uid, req.body || {});
    return res.status(200).json({
      success: true,
      integration,
      message: "WhatsApp connected",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to connect WhatsApp",
    });
  }
};

const getOutlookStatusHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const status = await getOutlookStatus(uid);
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load Outlook status",
    });
  }
};

const getOutlookOAuthUrlHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const payload = getOutlookOAuthAuthorizePayload();
    if (!payload.configured || !payload.authorizeUrl) {
      return res.status(503).json({
        success: false,
        message:
          "Microsoft OAuth is not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and redirect URI.",
      });
    }
    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to build Outlook OAuth URL",
    });
  }
};

/** POST /api/integrations/outlook/callback — OAuth code from frontend callback page */
const connectOutlookWithAuthCode = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    const code = req.body?.code;
    const tenantId = req.body?.tenantId;

    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    if (typeof code !== "string" || !code) {
      return res.status(400).json({ success: false, message: "code is required" });
    }

    const integration = await connectOutlookOAuth(uid, { code, tenantId });
    return res.status(200).json({
      success: true,
      integration,
      message: "Outlook connected",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to connect Outlook",
    });
  }
};

/** POST /api/integrations/outlook/test — send a test email via connected Outlook */
const testOutlookHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const result = await sendOutlookTest(uid, req.body || {});
    return res.status(200).json({
      success: true,
      message: `Test email sent to ${result.to}.`,
      send: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send Outlook test email",
    });
  }
};

const disconnectOutlookHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    await disconnectOutlook(uid);
    return res.status(200).json({ success: true, message: "Outlook disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect Outlook",
    });
  }
};

const getZohoMailStatusHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const status = await getZohoMailStatus(uid);
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load Zoho Mail status",
    });
  }
};

const getZohoMailOAuthUrlHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const dataCenter = req.query?.dataCenter || req.query?.dc || "com";
    const payload = getZohoMailOAuthAuthorizePayload(dataCenter);
    if (!payload.configured || !payload.authorizeUrl) {
      return res.status(503).json({
        success: false,
        message:
          "Zoho OAuth is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and redirect URI.",
      });
    }
    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to build Zoho OAuth URL",
    });
  }
};

/** POST /api/integrations/zoho_mail/verify */
const verifyZohoMailCredentialsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const result = await verifyZohoMailIntegrationCredentials(req.body || {});
    return res.status(200).json({
      success: true,
      verified: result.verified,
      mode: result.mode || "smtp",
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      verified: false,
      message: error.message || "Credential verification failed",
    });
  }
};

/** POST /api/integrations/zoho_mail/connect */
const connectZohoMailHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const integration = await connectZohoMail(uid, req.body || {});
    return res.status(200).json({
      success: true,
      integration,
      message: "Zoho Mail connected",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to connect Zoho Mail",
    });
  }
};

/** POST /api/integrations/zoho_mail/test — send a test email via connected Zoho Mail */
const testZohoMailHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const result = await sendZohoMailTest(uid, req.body || {});
    return res.status(200).json({
      success: true,
      message: `Test email sent to ${result.to}.`,
      send: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send Zoho Mail test email",
    });
  }
};

/** POST /api/integrations/zoho_mail/callback — OAuth code from frontend callback page */
const connectZohoMailWithAuthCode = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    const code = req.body?.code;
    const dataCenter = req.body?.dataCenter;
    const location = req.body?.location;
    const accountsServer = req.body?.accountsServer;

    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    if (typeof code !== "string" || !code) {
      return res.status(400).json({ success: false, message: "code is required" });
    }

    const integration = await connectZohoMail(uid, {
      authMode: "oauth",
      code,
      dataCenter,
      location,
      accountsServer,
    });
    return res.status(200).json({
      success: true,
      integration,
      message: "Zoho Mail connected",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to connect Zoho Mail",
    });
  }
};

const disconnectZohoMailHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    await disconnectZohoMail(uid);
    return res.status(200).json({ success: true, message: "Zoho Mail disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect Zoho Mail",
    });
  }
};

const getCalendlyStatusHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const status = await getCalendlyStatus(uid);
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load Calendly status",
    });
  }
};

const getCalendlyMeetingLinksHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const links = await getCalendlyMeetingLinks(uid);
    return res.status(200).json({ success: true, links });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load Calendly links",
    });
  }
};

/** POST /api/integrations/calendly/verify */
const verifyCalendlyCredentialsHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const result = await verifyCalendlyCredentials(req.body || {});
    return res.status(200).json({
      success: true,
      verified: result.verified,
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      verified: false,
      message: error.message || "Credential verification failed",
    });
  }
};

/** POST /api/integrations/calendly/connect */
const connectCalendlyHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }

    const integration = await connectCalendly(uid, req.body || {});
    return res.status(200).json({
      success: true,
      integration,
      message: "Calendly connected",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to connect Calendly",
    });
  }
};

const listCalendlyEventTypesHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    const result = await listCalendlyEventTypesForUser(uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load Calendly meetings",
    });
  }
};

const disconnectCalendlyHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    await disconnectCalendly(uid);
    return res.status(200).json({ success: true, message: "Calendly disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect Calendly",
    });
  }
};

const disconnectWhatsAppHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    await disconnectWhatsApp(uid);
    return res.status(200).json({ success: true, message: "WhatsApp disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect WhatsApp",
    });
  }
};

const disconnectGmailHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    await disconnectGmail(uid);
    return res.status(200).json({ success: true, message: "Gmail disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect Gmail",
    });
  }
};

const disconnectIntegrationHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    const provider = req.params.provider;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return invalidSession(res);
    }
    if (!provider || typeof provider !== "string") {
      return res.status(400).json({ success: false, message: "provider is required" });
    }
    await disconnectIntegration(uid, provider.trim());
    return res.status(200).json({ success: true, message: "Integration disconnected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect integration",
    });
  }
};

module.exports = {
  listIntegrationsHandler,
  getGmailStatusHandler,
  getOutlookStatusHandler,
  getOutlookOAuthUrlHandler,
  connectOutlookWithAuthCode,
  testOutlookHandler,
  disconnectOutlookHandler,
  getZohoMailStatusHandler,
  getZohoMailOAuthUrlHandler,
  verifyZohoMailCredentialsHandler,
  connectZohoMailHandler,
  testZohoMailHandler,
  connectZohoMailWithAuthCode,
  disconnectZohoMailHandler,
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
};
