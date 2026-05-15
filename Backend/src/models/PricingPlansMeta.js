const mongoose = require("mongoose");

/** Singleton row: section intro copy for pricing (timestamps = last intro edit). */
const pricingPlansMetaSchema = new mongoose.Schema(
  {
    key: { type: String, default: "singleton", unique: true, trim: true },
    intro: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PricingPlansMeta", pricingPlansMetaSchema);
