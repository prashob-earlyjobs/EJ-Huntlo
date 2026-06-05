/** `APP_ENV` — `production` (default) or `QA`. */
function getAppEnv() {
  const raw = String(process.env.APP_ENV || "production").trim();
  return raw.toUpperCase() === "QA" ? "QA" : "production";
}

function isQaEnv() {
  return getAppEnv() === "QA";
}

module.exports = {
  getAppEnv,
  isQaEnv,
};
