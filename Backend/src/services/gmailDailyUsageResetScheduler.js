const {
  getUsageDateKey,
  resetAllGmailDailyUsage,
  USAGE_TIMEZONE,
} = require("./gmailDailySendLimitService");

const CHECK_INTERVAL_MS = Math.max(
  30_000,
  Number(process.env.GMAIL_DAILY_RESET_CHECK_MS) || 60_000
);

let timer = null;
let lastUsageDateKey = getUsageDateKey();

async function runDateRolloverCheck() {
  const currentKey = getUsageDateKey();
  if (currentKey === lastUsageDateKey) return;
  lastUsageDateKey = currentKey;
  try {
    await resetAllGmailDailyUsage();
  } catch (err) {
    console.error("[gmail-daily-limit] reset failed:", err?.message || err);
  }
}

function startGmailDailyUsageResetScheduler() {
  if (timer) return;

  console.log(
    `[gmail-daily-limit] reset scheduler started (timezone ${USAGE_TIMEZONE}, check every ${CHECK_INTERVAL_MS}ms)`
  );

  void runDateRolloverCheck();
  timer = setInterval(() => {
    void runDateRolloverCheck();
  }, CHECK_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

function stopGmailDailyUsageResetScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startGmailDailyUsageResetScheduler,
  stopGmailDailyUsageResetScheduler,
  runDateRolloverCheck,
};
