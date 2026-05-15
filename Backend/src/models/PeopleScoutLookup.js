const mongoose = require("mongoose");

const peopleScoutLookupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    queryType: {
      type: String,
      enum: ["email", "linkedin_url"],
      required: true,
    },
    queryLabel: { type: String, default: "", trim: true },
    scoutId: { type: String, default: "", trim: true },
    fjProfileId: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    headline: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    linkedinFlagshipUrl: { type: String, default: "", trim: true },
    linkedinProfileUrl: { type: String, default: "", trim: true },
    profilePictureUrl: { type: String, default: "", trim: true },
    numOfConnections: { type: Number, default: null },
    fjStatus: { type: String, default: "", trim: true },
    fjMessage: { type: String, default: "", trim: true },
    /** Snapshot of Future Jobs `data` object (scoutId, profile, revealStatus, …) */
    fjResponseData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

peopleScoutLookupSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PeopleScoutLookup", peopleScoutLookupSchema);
