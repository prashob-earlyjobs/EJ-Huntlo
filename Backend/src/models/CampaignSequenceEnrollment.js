const mongoose = require("mongoose");

const campaignSequenceEnrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    outreachPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachPlan",
      required: true,
    },
    candidateKey: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactName: { type: String, trim: true, default: "" },
    contactRole: { type: String, trim: true, default: "" },
    contactCompany: { type: String, trim: true, default: "" },
    /** 1-based order of the next touchpoint to send. */
    currentStepOrder: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "failed", "skipped", "deferred"],
      default: "active",
      index: true,
    },
    nextSendAt: { type: Date, default: Date.now, index: true },
    lastSentAt: { type: Date, default: null },
    sentCount: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    lastMessageId: { type: String, default: "" },
    lastThreadId: { type: String, default: "", index: true },
    hasReply: { type: Boolean, default: false },
    replyCount: { type: Number, default: 0 },
    lastReplyAt: { type: Date, default: null },
    lastReplySyncedAt: { type: Date, default: null },
    /** unknown until Gemini detects a clear signal. */
    replyDisposition: {
      type: String,
      enum: ["unknown", "interested", "not_interested"],
      default: "unknown",
      index: true,
    },
    replyDispositionAt: { type: Date, default: null },
    autoReplyCount: { type: Number, default: 0 },
    lastAutoReplyAt: { type: Date, default: null },
    /** Gmail message id of the last candidate message we auto-replied to. */
    lastAutoRepliedToMessageId: { type: String, default: "" },
  },
  { timestamps: true }
);

campaignSequenceEnrollmentSchema.index(
  { campaignId: 1, candidateKey: 1 },
  { unique: true }
);
campaignSequenceEnrollmentSchema.index({ status: 1, nextSendAt: 1 });

module.exports = mongoose.model(
  "CampaignSequenceEnrollment",
  campaignSequenceEnrollmentSchema
);
