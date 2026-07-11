const { outlookGraphFetch } = require("./outlookMailClient");
const { parseEmailAddress, stripHtml } = require("./gmailReadService");

function stripOutlookIdPrefix(id) {
  return String(id || "")
    .trim()
    .replace(/^outlook:/, "");
}

function normalizeOutlookMessage(row, { userEmail, contactEmail, threadId }) {
  const messageId = String(row?.id || "").trim();
  if (!messageId) return null;

  const fromEmail = parseEmailAddress(row.from?.emailAddress?.address || "");
  const toEmail = parseEmailAddress(row.toRecipients?.[0]?.emailAddress?.address || "");
  const userNorm = parseEmailAddress(userEmail);
  const contactNorm = parseEmailAddress(contactEmail);

  const bodyContent = String(row.body?.content || "").trim();
  const isHtml = String(row.body?.contentType || "").toLowerCase() === "html";
  const bodyText = isHtml ? stripHtml(bodyContent) : bodyContent;
  const bodyHtml = isHtml ? bodyContent : "";

  const isFromCandidate =
    Boolean(contactNorm) && fromEmail === contactNorm && fromEmail !== userNorm;

  return {
    gmailMessageId: messageId,
    gmailThreadId: String(threadId || row.conversationId || messageId),
    rfcMessageId: String(row.internetMessageId || "").trim(),
    fromEmail,
    toEmail,
    subject: String(row.subject || "").trim(),
    snippet: bodyText.slice(0, 240),
    bodyText,
    bodyHtml,
    receivedAt: row.receivedDateTime ? new Date(row.receivedDateTime) : new Date(),
    isFromCandidate,
  };
}

async function resolveOutlookThreadIdFromMessage(integrationDoc, messageId) {
  const id = stripOutlookIdPrefix(messageId);
  if (!id) return "";

  try {
    const data = await outlookGraphFetch(
      integrationDoc,
      `/me/messages/${encodeURIComponent(id)}?$select=id,conversationId`
    );
    return String(data.conversationId || id).trim();
  } catch {
    return id;
  }
}

async function fetchOutlookMessagesByConversation(integrationDoc, conversationId) {
  const convId = stripOutlookIdPrefix(conversationId);
  if (!convId) return [];

  const escaped = convId.replace(/'/g, "''");
  const filter = encodeURIComponent(`conversationId eq '${escaped}'`);
  const data = await outlookGraphFetch(
    integrationDoc,
    `/me/messages?$filter=${filter}&$top=50&$orderby=receivedDateTime asc&$select=id,conversationId,subject,body,from,toRecipients,receivedDateTime,internetMessageId`
  );

  return Array.isArray(data?.value) ? data.value : [];
}

async function searchOutlookMessagesByContact(integrationDoc, contactEmail, since) {
  const contact = String(contactEmail || "").trim();
  if (!contact.includes("@")) return [];

  const sinceIso = since instanceof Date ? since.toISOString() : new Date(since).toISOString();
  const escaped = contact.replace(/'/g, "''");
  const filter = encodeURIComponent(
    `(from/emailAddress/address eq '${escaped}' or toRecipients/any(r:r/emailAddress/address eq '${escaped}')) and receivedDateTime ge ${sinceIso}`
  );

  try {
    const data = await outlookGraphFetch(
      integrationDoc,
      `/me/messages?$filter=${filter}&$top=50&$orderby=receivedDateTime asc&$select=id,conversationId,subject,body,from,toRecipients,receivedDateTime,internetMessageId`
    );
    return Array.isArray(data?.value) ? data.value : [];
  } catch {
    return [];
  }
}

async function fetchOutlookThreadMessages(integrationDoc, enrollment, threadId) {
  const userEmail = String(integrationDoc.email || "").trim();
  const contactEmail = String(enrollment.contactEmail || "").trim();
  const since = enrollment.lastSentAt
    ? new Date(enrollment.lastSentAt)
    : new Date(Date.now() - 7 * 86_400_000);

  let raw = [];
  const convId = stripOutlookIdPrefix(threadId);
  if (convId) {
    raw = await fetchOutlookMessagesByConversation(integrationDoc, convId);
  }
  if (raw.length === 0) {
    raw = await searchOutlookMessagesByContact(integrationDoc, contactEmail, since);
  }

  const normalized = [];
  for (const row of raw) {
    const parsed = normalizeOutlookMessage(row, {
      userEmail,
      contactEmail,
      threadId: convId || row.conversationId,
    });
    if (parsed?.gmailMessageId) normalized.push(parsed);
  }

  normalized.sort((a, b) => a.receivedAt - b.receivedAt);
  return normalized;
}

module.exports = {
  fetchOutlookThreadMessages,
  resolveOutlookThreadIdFromMessage,
  normalizeOutlookMessage,
};
