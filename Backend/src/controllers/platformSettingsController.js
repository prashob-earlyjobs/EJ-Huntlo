const {
  getPlatformSettings,
  setMessagingChannel,
} = require("../services/platformSettingsService");

/**
 * GET /api/platform-settings — admin only
 */
const getPlatformSettingsHandler = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load platform settings",
    });
  }
};

/**
 * PUT /api/platform-settings — admin only
 * Body: { messagingChannel: "huntlo_meta" | "gupshup" }
 */
const updatePlatformSettingsHandler = async (req, res) => {
  try {
    const { messagingChannel } = req.body || {};
    if (messagingChannel === undefined || messagingChannel === null) {
      return res.status(400).json({
        success: false,
        message: "messagingChannel is required",
      });
    }

    const settings = await setMessagingChannel(messagingChannel);
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    const status = error.statusCode === 400 ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to save platform settings",
    });
  }
};

module.exports = {
  getPlatformSettingsHandler,
  updatePlatformSettingsHandler,
};
