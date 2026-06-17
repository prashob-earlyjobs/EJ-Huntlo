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
      enum: ["gmail", "outlook", "zoho_mail", "custom_mail", "whatsapp", "calendly"],
    },
    email: { type: String, trim: true, default: "" },
    senderName: { type: String, trim: true, default: "" },
    /** Gmail OAuth access token; Meta WhatsApp permanent access token when whatsappProvider is meta. */
    accessToken: { type: String, default: "" },
    /** Gmail OAuth refresh token (unused for WhatsApp — Meta token is in accessToken). */
    refreshToken: { type: String, default: "" },
    tokenExpiry: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    /** WhatsApp send provider (platform channel: meta or gupshup). */
    whatsappProvider: {
      type: String,
      enum: ["", "meta", "gupshup"],
      default: "",
    },
    /** own = user's Meta credentials; huntlo = platform-managed number (no token stored). */
    whatsappMode: {
      type: String,
      enum: ["", "own", "huntlo"],
      default: "",
    },
    /** Meta WhatsApp Cloud API — Phone Number ID from Business Manager. */
    metaPhoneNumberId: { type: String, trim: true, default: "" },
    /** Optional WhatsApp Business Account ID (WABA). */
    metaWabaId: { type: String, trim: true, default: "" },
    /** Zoho accounts region: com, eu, in, com.au, jp, ca, sa */
    zohoDataCenter: { type: String, trim: true, default: "" },
    /** smtp = app password; oauth = Zoho OAuth tokens */
    zohoAuthMode: {
      type: String,
      enum: ["", "smtp", "oauth"],
      default: "",
    },
    /** Zoho Mail API account id (OAuth sends). */
    zohoAccountId: { type: String, trim: true, default: "" },
    /** Microsoft Entra tenant id used for token refresh (default common). */
    outlookTenantId: { type: String, trim: true, default: "" },
    /** Microsoft Graph user id from /me. */
    outlookUserId: { type: String, trim: true, default: "" },
    /** Custom SMTP host (custom_mail provider). */
    smtpHost: { type: String, trim: true, default: "" },
    /** Custom SMTP port (custom_mail provider). */
    smtpPort: { type: Number, default: 587, min: 1, max: 65535 },
    /** tls | ssl | none — custom_mail SMTP security mode. */
    smtpSecurity: {
      type: String,
      enum: ["", "tls", "ssl", "none"],
      default: "",
    },
    /** Calendar date (YYYY-MM-DD) for daily Gmail send counters. */
    gmailUsageDate: { type: String, trim: true, default: "" },
    /** Emails actually sent today via this Gmail integration. */
    gmailDailySentCount: { type: Number, default: 0, min: 0 },
    /** Emails reserved at campaign launch today (parallel campaigns share this cap). */
    gmailDailyReservedCount: { type: Number, default: 0, min: 0 },
    /** Default sender for new email campaigns (one per user across email providers). */
    isDefaultEmail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userIntegrationSchema.index({ userId: 1, provider: 1, email: 1 });
userIntegrationSchema.index({ userId: 1, isDefaultEmail: 1 });

module.exports = mongoose.model("UserIntegration", userIntegrationSchema);
