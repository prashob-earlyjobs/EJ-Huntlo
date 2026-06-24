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

const voiceAgentResultFieldSchema = new mongoose.Schema(
  {
    columnName: { type: String, default: "", trim: true },
    expectedValue: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const voiceCallRetryConfigSchema = new mongoose.Schema(
  {
    maxRetryCount: { type: Number, default: 0, min: 0, max: 10 },
    retryIntervalHours: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const voiceAgentConfigSchema = new mongoose.Schema(
  {
    callObjective: { type: String, default: "" },
    introductoryStatement: { type: String, default: "" },
    callPrompt: { type: String, default: "" },
    resultPrompt: { type: String, default: "" },
    resultFields: { type: [voiceAgentResultFieldSchema], default: [] },
    retryConfig: { type: voiceCallRetryConfigSchema, default: () => ({}) },
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
    /** Email integration used for this campaign's sends and reply sync. */
    emailIntegrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserIntegration",
      default: null,
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
    /** Hunar AI voice agent id (from hunarVoiceAgent.id) for outbound calls. */
    hunarVoiceAgentId: { type: String, default: "", trim: true, index: true },
    /** Full Hunar voice agent object returned on create (voice_call campaigns only). */
    hunarVoiceAgent: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Saved voice agent editor configuration (templates may include {job_description}). */
    voiceAgentConfig: { type: voiceAgentConfigSchema, default: () => ({}) },
    /** Gemini-extracted JD fields cached for voice launch ({jd_*} prompt variables). */
    voiceJdExtract: { type: mongoose.Schema.Types.Mixed, default: null },
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
