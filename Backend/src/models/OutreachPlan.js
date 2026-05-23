const mongoose = require("mongoose");

const touchpointSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, required: true },
    body: { type: String, default: "" },
    waitDays: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
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
  },
  { timestamps: true }
);

outreachPlanSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("OutreachPlan", outreachPlanSchema);
