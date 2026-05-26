const mongoose = require("mongoose");

const userIntegrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      enum: ["gmail", "whatsapp", "calendly"],
    },
    email: { type: String, trim: true, default: "" },
    senderName: { type: String, trim: true, default: "" },
    /** Gmail OAuth access token; Meta WhatsApp permanent access token when whatsappProvider is meta. */
    accessToken: { type: String, default: "" },
    /** Gmail OAuth refresh token, or Gupshup password when provider is whatsapp. */
    refreshToken: { type: String, default: "" },
    tokenExpiry: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    /** WhatsApp send provider: gupshup | meta (Cloud API). */
    whatsappProvider: {
      type: String,
      enum: ["", "gupshup", "meta"],
      default: "",
    },
    /** Gupshup WhatsApp: existing (user credentials) | huntlo (platform-managed). */
    gupshupMode: {
      type: String,
      enum: ["", "existing", "huntlo"],
      default: "",
    },
    gupshupUserId: { type: String, trim: true, default: "" },
    gupshupAppName: { type: String, trim: true, default: "" },
    /** Meta WhatsApp Cloud API — Phone Number ID from Business Manager. */
    metaPhoneNumberId: { type: String, trim: true, default: "" },
    /** Optional WhatsApp Business Account ID (WABA). */
    metaWabaId: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

userIntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("UserIntegration", userIntegrationSchema);
