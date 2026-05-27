const mongoose = require("mongoose");

const campaignWhatsAppMessageSchema = new mongoose.Schema(
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
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignSequenceEnrollment",
      default: null,
    },
    candidateKey: { type: String, required: true, trim: true, index: true },
    contactPhone: { type: String, trim: true, default: "" },
    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      required: true,
    },
    body: { type: String, default: "" },
    sequenceStepOrder: { type: Number, default: null, min: 1 },
    sequenceStepLabel: { type: String, trim: true, default: "" },
    provider: {
      type: String,
      enum: ["", "meta"],
      default: "",
    },
    externalMessageId: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "sent",
    },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

campaignWhatsAppMessageSchema.index({ campaignId: 1, candidateKey: 1, sentAt: 1 });

module.exports = mongoose.model(
  "CampaignWhatsAppMessage",
  campaignWhatsAppMessageSchema
);
