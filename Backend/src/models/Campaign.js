const mongoose = require("mongoose");

const campaignContactSchema = new mongoose.Schema(
  {
    candidateKey: { type: String, required: true, trim: true },
    candidateId: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    linkedinUrl: { type: String, default: "", trim: true },
    sourcingSessionId: { type: String, default: "", trim: true },
    jd: { type: String, default: "", trim: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const calendlyAutomationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    meetingUri: { type: String, trim: true, default: "" },
    meetingName: { type: String, trim: true, default: "" },
    schedulingUrl: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, default: 0, min: 0 },
    kind: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    /** Open role title for outreach merge tags ({{JobTitle}}) and AI context. */
    jobTitle: { type: String, default: "", trim: true },
    /** Role context for AI replies and the Job description workspace tab. */
    jobDescription: { type: String, default: "" },
    /** Per-campaign Calendly link for AI auto-replies (email interested flow). */
    calendlyAutomation: {
      type: calendlyAutomationSchema,
      default: () => ({ enabled: false }),
    },
    outreachPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    /** gmail = OutreachPlan; whatsapp = WhatsAppOutreachPlan; voice_call = AI voice (no plan) */
    outreachChannel: {
      type: String,
      enum: ["gmail", "whatsapp", "voice_call"],
      default: "gmail",
    },
    outreachStatus: {
      type: String,
      enum: ["idle", "active", "paused", "completed"],
      default: "idle",
    },
    outreachStartedAt: { type: Date, default: null },
    whatsAppInterestedCount: { type: Number, default: 0, min: 0 },
    whatsAppNotInterestedCount: { type: Number, default: 0, min: 0 },
    /** Denormalized count — source of truth is CampaignContact collection. */
    contactCount: { type: Number, default: 0, min: 0 },
    /** @deprecated Legacy embedded contacts — migrated to CampaignContact on read. */
    contacts: {
      type: [campaignContactSchema],
      default: [],
    },
  },
  { timestamps: true }
);

campaignSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Campaign", campaignSchema);
