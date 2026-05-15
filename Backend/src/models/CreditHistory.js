const mongoose = require("mongoose");

const creditHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    delta: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ["signup", "admin_create", "admin_delta", "admin_set"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

creditHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("CreditHistory", creditHistorySchema);
