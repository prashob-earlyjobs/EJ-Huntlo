const mongoose = require("mongoose");

const usageActionEnum = [
  "candidateSearches",
  "emailUnveils",
  "candidateUnveils",
  "mobileUnveils",
  "linkedinLookups",
];

const usageHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Workspace owner whose plan quota was charged */
    billedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: usageActionEnum,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

usageHistorySchema.index({ userId: 1, createdAt: -1 });
usageHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("UsageHistory", usageHistorySchema);
