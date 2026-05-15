const mongoose = require("mongoose");

/**
 * Cached email/phone reveals for People Scout (per user + LinkedIn profile URL).
 * Separate from RevealedContact (sourcing-session scoped).
 */
const peopleScoutRevealedContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
    /** Last Future Jobs scout id used when fetching from API (debugging) */
    scoutIdLastUsed: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  }
);

peopleScoutRevealedContactSchema.index(
  { userId: 1, linkedinProfileUrl: 1, revealType: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PeopleScoutRevealedContact",
  peopleScoutRevealedContactSchema
);
