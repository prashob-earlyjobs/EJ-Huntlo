const mongoose = require("mongoose");

const scheduleReminderSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    inviteEmail: { type: Boolean, default: true },
    inviteWhatsapp: { type: Boolean, default: true },
    inviteCalendar: { type: Boolean, default: false },
    reminder24h: { type: Boolean, default: true },
    reminder6h: { type: Boolean, default: true },
    reminder1h: { type: Boolean, default: true },
    reminder15m: { type: Boolean, default: false },
    reminderEmail: { type: Boolean, default: true },
    reminderWhatsapp: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScheduleReminderSettings", scheduleReminderSettingsSchema);
