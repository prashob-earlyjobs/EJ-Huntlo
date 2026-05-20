const mongoose = require("mongoose");

const sourcingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Future Jobs sourcing session `_id` */
    futureJobsSessionId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    prompt: {
      type: String,
      default: "",
    },
    sessionTitle: {
      type: String,
      default: "",
      trim: true,
    },
    usingSessionOverride: {
      type: Boolean,
      default: false,
    },
    futureJobsStatus: {
      type: String,
      default: "",
      trim: true,
    },
    totalDocs: {
      type: Number,
      default: null,
    },
    candidateCountFirstPage: {
      type: Number,
      default: 0,
      min: 0,
    },
    /**
     * Candidate preview from first profiles fetch (so history can show who was found).
     */
    candidatePreview: {
      type: [
        {
          id: { type: String, default: "" },
          sourcingSessionId: { type: String, default: "" },
          linkedin_profile_url: { type: String, default: "" },
          name: { type: String, default: "" },
          role: { type: String, default: "" },
          location: { type: String, default: "" },
          status: { type: String, default: "" },
        },
      ],
      default: [],
    },
    profilesFetchError: {
      type: String,
      default: null,
    },
    filterForm: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sourcingSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SourcingSession", sourcingSessionSchema);
