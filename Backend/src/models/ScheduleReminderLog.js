const mongoose = require("mongoose");

const scheduleReminderLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignCalendlyBooking",
      required: true,
      index: true,
    },
    offsetMinutes: { type: Number, required: true },
    channel: { type: String, enum: ["email", "whatsapp"], required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

scheduleReminderLogSchema.index(
  { bookingId: 1, offsetMinutes: 1, channel: 1 },
  { unique: true }
);

module.exports = mongoose.model("ScheduleReminderLog", scheduleReminderLogSchema);
