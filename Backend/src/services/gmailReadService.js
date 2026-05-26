const { gmailApiFetch } = require("./gmailClient");

function decodeBase64Url(data) {
  if (!data) return "";
  const normalized = String(data).replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf-8");
}

function getHeader(headers, name) {
  const list = Array.isArray(headers) ? headers : [];
  const row = list.find((h) => String(h.name || "").toLowerCase() === name.toLowerCase());
  return row?.value ? String(row.value) : "";
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTextMime(mime) {
  const m = String(mime || "").toLowerCase();
  return m.includes("text/plain") || m.includes("text/html");
}

async function fetchAttachmentBody(userId, messageId, attachmentId) {
  const mid = String(messageId || "").trim();
  const aid = String(attachmentId || "").trim();
  if (!mid || !aid) return "";

  try {
    const { data } = await gmailApiFetch(
      userId,
      `/messages/${encodeURIComponent(mid)}/attachments/${encodeURIComponent(aid)}`
    );
    return decodeBase64Url(data.data || "");
  } catch {
    return "";
  }
}

/**
 * Walk MIME tree; fetch inline body data and text/* attachment parts.
 */
async function extractBodyFromPayload(userId, messageId, payload) {
  const plainParts = [];
  const htmlParts = [];

  async function walk(part) {
    if (!part) return;
    const mime = String(part.mimeType || "").toLowerCase();

    if (part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (mime.includes("text/plain")) plainParts.push(decoded);
      else if (mime.includes("text/html")) htmlParts.push(decoded);
      else if (!part.parts?.length && decoded.trim()) {
        plainParts.push(decoded);
      }
    } else if (part.body?.attachmentId && isTextMime(mime)) {
      const decoded = await fetchAttachmentBody(
        userId,
        messageId,
        part.body.attachmentId
      );
      if (mime.includes("text/plain")) plainParts.push(decoded);
      else if (mime.includes("text/html")) htmlParts.push(decoded);
    }

    for (const child of part.parts || []) {
      await walk(child);
    }
  }

  await walk(payload);

  const text = plainParts.map((s) => s.trim()).filter(Boolean).join("\n\n");
  const html = htmlParts.map((s) => s.trim()).filter(Boolean).join("\n\n");

  return { text, html };
}

function parseEmailAddress(headerValue) {
  const raw = String(headerValue || "").trim();
  if (!raw) return "";
  const bracket = raw.match(/<([^>]+)>/);
  if (bracket?.[1]) return bracket[1].trim().toLowerCase();
  const plain = raw.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return plain ? plain[0].trim().toLowerCase() : raw.toLowerCase();
}

async function normalizeMessage(userId, msg, { userEmail, contactEmail }) {
  const headers = msg.payload?.headers || [];
  const fromRaw = getHeader(headers, "From");
  const toRaw = getHeader(headers, "To");
  const fromEmail = parseEmailAddress(fromRaw);
  const toEmail = parseEmailAddress(toRaw);
  const gmailMessageId = String(msg.id || "");

  const { text, html } = await extractBodyFromPayload(
    userId,
    gmailMessageId,
    msg.payload
  );

  let bodyText = text.trim() || stripHtml(html).trim() || String(msg.snippet || "").trim();
  const bodyHtml = html.trim();

  if (!bodyText && gmailMessageId) {
    try {
      const { data } = await gmailApiFetch(
        userId,
        `/messages/${encodeURIComponent(gmailMessageId)}`,
        { format: "full" }
      );
      const retry = await extractBodyFromPayload(userId, gmailMessageId, data.payload);
      bodyText =
        retry.text.trim() ||
        stripHtml(retry.html).trim() ||
        String(data.snippet || msg.snippet || "").trim();
    } catch {
      /* keep snippet fallback */
    }
  }

  const userNorm = parseEmailAddress(userEmail);
  const contactNorm = parseEmailAddress(contactEmail);
  const isFromCandidate =
    Boolean(contactNorm) &&
    fromEmail === contactNorm &&
    fromEmail !== userNorm;

  const internalMs = Number(msg.internalDate);
  const receivedAt = Number.isFinite(internalMs)
    ? new Date(internalMs)
    : new Date();

  const rfcMessageId = getHeader(headers, "Message-ID").trim();

  return {
    gmailMessageId,
    gmailThreadId: String(msg.threadId || ""),
    rfcMessageId,
    fromEmail,
    toEmail,
    fromRaw,
    subject: getHeader(headers, "Subject"),
    snippet: String(msg.snippet || bodyText.slice(0, 240)).trim(),
    bodyText,
    bodyHtml,
    receivedAt,
    isFromCandidate,
  };
}

async function fetchThreadMessages(userId, threadId) {
  const id = String(threadId || "").trim();
  if (!id) return [];

  const { data } = await gmailApiFetch(userId, `/threads/${encodeURIComponent(id)}`, {
    format: "full",
  });

  const messages = Array.isArray(data.messages) ? data.messages : [];
  return messages;
}

async function resolveThreadIdFromMessage(userId, messageId) {
  const id = String(messageId || "").trim();
  if (!id) return "";

  const { data } = await gmailApiFetch(
    userId,
    `/messages/${encodeURIComponent(id)}`,
    { format: "metadata" }
  );
  return String(data.threadId || "").trim();
}

module.exports = {
  fetchThreadMessages,
  resolveThreadIdFromMessage,
  normalizeMessage,
  parseEmailAddress,
  stripHtml,
  extractBodyFromPayload,
};
