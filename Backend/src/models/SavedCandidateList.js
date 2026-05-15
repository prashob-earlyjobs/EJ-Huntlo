const mongoose = require("mongoose");

const savedCandidateListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

savedCandidateListSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SavedCandidateList", savedCandidateListSchema);
