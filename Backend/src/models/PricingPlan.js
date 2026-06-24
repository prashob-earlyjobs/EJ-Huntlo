const mongoose = require("mongoose");

/** One document per pricing tier; timestamps track per-plan updates. */
const pricingPlanSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, default: 0 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    primaryPrice: { type: String, default: "", maxlength: 120 },
    secondaryPrice: { type: String, default: "", maxlength: 160 },
    /** Checkout charge in major units (e.g. 8999 INR or 99 USD) for paymentCurrency. */
    paymentAmount: { type: Number, default: null, min: 0 },
    paymentCurrency: { type: String, enum: ["inr", "usd", null], default: null },
    /** Optional USD charge when paymentCurrency is INR (dual-currency checkout). */
    paymentAmountUsd: { type: Number, default: null, min: 0 },
    description: { type: String, default: "", maxlength: 2000 },
    /** Non-negative integers only; labels are applied when rendering API/UI. */
    searches: { type: Number, default: null },
    candidateUnlocks: { type: Number, default: null },
    verifiedEmails: { type: Number, default: null },
    phoneNumbers: { type: Number, default: null },
    emailOutreaches: { type: Number, default: null },
    whatsappOutreaches: { type: Number, default: null },
    aiVoiceCalls: { type: Number, default: null },
    /** Max workspace sub-users (members). null = unlimited; 0 = none. */
    maxSubUsers: { type: Number, default: null },
    features: [{ type: String, trim: true }],
    /** Admin toggles — which dashboard product areas this plan unlocks. */
    campaignsEnabled: { type: Boolean, default: false },
    integrationsEnabled: { type: Boolean, default: false },
    outreachesEnabled: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    popularBadge: { type: String, default: "⭐ Most Popular", maxlength: 80 },
  },
  { timestamps: true }
);

pricingPlanSchema.index({ sortOrder: 1 });

module.exports = mongoose.model("PricingPlan", pricingPlanSchema);
