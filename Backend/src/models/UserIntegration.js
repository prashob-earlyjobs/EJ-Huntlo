const mongoose = require("mongoose");

const userIntegrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      enum: ["gmail"],
    },
    email: { type: String, trim: true, default: "" },
    senderName: { type: String, trim: true, default: "" },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: "" },
    tokenExpiry: { type: Date, default: null },
    scopes: { type: [String], default: [] },
  },
  { timestamps: true }
);

userIntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("UserIntegration", userIntegrationSchema);
