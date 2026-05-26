const { normalizeToGupshupSendTo } = require("./whatsappPhoneUtils");

const GUPSHUP_GATEWAY = "https://enterprise.smsgupshup.com/GatewayAPI/rest";

function parseGupshupResponse(text) {
  const raw = String(text || "").trim();
  if (!raw) return { ok: false, message: "Empty response from Gupshup" };

  if (/success/i.test(raw) && !/error/i.test(raw)) {
    const idMatch = raw.match(/id[:\s|]+([^\s|]+)/i);
    return { ok: true, messageId: idMatch ? idMatch[1] : "", raw };
  }

  if (/error/i.test(raw)) {
    const parts = raw.split("|").map((p) => p.trim());
    return { ok: false, message: parts[parts.length - 1] || raw, raw };
  }

  try {
    const json = JSON.parse(raw);
    if (json?.response?.status === "success" || json?.status === "success") {
      return {
        ok: true,
        messageId: String(json?.response?.id || json?.id || ""),
        raw,
      };
    }
    const msg =
      json?.response?.details ||
      json?.response?.status ||
      json?.message ||
      raw;
    return { ok: false, message: String(msg), raw };
  } catch {
    return { ok: true, messageId: "", raw };
  }
}

/**
 * Send WhatsApp message via Gupshup Enterprise gateway.
 */
async function sendGupshupWhatsAppMessage(creds, { to, body, templateId }) {
  const sendTo = normalizeToGupshupSendTo(to);
  if (!sendTo || sendTo.length < 10) {
    const err = new Error("Invalid recipient phone for Gupshup.");
    err.statusCode = 400;
    throw err;
  }

  const params = new URLSearchParams({
    method: "SendMessage",
    userid: creds.userId,
    password: creds.password,
    send_to: sendTo,
    v: "1.1",
    format: "json",
    auth_scheme: "plain",
  });

  if (creds.appName) {
    params.set("auth_scheme", "plain");
  }

  const templateName = String(templateId || "").trim();
  if (templateName) {
    params.set("msg_type", "HSM");
    params.set("isTemplate", "true");
    params.set("msg", templateName);
  } else {
    const text = String(body || "").trim();
    if (!text) {
      const err = new Error("Message body is empty.");
      err.statusCode = 400;
      throw err;
    }
    params.set("msg_type", "TEXT");
    params.set("msg", text);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${GUPSHUP_GATEWAY}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
    const text = await res.text();
    const parsed = parseGupshupResponse(text);

    if (!parsed.ok) {
      const err = new Error(parsed.message || "Gupshup send failed");
      err.statusCode = 502;
      throw err;
    }

    return {
      provider: "gupshup",
      messageId: parsed.messageId || "",
      raw: parsed.raw,
    };
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.name === "AbortError") {
      const err = new Error("Gupshup API timed out.");
      err.statusCode = 504;
      throw err;
    }
    const err = new Error(error.message || "Gupshup send failed");
    err.statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendGupshupWhatsAppMessage,
};
