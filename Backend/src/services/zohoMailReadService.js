const { ImapFlow } = require("imapflow");
const { getZohoDcConfig } = require("./zohoMailConfig");
const {
  zohoMailApiFetch,
  pickPrimaryZohoAccount,
} = require("./zohoMailClient");
const { parseEmailAddress, stripHtml } = require("./gmailReadService");

function parseZohoTimestamp(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return num > 1e12 ? new Date(num) : new Date(num * 1000);
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed) : new Date();
}

function normalizeZohoRow(row, { userEmail, contactEmail, threadId }) {
  const messageId = String(
    row.messageId || row.messageid || row.id || row.msgId || ""
  ).trim();
  if (!messageId) return null;

  const fromEmail = parseEmailAddress(
    row.fromAddress || row.sender || row.from || row.fromEmail || ""
  );
  const toEmail = parseEmailAddress(
    row.toAddress || row.to || row.toEmail || row.receiver || ""
  );
  const userNorm = parseEmailAddress(userEmail);
  const contactNorm = parseEmailAddress(contactEmail);

  const bodyText =
    String(row.content || row.summary || row.snippet || row.plainText || "").trim() ||
    stripHtml(String(row.html || row.bodyHtml || "")).trim();
  const bodyHtml = String(row.html || row.bodyHtml || "").trim();

  const isFromCandidate =
    Boolean(contactNorm) && fromEmail === contactNorm && fromEmail !== userNorm;

  return {
    gmailMessageId: messageId,
    gmailThreadId: String(threadId || messageId),
    rfcMessageId: String(row.messageIdHeader || row.rfcMessageId || "").trim(),
    fromEmail,
    toEmail,
    subject: String(row.subject || "").trim(),
    snippet: bodyText.slice(0, 240),
    bodyText,
    bodyHtml,
    receivedAt: parseZohoTimestamp(row.receivedTime || row.sentDateInGMT || row.date),
    isFromCandidate,
    _zohoFolderId: String(row.folderId || row.folderid || "").trim(),
    _zohoMessageId: messageId,
  };
}

async function ensureZohoAccountId(integrationDoc) {
  let accountId = String(integrationDoc.zohoAccountId || "").trim();
  if (accountId) return accountId;

  const account = await pickPrimaryZohoAccount(integrationDoc);
  accountId = String(account.accountId || account.accountid || "").trim();
  if (!accountId) {
    throw new Error("Could not resolve Zoho Mail account id for read sync.");
  }
  integrationDoc.zohoAccountId = accountId;
  if (!integrationDoc.email) {
    integrationDoc.email =
      account.primaryEmailAddress || account.emailAddress || integrationDoc.email;
  }
  await integrationDoc.save();
  return accountId;
}

async function fetchZohoMessageContent(integrationDoc, accountId, folderId, messageId) {
  if (!folderId || !messageId) return { bodyText: "", bodyHtml: "" };

  try {
    const data = await zohoMailApiFetch(
      integrationDoc,
      `/accounts/${accountId}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/content`
    );
    const content = data?.data?.content || data?.data?.mailContent || data?.content || "";
    const html = String(data?.data?.html || data?.html || "").trim();
    const text =
      String(content || "").trim() || stripHtml(html).trim();
    return { bodyText: text, bodyHtml: html };
  } catch {
    return { bodyText: "", bodyHtml: "" };
  }
}

async function searchZohoMessages(integrationDoc, accountId, contactEmail) {
  const contact = String(contactEmail || "").trim();
  if (!contact.includes("@")) return [];

  const searchKeys = [
    `from:${contact}`,
    `to:${contact}`,
    `"${contact}"`,
  ];

  const merged = new Map();
  for (const searchKey of searchKeys) {
    try {
      const data = await zohoMailApiFetch(
        integrationDoc,
        `/accounts/${accountId}/messages/search?searchKey=${encodeURIComponent(searchKey)}&limit=40`
      );
      const rows = Array.isArray(data?.data) ? data.data : [];
      for (const row of rows) {
        const id = String(row.messageId || row.messageid || row.id || "").trim();
        if (id && !merged.has(id)) merged.set(id, row);
      }
    } catch {
      /* try next search key */
    }
  }

  if (merged.size > 0) {
    return Array.from(merged.values());
  }

  try {
    const foldersData = await zohoMailApiFetch(integrationDoc, `/accounts/${accountId}/folders`);
    const folders = Array.isArray(foldersData?.data) ? foldersData.data : [];
    const inbox =
      folders.find((f) => String(f.folderName || f.name || "").toLowerCase() === "inbox") ||
      folders[0];
    const folderId = String(inbox?.folderId || inbox?.id || "").trim();
    if (!folderId) return [];

    const viewData = await zohoMailApiFetch(
      integrationDoc,
      `/accounts/${accountId}/messages/view?folderId=${encodeURIComponent(folderId)}&start=1&limit=80`
    );
    const rows = Array.isArray(viewData?.data) ? viewData.data : [];
    const needle = contact.toLowerCase();
    return rows.filter((row) => {
      const from = String(row.fromAddress || row.sender || "").toLowerCase();
      const to = String(row.toAddress || row.to || "").toLowerCase();
      return from.includes(needle) || to.includes(needle);
    });
  } catch {
    return [];
  }
}

