const mongoose = require("mongoose");

const planHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planIdBefore: {
      type: String,
      default: "",
      trim: true,
      maxlength: 40,
    },
    planIdAfter: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
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

planHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PlanHistory", planHistorySchema);
