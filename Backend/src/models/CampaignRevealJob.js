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
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    revealedEmailCount: { type: Number, default: 0 },
    revealedPhoneCount: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

campaignRevealJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model("CampaignRevealJob", campaignRevealJobSchema);
