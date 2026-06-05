const mongoose = require("mongoose");

const planPaymentOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    billingUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: { type: String, required: true, trim: true },
    provider: { type: String, enum: ["razorpay", "dodo"], default: "razorpay" },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true,
    },
    razorpayOrderId: { type: String, trim: true, index: true },
    razorpayPaymentId: { type: String, trim: true },
    razorpaySignature: { type: String, trim: true },
    dodoSessionId: { type: String, trim: true, index: true },
    dodoPaymentId: { type: String, trim: true, index: true },
    receipt: { type: String, trim: true },
    paidAt: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { timestamps: true }
);

planPaymentOrderSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
planPaymentOrderSchema.index({ dodoSessionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("PlanPaymentOrder", planPaymentOrderSchema);
