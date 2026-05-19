const mongoose = require("mongoose");

const usageEventTypeEnum = [
  "people_scout_lookup",
  "email_unveil",
  "phone_unveil",
];

const usageEventSourceEnum = [
  "user_cache",
  "shared_cache",
  "futurejobs",
  "not_found",
];

const usageEventProductEnum = ["people_scout", "sourcing"];

const usageEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: usageEventTypeEnum,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: usageEventSourceEnum,
      required: true,
      index: true,
    },
    product: {
      type: String,
      enum: usageEventProductEnum,
      required: true,
    },
    charged: {
      type: Boolean,
      required: true,
      default: false,
    },
    metadata: {
      linkedinProfileUrl: { type: String, default: "" },
      lookupId: { type: String, default: "" },
      queryType: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

usageEventSchema.index({ userId: 1, createdAt: -1 });
usageEventSchema.index({ eventType: 1, source: 1, createdAt: -1 });
usageEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("UsageEvent", usageEventSchema);
