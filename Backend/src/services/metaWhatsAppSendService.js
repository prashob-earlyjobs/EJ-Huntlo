const { getMetaGraphBaseUrl } = require("./metaWhatsAppConfig");
const { normalizeToMetaRecipient } = require("./whatsappPhoneUtils");

function getTemplateLanguageCode() {
  return String(process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "en").trim() || "en";
}

function parseMetaSendError(payload, status) {
  const err = payload?.error;
  if (err?.message) return String(err.message);
  if (err?.error_user_msg) return String(err.error_user_msg);
  if (status === 401 || status === 403) return "Invalid Meta access token or permissions.";
  return "Meta WhatsApp send failed.";
}

/**
 * Send WhatsApp message via Meta Cloud API.
 */
async function sendMetaWhatsAppMessage(creds, { to, body, templateId }) {
  const recipient = normalizeToMetaRecipient(to);
  if (!recipient || recipient.length < 10) {
    const err = new Error("Invalid recipient phone for Meta API.");
    err.statusCode = 400;
    throw err;
  }

  const templateName = String(templateId || "").trim();
  let payload;

  if (templateName) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: getTemplateLanguageCode() },
      },
    };
  } else {
    const text = String(body || "").trim();
    if (!text) {
      const err = new Error("Message body is empty.");
      err.statusCode = 400;
      throw err;
    }
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { preview_url: false, body: text },
    };
  }

  const url = `${getMetaGraphBaseUrl()}/${encodeURIComponent(creds.phoneNumberId)}/messages`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(parseMetaSendError(data, res.status));
      err.statusCode = res.status === 401 || res.status === 403 ? 400 : res.status >= 500 ? 502 : 400;
      throw err;
    }

    const messageId =
      Array.isArray(data?.messages) && data.messages[0]?.id
        ? String(data.messages[0].id)
        : "";

    return {
      provider: "meta",
      messageId,
      raw: data,
    };
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.name === "AbortError") {
      const err = new Error("Meta API timed out.");
      err.statusCode = 504;
      throw err;
    }
    const err = new Error(error.message || "Meta send failed");
    err.statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendMetaWhatsAppMessage,
};
