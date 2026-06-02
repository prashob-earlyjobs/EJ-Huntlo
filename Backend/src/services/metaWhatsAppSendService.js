const { getMetaGraphBaseUrl } = require("./metaWhatsAppConfig");
const { normalizeToMetaRecipient } = require("./whatsappPhoneUtils");

/** Dev-only override: META_WHATSAPP_FORCE_TEST_TEMPLATE=true */
const META_TEST_TEMPLATE_NAME = "hello_world";
const META_TEST_TEMPLATE_LANGUAGE = "en_US";

function getTemplateLanguageCode() {
  return String(process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "en").trim() || "en";
}

function forceTestTemplate() {
  return String(process.env.META_WHATSAPP_FORCE_TEST_TEMPLATE || "")
    .trim()
    .toLowerCase() === "true";
}

/** Meta template names: lowercase letters, numbers, underscores. */
function isMetaTemplateName(value) {
  const name = String(value || "").trim();
  return /^[a-z][a-z0-9_]{0,511}$/i.test(name);
}

function parseMetaSendError(payload, status) {
  const err = payload?.error;
  if (err?.message) return String(err.message);
  if (err?.error_user_msg) return String(err.error_user_msg);
  if (status === 401 || status === 403) return "Invalid Meta access token or permissions.";
  return "Meta WhatsApp send failed.";
}

async function postMetaWhatsAppPayload(creds, payload) {
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

/**
 * Free-form text inside Meta's 24-hour customer care window (after candidate replied).
 */
async function sendMetaWhatsAppSessionText(creds, { to, body }) {
  const recipient = normalizeToMetaRecipient(to);
  if (!recipient || recipient.length < 10) {
    const err = new Error("Invalid recipient phone for Meta API.");
    err.statusCode = 400;
    throw err;
  }

  const text = String(body || "").trim();
  if (!text) {
    const err = new Error("Message body is empty.");
    err.statusCode = 400;
    throw err;
  }

  return postMetaWhatsAppPayload(creds, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { preview_url: false, body: text },
  });
}

/**
 * Campaign / sequence send: approved template (cold) or session text when allowed.
 * templateId must match an approved template name in the user's Meta Business account.
 */
async function sendMetaWhatsAppMessage(creds, { to, body, templateId }) {
  const recipient = normalizeToMetaRecipient(to);
  if (!recipient || recipient.length < 10) {
    const err = new Error("Invalid recipient phone for Meta API.");
    err.statusCode = 400;
    throw err;
  }

  const text = String(body || "").trim();
  const rawTemplate = String(templateId || "").trim();
  const templateName = forceTestTemplate()
    ? META_TEST_TEMPLATE_NAME
    : isMetaTemplateName(rawTemplate)
      ? rawTemplate
      : "";

  let payload;

  if (templateName) {
    const languageCode =
      templateName === META_TEST_TEMPLATE_NAME
        ? META_TEST_TEMPLATE_LANGUAGE
        : getTemplateLanguageCode();
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };
  } else if (text) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { preview_url: false, body: text },
    };
  } else {
    const err = new Error(
      "WhatsApp step needs an approved Meta template name (templateId) or message body."
    );
    err.statusCode = 400;
    throw err;
  }

  return postMetaWhatsAppPayload(creds, payload);
}

module.exports = {
  sendMetaWhatsAppMessage,
  sendMetaWhatsAppSessionText,
  isMetaTemplateName,
  forceTestTemplate,
};