async function fetchZohoThreadMessagesOAuth(integrationDoc, enrollment, threadId) {
  const accountId = await ensureZohoAccountId(integrationDoc);
  const contactEmail = String(enrollment.contactEmail || "").trim();
  const userEmail = String(integrationDoc.email || "").trim();
  const since = enrollment.lastSentAt ? new Date(enrollment.lastSentAt) : null;

  const rawRows = await searchZohoMessages(integrationDoc, accountId, contactEmail);
  const normalized = [];

  for (const row of rawRows) {
    const parsed = normalizeZohoRow(row, {
      userEmail,
      contactEmail,
      threadId,
    });
    if (!parsed) continue;

    if (since && parsed.receivedAt < new Date(since.getTime() - 86_400_000)) {
      continue;
    }

    if (!parsed.bodyText && parsed._zohoFolderId && parsed._zohoMessageId) {
      const content = await fetchZohoMessageContent(
        integrationDoc,
        accountId,
        parsed._zohoFolderId,
        parsed._zohoMessageId
      );
      parsed.bodyText = content.bodyText || parsed.bodyText;
      parsed.bodyHtml = content.bodyHtml || parsed.bodyHtml;
      parsed.snippet = (parsed.bodyText || parsed.snippet).slice(0, 240);
    }

    const { _zohoFolderId, _zohoMessageId, ...clean } = parsed;
    normalized.push(clean);
  }

  normalized.sort((a, b) => a.receivedAt - b.receivedAt);
  return normalized;
}

async function fetchZohoThreadMessagesImap(integrationDoc, enrollment, threadId) {
  const dc = getZohoDcConfig(integrationDoc.zohoDataCenter || "com");
  const email = String(integrationDoc.email || "").trim();
  const appPassword = String(integrationDoc.refreshToken || "").trim();
  const contactEmail = String(enrollment.contactEmail || "").trim();
  const userEmail = email;
  const since = enrollment.lastSentAt
    ? new Date(enrollment.lastSentAt.getTime() - 86_400_000)
    : new Date(Date.now() - 30 * 86_400_000);

  const client = new ImapFlow({
    host: dc.imapHost,
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  const normalized = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({
        or: [{ from: contactEmail }, { to: contactEmail }],
        since,
      });
      const uidList = Array.isArray(uids) ? uids.slice(-80) : [];
      if (uidList.length === 0) return [];

      for await (const msg of client.fetch(uidList, {
        envelope: true,
        source: true,
        uid: true,
      })) {
        const fromEmail = parseEmailAddress(msg.envelope?.from?.[0]?.address || "");
        const toEmail = parseEmailAddress(msg.envelope?.to?.[0]?.address || "");
        const subject = String(msg.envelope?.subject || "").trim();
        const receivedAt = msg.envelope?.date ? new Date(msg.envelope.date) : new Date();
        const rfcMessageId = String(msg.envelope?.messageId || "").trim();

        let bodyText = "";
        if (msg.source) {
          const { extractPlainTextFromMimeSource } = require("./emailMimeBodyUtils");
          bodyText = extractPlainTextFromMimeSource(msg.source);
        }

        const contactNorm = parseEmailAddress(contactEmail);
        const userNorm = parseEmailAddress(userEmail);
        const isFromCandidate =
          Boolean(contactNorm) && fromEmail === contactNorm && fromEmail !== userNorm;

        normalized.push({
          gmailMessageId: `zoho-imap:${msg.uid}`,
          gmailThreadId: String(threadId || `zoho-imap:${msg.uid}`),
          rfcMessageId,
          fromEmail,
          toEmail,
          subject,
          snippet: bodyText.slice(0, 240),
          bodyText,
          bodyHtml: "",
          receivedAt,
          isFromCandidate,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }

  normalized.sort((a, b) => a.receivedAt - b.receivedAt);
  return normalized;
}

async function fetchZohoThreadMessages(integrationDoc, enrollment, threadId) {
  if (integrationDoc.zohoAuthMode === "smtp") {
    return fetchZohoThreadMessagesImap(integrationDoc, enrollment, threadId);
  }
  return fetchZohoThreadMessagesOAuth(integrationDoc, enrollment, threadId);
}

async function resolveZohoThreadIdFromMessage(_integrationDoc, messageId) {
  const id = String(messageId || "")
    .trim()
    .replace(/^zoho:/, "")
    .replace(/^zoho-imap:/, "")
    .replace(/^smtp-/, "");
  return id || "";
}

module.exports = {
  fetchZohoThreadMessages,
  resolveZohoThreadIdFromMessage,
  normalizeZohoRow,
};
