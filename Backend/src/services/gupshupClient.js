const E164_RE = /^\+[1-9]\d{7,14}$/;

function normalizeGupshupSourceNumber(phoneE164) {
  const trimmed = String(phoneE164 || "").trim().replace(/\s/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
}

function assertE164(phone) {
  if (!E164_RE.test(phone)) {
    const err = new Error("Enter a valid phone number in E.164 format (e.g. +919876543210).");
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Best-effort Gupshup Enterprise auth check (plain userid + password).
 * Error code 102 = invalid userId or password.
 */
async function verifyGupshupCredentials(userId, password) {
  const params = new URLSearchParams({
    method: "SendMessage",
    userid: userId,
    password,
    send_to: "919000000000",
    msg: "auth_check",
    msg_type: "text",
    auth_scheme: "plain",
    v: "1.1",
    format: "json",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(
      `https://enterprise.smsgupshup.com/GatewayAPI/rest?${params.toString()}`,
      { method: "GET", signal: controller.signal }
    );
    const text = await res.text();

    if (
      /error\s*\|\s*102/i.test(text) ||
      /Authentication failed/i.test(text) ||
      /invalid userId or password/i.test(text)
    ) {
      const err = new Error("Invalid Gupshup user ID or password.");
      err.statusCode = 400;
      throw err;
    }

    return { verified: true };
  } catch (error) {
    if (error.statusCode === 400) throw error;
    if (error.name === "AbortError") {
      return { verified: false, skipped: true };
    }
    return { verified: false, skipped: true };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  assertE164,
  normalizeGupshupSourceNumber,
  verifyGupshupCredentials,
  E164_RE,
};
