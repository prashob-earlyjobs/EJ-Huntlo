const mongoose = require("mongoose");

const touchpointSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, required: true },
    body: { type: String, default: "" },
    waitDays: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const outreachTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    planName: { type: String, trim: true, default: "" },
    touchpoints: {
      type: [touchpointSchema],
      default: [],
    },
    /** Starter templates use a stable key for seed upserts. */
    starterKey: { type: String, trim: true, sparse: true, unique: true },
    /** When true, template is visible to every user (starter / system templates). */
    isGlobal: { type: Boolean, default: false, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

outreachTemplateSchema.index({ isGlobal: 1, name: 1 });
outreachTemplateSchema.index({ createdBy: 1, updatedAt: -1 });

module.exports = mongoose.model("OutreachTemplate", outreachTemplateSchema);
