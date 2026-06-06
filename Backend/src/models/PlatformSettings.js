const mongoose = require("mongoose");
const { DEFAULT_MESSAGING_CHANNEL, MESSAGING_CHANNELS } = require("../constants/platformMessagingChannel");

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "singleton", unique: true, trim: true },
    messagingChannel: {
      type: String,
      enum: MESSAGING_CHANNELS,
      default: DEFAULT_MESSAGING_CHANNEL,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
