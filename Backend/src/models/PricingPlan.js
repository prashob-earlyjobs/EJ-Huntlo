const mongoose = require("mongoose");

/** One document per pricing tier; timestamps track per-plan updates. */
const pricingPlanSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, default: 0 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    primaryPrice: { type: String, default: "", maxlength: 120 },
    secondaryPrice: { type: String, default: "", maxlength: 160 },
    description: { type: String, default: "", maxlength: 2000 },
    /** Non-negative integers only; labels are applied when rendering API/UI. */
    searches: { type: Number, default: null },
    candidateUnlocks: { type: Number, default: null },
    verifiedEmails: { type: Number, default: null },
    phoneNumbers: { type: Number, default: null },
    features: [{ type: String, trim: true }],
    isPopular: { type: Boolean, default: false },
    popularBadge: { type: String, default: "⭐ Most Popular", maxlength: 80 },
  },
  { timestamps: true }
);

pricingPlanSchema.index({ sortOrder: 1 });

module.exports = mongoose.model("PricingPlan", pricingPlanSchema);
