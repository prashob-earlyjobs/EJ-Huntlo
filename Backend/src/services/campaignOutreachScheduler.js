const { processDueEnrollments } = require("./campaignOutreachSendService");
const { syncDueEnrollmentReplies } = require("./campaignReplySyncService");

const DEFAULT_INTERVAL_MS = 60_000;
const intervalMs = Math.max(
  10_000,
  Number(process.env.OUTREACH_SCHEDULER_INTERVAL_MS) || DEFAULT_INTERVAL_MS
);

let timer = null;
let tickRunning = false;

function isSchedulerEnabled() {
  const raw = process.env.OUTREACH_SCHEDULER_ENABLED;
  if (raw === undefined || raw === "") return true;
  return !["0", "false", "no", "off"].includes(String(raw).trim().toLowerCase());
}

async function runTick() {
  if (tickRunning) return;
  tickRunning = true;
  try {
    const replySync = await syncDueEnrollmentReplies();
    if (replySync.newReplies > 0) {
      console.log(
        `[outreach-reply-sync] stored ${replySync.newReplies} new reply message(s) from ${replySync.checked} enrollment(s)`
      );
    }
    const processed = await processDueEnrollments();
    if (processed > 0) {
      console.log(`[outreach-scheduler] processed ${processed} due enrollment(s)`);
    }
  } catch (err) {
    console.error("[outreach-scheduler]", err?.message || err);
  } finally {
    tickRunning = false;
  }
}

function startCampaignOutreachScheduler() {
  if (!isSchedulerEnabled()) {
    console.log("[outreach-scheduler] disabled (OUTREACH_SCHEDULER_ENABLED)");
    return;
  }
  if (timer) return;

  console.log(
    `[outreach-scheduler] started (interval ${intervalMs}ms)`
  );

  void runTick();
  timer = setInterval(() => {
    void runTick();
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

function stopCampaignOutreachScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startCampaignOutreachScheduler,
  stopCampaignOutreachScheduler,
  runTick,
};
