const mongoose = require("mongoose");

const whatsAppTouchpointSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: "" },
    body: { type: String, default: "" },
    waitHours: { type: Number, default: 0, min: 0 },
    templateId: { type: String, trim: true, default: "" },
    isNoReplyFallback: { type: Boolean, default: false },
  },
  { _id: true }
);

const whatsAppOutreachPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    touchpoints: {
      type: [whatsAppTouchpointSchema],
      default: [],
    },
  },
  { timestamps: true }
);

whatsAppOutreachPlanSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("WhatsAppOutreachPlan", whatsAppOutreachPlanSchema);
