const { processDueScheduleReminders } = require("./scheduleReminderService");

const DEFAULT_INTERVAL_MS = 60_000;
const intervalMs = Math.max(
  10_000,
  Number(process.env.SCHEDULE_REMINDER_INTERVAL_MS) || DEFAULT_INTERVAL_MS
);

let timer = null;
let tickRunning = false;

function isSchedulerEnabled() {
  const raw = process.env.SCHEDULE_REMINDER_ENABLED;
  if (raw === undefined || raw === "") return true;
  return !["0", "false", "no", "off"].includes(String(raw).trim().toLowerCase());
}

async function runTick() {
  if (tickRunning) return;
  tickRunning = true;
  try {
    const result = await processDueScheduleReminders();
    if (result.sent > 0) {
      console.log(`[schedule-reminder] sent ${result.sent} reminder(s) (checked ${result.checked} booking(s))`);
    }
  } catch (err) {
    console.error("[schedule-reminder]", err?.message || err);
  } finally {
    tickRunning = false;
  }
}

function startScheduleReminderScheduler() {
  if (!isSchedulerEnabled()) {
    console.log("[schedule-reminder] disabled (SCHEDULE_REMINDER_ENABLED)");
    return;
  }
  if (timer) return;

  console.log(`[schedule-reminder] started (interval ${intervalMs}ms)`);
  void runTick();
  timer = setInterval(() => {
    void runTick();
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

function stopScheduleReminderScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startScheduleReminderScheduler,
  stopScheduleReminderScheduler,
  runTick,
};
