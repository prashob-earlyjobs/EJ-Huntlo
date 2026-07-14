const { parseEmailAddress } = require("./gmailReadService");
const { smtpConfigFromIntegrationDoc } = require("./customMailSmtpService");
const { extractPlainTextFromMimeSource } = require("./emailMimeBodyUtils");
const { createSafeImapClient, closeImapClient } = require("./imapClientUtils");

/** Map common SMTP hosts to IMAP (e.g. smtp.gmail.com → imap.gmail.com). */
function inferImapHost(smtpHost) {
  const host = String(smtpHost || "").trim().toLowerCase();
  if (!host) return "";
  if (host.startsWith("imap.")) return host;
  if (host.startsWith("smtp.")) return `imap.${host.slice(5)}`;
  if (host.includes("gmail") || host.includes("googlemail")) return "imap.gmail.com";
  return "";
}

function extractPlainBodyFromRawSource(source) {
  return extractPlainTextFromMimeSource(source);
}

/**
 * Read inbox via IMAP for custom SMTP integrations (Gmail app password, etc.).
 */
async function fetchCustomMailThreadMessages(integrationDoc, enrollment, threadId) {
  const config = smtpConfigFromIntegrationDoc(integrationDoc);
  const imapHost = inferImapHost(config.smtpHost);
  if (!imapHost) {
    console.warn(
      `[custom-mail-reply-sync] cannot infer IMAP host from SMTP host "${config.smtpHost}"`
    );
    return [];
  }

  const contactEmail = String(enrollment.contactEmail || "").trim();
  if (!contactEmail.includes("@")) return [];

  const userEmail = String(config.fromEmail || "").trim();
  const since = enrollment.lastSentAt
    ? new Date(enrollment.lastSentAt)
    : new Date(Date.now() - 7 * 86_400_000);

  const client = createSafeImapClient({
    host: imapHost,
    port: 993,
    secure: true,
    auth: { user: config.username, pass: config.password },
  });

  const normalized = [];
  let connected = false;
  let lock = null;
  try {
    await client.connect();
    connected = true;
    lock = await client.getMailboxLock("INBOX");
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
        const bodyText = extractPlainBodyFromRawSource(msg.source);

        const contactNorm = parseEmailAddress(contactEmail);
        const userNorm = parseEmailAddress(userEmail);
        const isFromCandidate =
          Boolean(contactNorm) && fromEmail === contactNorm && fromEmail !== userNorm;

        normalized.push({
          gmailMessageId: `smtp-imap:${msg.uid}`,
          gmailThreadId: String(threadId || `smtp-imap:${msg.uid}`),
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
      if (lock) lock.release();
    }
  } catch (err) {
    console.warn(
      `[custom-mail-reply-sync] IMAP ${imapHost} failed:`,
      err?.message || err
    );
    return [];
  } finally {
    await closeImapClient(client, connected);
  }

  normalized.sort((a, b) => a.receivedAt - b.receivedAt);
  return normalized;
}

function resolveCustomMailThreadIdFromMessage(messageId) {
  return String(messageId || "")
    .trim()
    .replace(/^smtp-imap:/, "")
    .replace(/^smtp-thread:/, "");
}

module.exports = {
  inferImapHost,
  fetchCustomMailThreadMessages,
  resolveCustomMailThreadIdFromMessage,
};
