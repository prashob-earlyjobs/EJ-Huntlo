const mongoose = require("mongoose");

const revealedContactSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

revealedContactSchema.index(
  { userId: 1, sourcingSessionId: 1, linkedinProfileUrl: 1, revealType: 1 },
  { unique: true }
);

module.exports = mongoose.model("RevealedContact", revealedContactSchema);
