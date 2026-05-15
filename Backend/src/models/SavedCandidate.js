const mongoose = require("mongoose");

const savedCandidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourcingSessionId: { type: String, default: "", trim: true },
    candidateId: { type: String, default: "", trim: true },
    linkedinProfileUrl: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    currentCompany: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    experience: { type: String, default: "", trim: true },
    finalScore: { type: Number, default: null },
    highlights: [{ type: String, trim: true }],
    recommendation: { type: String, default: "", trim: true },
    rawDoc: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, default: "Saved", trim: true },
    saveListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavedCandidateList",
      default: null,
    },
  },
  { timestamps: true }
);

savedCandidateSchema.index({ userId: 1, sourcingSessionId: 1, updatedAt: -1 });
savedCandidateSchema.index({ userId: 1, saveListId: 1, updatedAt: -1 });

module.exports = mongoose.model("SavedCandidate", savedCandidateSchema);
