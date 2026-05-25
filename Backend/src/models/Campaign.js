const mongoose = require("mongoose");

const campaignContactSchema = new mongoose.Schema(
  {
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
  { _id: true }
);

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    outreachPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachPlan",
      default: null,
    },
    outreachStatus: {
      type: String,
      enum: ["idle", "active", "paused", "completed"],
      default: "idle",
    },
    outreachStartedAt: { type: Date, default: null },
    contacts: {
      type: [campaignContactSchema],
      default: [],
    },
  },
  { timestamps: true }
);

campaignSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Campaign", campaignSchema);
