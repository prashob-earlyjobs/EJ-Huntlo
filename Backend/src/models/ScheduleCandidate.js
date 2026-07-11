const mongoose = require("mongoose");

const scheduleCandidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "link_sent", "scheduled", "canceled"],
      default: "pending",
      index: true,
    },
    meetingUri: { type: String, default: "", trim: true },
    meetingName: { type: String, default: "", trim: true },
    schedulingUrl: { type: String, default: "", trim: true },
    source: { type: String, default: "manual", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

scheduleCandidateSchema.index({ userId: 1, email: 1 });
scheduleCandidateSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("ScheduleCandidate", scheduleCandidateSchema);
