const { getMetaGraphBaseUrl } = require("./metaWhatsAppConfig");
const { normalizeToMetaRecipient } = require("./whatsappPhoneUtils");
const {
  getWhatsAppMetaTemplateBodyFields,
  resolveMetaTemplateName,
} = require("../constants/whatsappMetaTemplates");
const { buildReplacementMap, buildWhatsAppReplacementMap } = require("./outreachMergeService");

/** Dev-only override: META_WHATSAPP_FORCE_TEST_TEMPLATE=true */
const META_TEST_TEMPLATE_NAME = "hello_world";
const META_TEST_TEMPLATE_LANGUAGE = "en";

function getTemplateLanguageCode() {
  const raw = String(process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "en").trim();
  return raw || "en";
}

function lookupReplacementValue(key, replacements) {
  const normalized = String(key || "").replace(/\s+/g, "");
  if (!normalized) return "";
  if (Object.prototype.hasOwnProperty.call(replacements, normalized)) {
    return replacements[normalized];
  }
  const lower = normalized.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(replacements, lower)) {
    return replacements[lower];
  }
  return "";
}

function buildTemplateBodyComponents(templateName, { contact, senderFirstName, campaign } = {}) {
  const fieldKeys = getWhatsAppMetaTemplateBodyFields(templateName);
  if (!fieldKeys?.length) return null;

  const replacements = campaign
    ? buildWhatsAppReplacementMap(contact, senderFirstName, campaign)
    : buildReplacementMap(contact, senderFirstName);
  const parameters = fieldKeys.map((key) => {
    const value = String(lookupReplacementValue(key, replacements) ?? "").trim() || "—";
    return { type: "text", text: value.slice(0, 1024) };
  });

  return [{ type: "body", parameters }];
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
  const code = err?.code;
  const details = String(err?.error_data?.details || err?.message || "");

  if (code === 132001) {
    const lang = getTemplateLanguageCode();
    return (
      `WhatsApp template not found for language "${lang}". In Meta Business Manager, open the template ` +
      `and confirm its exact name and language code (often en_US, not en), then set ` +
      `META_WHATSAPP_TEMPLATE_LANGUAGE in Backend/.env to match. ${details}`.trim()
    );
  }

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
async function sendMetaWhatsAppMessage(
  creds,
  { to, body, templateId, contact, senderFirstName, campaign }
) {
  const recipient = normalizeToMetaRecipient(to);
  if (!recipient || recipient.length < 10) {
    const err = new Error("Invalid recipient phone for Meta API.");
    err.statusCode = 400;
    throw err;
  }

  const text = String(body || "").trim();
  const rawTemplate = resolveMetaTemplateName(templateId);
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
    const components =
      templateName === META_TEST_TEMPLATE_NAME
        ? undefined
        : buildTemplateBodyComponents(templateName, { contact, senderFirstName, campaign });
    const template = {
      name: templateName,
      language: { code: languageCode },
    };
    if (components?.length) {
      template.components = components;
    }
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template,
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
