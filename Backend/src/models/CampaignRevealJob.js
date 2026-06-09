const mongoose = require("mongoose");

const campaignRevealJobSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "quota_exceeded"],
      default: "pending",
      index: true,
    },
    candidateKeys: {
      type: [String],
      default: [],
    },
    revealTypes: {
      type: [String],
      enum: ["EMAIL", "PHONE"],
      default: ["EMAIL", "PHONE"],
    },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    revealedEmailCount: { type: Number, default: 0 },
    revealedPhoneCount: { type: Number, default: 0 },
    contactProgress: {
      type: [
        {
          candidateKey: { type: String, default: "" },
          name: { type: String, default: "" },
          emailStatus: { type: String, default: "queued" },
          phoneStatus: { type: String, default: "queued" },
          email: { type: String, default: "" },
          phone: { type: String, default: "" },
          detail: { type: String, default: "" },
          updatedAt: { type: Date },
        },
      ],
      default: [],
    },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

campaignRevealJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model("CampaignRevealJob", campaignRevealJobSchema);
