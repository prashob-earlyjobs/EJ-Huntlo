const { ImapFlow } = require("imapflow");

/**
 * ImapFlow emits async `error` events (timeouts, auth failures) that crash Node
 * if unhandled. Always use this helper instead of `new ImapFlow()` directly.
 */
function createSafeImapClient(options) {
  const client = new ImapFlow({ ...options, logger: false });
  client.on("error", () => {
    // Swallow — callers handle connect/fetch failures in try/catch.
  });
  return client;
}

async function closeImapClient(client, connected) {
  if (!client) return;
  try {
    if (connected) {
      await client.logout();
      return;
    }
    if (typeof client.close === "function") {
      await client.close();
    }
  } catch {
    // Connection may already be closed after timeout/auth failure.
  }
}

module.exports = {
  createSafeImapClient,
  closeImapClient,
};
