const mongoose = require("mongoose");

const whatsAppTouchpointSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: "" },
    body: { type: String, default: "" },
    waitHours: { type: Number, default: 0, min: 0 },
    templateId: { type: String, trim: true, default: "" },
    isNoReplyFallback: { type: Boolean, default: false },
    isReplyFollowUp: { type: Boolean, default: false },
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

const whatsAppOutreachPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    /** Role context for AI replies (JD pasted when creating the sequence). */
    jobDescription: { type: String, default: "" },
    touchpoints: {
      type: [whatsAppTouchpointSchema],
      default: [],
    },
    calendlyAutomation: {
      type: calendlyAutomationSchema,
      default: () => ({ enabled: false }),
    },
  },
  { timestamps: true }
);

whatsAppOutreachPlanSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("WhatsAppOutreachPlan", whatsAppOutreachPlanSchema);
