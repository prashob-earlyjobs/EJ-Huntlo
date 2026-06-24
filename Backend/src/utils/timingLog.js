const { getRequestStore } = require("../config/performanceLogging");

const ENABLED = String(process.env.API_TIMING_LOG || "1").trim() !== "0";

function timingLabel(name) {
  const store = getRequestStore();
  return store?.requestId ? `${name} ${store.requestId}` : name;
}

function timeStart(name) {
  if (!ENABLED) return null;
  const label = timingLabel(name);
  console.time(label);
  return label;
}

function timeEnd(label) {
  if (!ENABLED || !label) return;
  console.timeEnd(label);
}

module.exports = {
  timeStart,
  timeEnd,
  timingEnabled: ENABLED,
};
