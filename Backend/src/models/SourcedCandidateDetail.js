const mongoose = require("mongoose");

const sourcedCandidateDetailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourcingSessionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    candidateId: {
      type: String,
      default: "",
      trim: true,
    },
    linkedinProfileUrl: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    finalScore: {
      type: Number,
      default: null,
    },
    rawDoc: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

sourcedCandidateDetailSchema.index(
  { userId: 1, sourcingSessionId: 1, candidateId: 1 },
  { unique: true, sparse: true }
);

sourcedCandidateDetailSchema.index({
  userId: 1,
  sourcingSessionId: 1,
  linkedinProfileUrl: 1,
});

module.exports = mongoose.model("SourcedCandidateDetail", sourcedCandidateDetailSchema);
