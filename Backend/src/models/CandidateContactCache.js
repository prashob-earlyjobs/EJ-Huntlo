const mongoose = require("mongoose");

/**
 * Workspace-wide cache of revealed email/phone for a LinkedIn profile.
 * Populated on first successful reveal (any user); reused for later users without calling Future Jobs.
 */
const candidateContactCacheSchema = new mongoose.Schema(
  {
    linkedinProfileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    revealType: {
      type: String,
      enum: ["PHONE", "EMAIL"],
      required: true,
    },
    values: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: "",
      trim: true,
    },
    /** User who triggered the first Future Jobs fetch (if any) */
    firstRevealedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

candidateContactCacheSchema.index(
  { linkedinProfileUrl: 1, revealType: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "CandidateContactCache",
  candidateContactCacheSchema
);
