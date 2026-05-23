const mongoose = require("mongoose");
const {
  connectGmail,
  connectWhatsAppGupshup,
  verifyWhatsAppGupshupCredentials,
  getGmailStatus,
  getWhatsAppStatus,
  listUserIntegrations,
  disconnectGmail,
  disconnectWhatsApp,
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
    const status = await getWhatsAppStatus(uid);
    return res.status(200).json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load WhatsApp status",
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

    const result = await verifyWhatsAppGupshupCredentials(req.body || {});
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

    const integration = await connectWhatsAppGupshup(uid, req.body || {});
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
  getWhatsAppStatusHandler,
  connectGmailWithAuthCode,
  verifyWhatsAppCredentialsHandler,
  connectWhatsAppHandler,
  disconnectGmailHandler,
  disconnectWhatsAppHandler,
  disconnectIntegrationHandler,
};
