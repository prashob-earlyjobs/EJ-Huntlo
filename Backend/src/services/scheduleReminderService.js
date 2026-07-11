const mongoose = require("mongoose");
const ScheduleReminderSettings = require("../models/ScheduleReminderSettings");
const ScheduleReminderLog = require("../models/ScheduleReminderLog");
const CampaignCalendlyBooking = require("../models/CampaignCalendlyBooking");
const User = require("../models/User");
const { sendCampaignEmail } = require("./emailSendService");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const { listConnectedEmailIntegrations } = require("./emailIntegrationService");
const { assertValidRecipientPhone } = require("./whatsappPhoneUtils");

const REMINDER_OFFSETS = [
  { key: "reminder24h", minutes: 24 * 60 },
  { key: "reminder6h", minutes: 6 * 60 },
  { key: "reminder1h", minutes: 60 },
  { key: "reminder15m", minutes: 15 },
];

const DEFAULT_SETTINGS = {
  inviteEmail: true,
  inviteWhatsapp: true,
  inviteCalendar: false,
  reminder24h: true,
  reminder6h: true,
  reminder1h: true,
  reminder15m: false,
  reminderEmail: true,
  reminderWhatsapp: true,
};

function formatSettings(doc) {
  const row = doc || DEFAULT_SETTINGS;
  return {
    inviteEmail: Boolean(row.inviteEmail),
    inviteWhatsapp: Boolean(row.inviteWhatsapp),
    inviteCalendar: Boolean(row.inviteCalendar),
    reminder24h: Boolean(row.reminder24h),
    reminder6h: Boolean(row.reminder6h),
    reminder1h: Boolean(row.reminder1h),
    reminder15m: Boolean(row.reminder15m),
    reminderEmail: Boolean(row.reminderEmail),
    reminderWhatsapp: Boolean(row.reminderWhatsapp),
  };
}

async function getScheduleReminderSettings(userId) {
  const doc = await ScheduleReminderSettings.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  return formatSettings(doc);
}

async function updateScheduleReminderSettings(userId, payload = {}) {
  const patch = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (payload[key] !== undefined) patch[key] = Boolean(payload[key]);
  }
  const doc = await ScheduleReminderSettings.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: patch },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();
  return formatSettings(doc);
}

function enabledOffsets(settings) {
  return REMINDER_OFFSETS.filter((row) => settings[row.key]).map((row) => row.minutes);
}

function formatInterviewTime(startTime, timezone) {
  try {
    const label = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || undefined,
    }).format(new Date(startTime));
    return timezone ? `${label} (${timezone})` : label;
  } catch {
    return new Date(startTime).toISOString();
  }
}

function buildRecruiterReminderBody({ inviteeName, eventName, startTime, timezone, locationLabel }) {
  const when = formatInterviewTime(startTime, timezone);
  const lines = [
    "Upcoming interview reminder",
    "",
    `Candidate: ${inviteeName || "—"}`,
    `Type: ${eventName || "Interview"}`,
    `When: ${when}`,
  ];
  if (locationLabel) lines.push(`Location: ${locationLabel}`);
  lines.push("", "— Huntlo Schedule");
  return lines.join("\n");
}

async function sendRecruiterReminder({ user, settings, booking, offsetMinutes }) {
  const body = buildRecruiterReminderBody({
    inviteeName: booking.inviteeName || booking.inviteeEmail,
    eventName: booking.eventName,
    startTime: booking.startTime,
    timezone: booking.timezone,
    locationLabel: booking.locationLabel,
  });
  const subject = `Interview reminder — ${booking.inviteeName || booking.inviteeEmail || "candidate"}`;
  const sent = { email: false, whatsapp: false };

  if (settings.reminderEmail) {
    const integrations = await listConnectedEmailIntegrations(String(user._id));
    if (integrations.length > 0 && user.email) {
      const existing = await ScheduleReminderLog.findOne({
        bookingId: booking._id,
        offsetMinutes,
        channel: "email",
      })
        .select("_id")
        .lean();
      if (!existing) {
        try {
          await sendCampaignEmail(
            String(user._id),
            { to: user.email, subject, body },
            { integrationId: String(integrations[0]._id) }
          );
          await ScheduleReminderLog.create({
            userId: user._id,
            bookingId: booking._id,
            offsetMinutes,
            channel: "email",
          });
          sent.email = true;
        } catch (err) {
          console.warn("[schedule-reminder] email:", err?.message || err);
        }
      }
    }
  }

  if (settings.reminderWhatsapp && user.mobile) {
    const existing = await ScheduleReminderLog.findOne({
      bookingId: booking._id,
      offsetMinutes,
      channel: "whatsapp",
    })
      .select("_id")
      .lean();
    if (!existing) {
      try {
        const phone = assertValidRecipientPhone(user.mobile);
        await sendWhatsAppSessionMessage(String(user._id), { to: phone, body });
        await ScheduleReminderLog.create({
          userId: user._id,
          bookingId: booking._id,
          offsetMinutes,
          channel: "whatsapp",
        });
        sent.whatsapp = true;
      } catch (err) {
        console.warn("[schedule-reminder] whatsapp:", err?.message || err);
      }
    }
  }

  return sent;
}

async function processDueScheduleReminders(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const windowMs = Math.max(60_000, Number(options.windowMs) || 120_000);
  const maxLookaheadMs = 25 * 60 * 60 * 1000;

  const bookings = await CampaignCalendlyBooking.find({
    status: "active",
    startTime: { $gt: now, $lte: new Date(now.getTime() + maxLookaheadMs) },
  })
    .select("_id userId inviteeName inviteeEmail eventName startTime timezone locationLabel")
    .lean();

  if (!bookings.length) return { checked: 0, sent: 0 };

  const userIds = [...new Set(bookings.map((b) => String(b.userId)))];
  const [settingsRows, users] = await Promise.all([
    ScheduleReminderSettings.find({ userId: { $in: userIds } }).lean(),
    User.find({ _id: { $in: userIds } }).select("email mobile fullName").lean(),
  ]);

  const settingsByUser = new Map(settingsRows.map((row) => [String(row.userId), formatSettings(row)]));
  const userById = new Map(users.map((row) => [String(row._id), row]));

  let sent = 0;
  for (const booking of bookings) {
    const userId = String(booking.userId);
    const user = userById.get(userId);
    if (!user) continue;

    const settings = settingsByUser.get(userId) || DEFAULT_SETTINGS;
    const offsets = enabledOffsets(settings);
    const msUntil = new Date(booking.startTime).getTime() - now.getTime();

    for (const offsetMinutes of offsets) {
      const targetMs = offsetMinutes * 60 * 1000;
      if (msUntil > targetMs || msUntil < targetMs - windowMs) continue;

      const result = await sendRecruiterReminder({
        user,
        settings,
        booking,
        offsetMinutes,
      });
      if (result.email || result.whatsapp) sent += 1;
    }
  }

  return { checked: bookings.length, sent };
}

module.exports = {
  getScheduleReminderSettings,
  updateScheduleReminderSettings,
  processDueScheduleReminders,
  DEFAULT_SETTINGS,
};
