const mongoose = require("mongoose");

const campaignWhatsAppThreadReadSchema = new mongoose.Schema(
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
    candidateKey: { type: String, required: true, trim: true },
    lastReadAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

campaignWhatsAppThreadReadSchema.index(
  { userId: 1, campaignId: 1, candidateKey: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "CampaignWhatsAppThreadRead",
  campaignWhatsAppThreadReadSchema
);
