const { getOutlookIntegration, outlookGraphFetch } = require("./outlookMailClient");
const { bodyToHtml, bodyToPlainText } = require("./gmailSendService");

function stripOutlookIdPrefix(id) {
  return String(id || "")
    .trim()
    .replace(/^outlook:/, "");
}

async function sendOutlookMessage(userId, payload, options = {}) {
  const { to, subject, body, threadId, inReplyTo, references } = payload || {};
  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const mailBody = String(body || "").trim();
  const integration =
    options.integration || (await getOutlookIntegration(userId, options.integrationId));

  if (!recipient.includes("@")) {
    const err = new Error("A valid recipient email is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!mailSubject || !mailBody) {
    const err = new Error("Subject and message body are required.");
    err.statusCode = 400;
    throw err;
  }

  const html = bodyToHtml(mailBody);
  const text = bodyToPlainText(mailBody);
  const contentType = html ? "HTML" : "Text";
  const content = html || text || " ";

  const replyMessageId = stripOutlookIdPrefix(threadId || inReplyTo || "");
  if (inReplyTo && replyMessageId) {
    const draft = await outlookGraphFetch(
      integration,
      `/me/messages/${encodeURIComponent(replyMessageId)}/createReply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            body: { contentType, content },
          },
        }),
      }
    );

    const draftId = String(draft?.id || "").trim();
    if (!draftId) {
      throw new Error("Failed to create Outlook reply draft.");
    }

    await outlookGraphFetch(integration, `/me/messages/${encodeURIComponent(draftId)}/send`, {
      method: "POST",
    });

    return {
      messageId: draftId,
      threadId: String(draft.conversationId || replyMessageId),
      fromEmail: integration.email || "",
      to: recipient,
    };
  }

  const messagePayload = {
    subject: mailSubject,
    body: { contentType, content },
    toRecipients: [{ emailAddress: { address: recipient } }],
  };

  if (inReplyTo) {
    messagePayload.internetMessageHeaders = [
      { name: "In-Reply-To", value: String(inReplyTo).trim() },
      { name: "References", value: String(references || inReplyTo).trim() },
    ];
  }

  const draft = await outlookGraphFetch(integration, "/me/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messagePayload),
  });

  const draftId = String(draft?.id || "").trim();
  if (!draftId) {
    throw new Error("Failed to create Outlook message draft.");
  }

  await outlookGraphFetch(integration, `/me/messages/${encodeURIComponent(draftId)}/send`, {
    method: "POST",
  });

  return {
    messageId: draftId,
    threadId: String(draft.conversationId || draftId),
    fromEmail: integration.email || "",
    to: recipient,
  };
}

module.exports = {
  sendOutlookMessage,
};
