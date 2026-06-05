const mongoose = require("mongoose");

const campaignContactSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

campaignContactSchema.index({ campaignId: 1, candidateKey: 1 }, { unique: true });
campaignContactSchema.index({ campaignId: 1, addedAt: -1 });

module.exports = mongoose.model("CampaignContact", campaignContactSchema);
