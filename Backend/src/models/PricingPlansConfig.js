const mongoose = require("mongoose");

const pricingPlansConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "singleton", unique: true, trim: true },
    /** Full payload: { intro: string, tiers: PricingPlanTier[] } */
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PricingPlansConfig", pricingPlansConfigSchema);
