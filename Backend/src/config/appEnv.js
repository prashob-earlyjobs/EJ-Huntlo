/** `APP_ENV` — `production` (default), `QA`, or `dev`. Falls back to `dev` when NODE_ENV is development. */
function normalizeAppEnv(raw) {
  const key = String(raw || "").trim().toLowerCase();
  if (key === "qa") return "QA";
  if (key === "dev" || key === "development") return "dev";
  return "production";
}

function getAppEnv() {
  const fromEnv = process.env.APP_ENV;
  if (fromEnv) return normalizeAppEnv(fromEnv);
  if (process.env.NODE_ENV === "development") return "dev";
  return "production";
}

function isQaEnv() {
  return getAppEnv() === "QA";
}

/** Sub-hour sequence waits (minutes) — enabled in QA and dev. */
function allowsSubHourWaits() {
  const env = getAppEnv();
  return env === "QA" || env === "dev";
}

module.exports = {
  getAppEnv,
  isQaEnv,
  allowsSubHourWaits,
};
