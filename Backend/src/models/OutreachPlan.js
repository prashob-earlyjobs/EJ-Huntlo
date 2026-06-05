const mongoose = require("mongoose");

const touchpointSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, required: true },
    body: { type: String, default: "" },
    waitDays: { type: Number, default: 0, min: 0 },
    waitHours: { type: Number, default: 0, min: 0 },
    waitMinutes: { type: Number, default: 0, min: 0 },
    sendTime: { type: String, trim: true, default: "09:00" },
    timezone: { type: String, enum: ["IST", "UTC"], default: "IST" },
    waitUnit: {
      type: String,
      enum: ["days", "hours", "minutes"],
      default: "days",
    },
  },
  { _id: true }
);

const startScheduleSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["immediate", "scheduled", "soonest_at", "after", "next_business_day"],
      default: "immediate",
    },
    scheduledAt: { type: String, trim: true, default: "" },
    /** @deprecated Legacy field — read via normalizeStartSchedule only */
    soonestAt: { type: String, trim: true, default: "" },
    sendTime: { type: String, trim: true, default: "09:00" },
    timezone: { type: String, enum: ["IST", "UTC"], default: "IST" },
  },
  { _id: false }
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
    startSchedule: {
      type: startScheduleSchema,
      default: () => ({ mode: "immediate", timezone: "IST" }),
    },
  },
  { timestamps: true }
);

outreachPlanSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("OutreachPlan", outreachPlanSchema);
