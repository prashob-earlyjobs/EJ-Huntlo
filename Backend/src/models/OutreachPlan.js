const mongoose = require("mongoose");

const touchpointSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, required: true },
    body: { type: String, default: "" },
    waitDays: { type: Number, default: 0, min: 0 },
    /** When set (>0), delays the next step by hours instead of waitDays. */
    waitHours: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const calendlyAutomationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    meetingUri: { type: String, trim: true, default: "" },
    meetingName: { type: String, trim: true, default: "" },
    schedulingUrl: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, default: 0, min: 0 },
    kind: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const outreachPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    touchpoints: {
      type: [touchpointSchema],
      default: [],
    },
    calendlyAutomation: {
      type: calendlyAutomationSchema,
      default: () => ({ enabled: false }),
    },
  },
  { timestamps: true }
);

outreachPlanSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("OutreachPlan", outreachPlanSchema);
