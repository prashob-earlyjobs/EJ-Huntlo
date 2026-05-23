/**
 * Platform-managed Gupshup credentials (Huntlo WhatsApp mode).
 * Set in Backend/.env — never exposed to the client.
 */
function getHuntloGupshupConfig() {
  const userId = process.env.GUPSHUP_USER_ID?.trim();
  const password = process.env.GUPSHUP_PASSWORD?.trim();
  const appName = process.env.GUPSHUP_APP_NAME?.trim() || "";
  const sourceNumber = process.env.GUPSHUP_SOURCE_NUMBER?.trim() || "";

  if (!userId || !password) {
    return null;
  }

  return { userId, password, appName, sourceNumber };
}

function isHuntloGupshupConfigured() {
  return Boolean(getHuntloGupshupConfig());
}

module.exports = {
  getHuntloGupshupConfig,
  isHuntloGupshupConfigured,
};
