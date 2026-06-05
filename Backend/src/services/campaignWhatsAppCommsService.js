const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");
const CampaignWhatsAppThreadRead = require("../models/CampaignWhatsAppThreadRead");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const {
  findCampaignInScope,
  campaignOwnerUserId,
} = require("../utils/campaignScope");
const {
  loadAllContactsForCampaign,
  contactExistsInCampaign,
  findContactByCandidateKey,
} = require("./campaignContactService");

/** Meta customer care session — free-form text allowed after candidate's last message. */
const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function campaignOid(campaignId) {
  return new mongoose.Types.ObjectId(campaignId);
}

function formatContactFromCampaign(contact) {
  return {
    candidateKey: String(contact.candidateKey || "").trim(),
    name: String(contact.name || "").trim(),
    email: String(contact.email || "").trim(),
    phone: String(contact.phone || "").trim(),
    role: String(contact.role || "").trim(),
    company: String(contact.company || "").trim(),
    addedAt:
      contact.addedAt instanceof Date
        ? contact.addedAt.toISOString()
        : contact.addedAt
          ? String(contact.addedAt)
          : new Date().toISOString(),
  };
}

function deriveThreadStatus({ hasPhone, enrollment, messages }) {
  if (!hasPhone) return "no_phone";
  if (enrollment?.status === "skipped") return "no_phone";
  if (enrollment?.status === "failed") return "failed";
  const hasInbound = messages.some((m) => m.direction === "inbound");
  if (hasInbound) return "replied";
  const hasFailedMsg = messages.some((m) => m.status === "failed");
  if (hasFailedMsg && messages.length > 0) return "failed";
  if (messages.some((m) => m.direction === "outbound")) return "awaiting";
  if (enrollment?.status === "active" || enrollment?.status === "paused") return "awaiting";
  if (enrollment?.sentCount > 0) return "awaiting";
  return "awaiting";
}

function buildLastPreview(lastMessage, hasPhone) {
  if (!lastMessage) {
    return hasPhone ? "No messages yet" : "Phone number required";
  }
  const body = String(lastMessage.body || "").trim();
  const preview =
    lastMessage.direction === "inbound" ? body : body ? `You: ${body}` : "Message sent";
  if (preview.length <= 72) return preview;
  return `${preview.slice(0, 72)}…`;
}

function lastCandidateInboundMs(messages, enrollment) {
  let lastMs = 0;
  for (const m of messages) {
    if (m.direction !== "inbound") continue;
    const t = new Date(m.sentAt).getTime();
    if (Number.isFinite(t) && t > lastMs) lastMs = t;
  }
  if (enrollment?.lastReplyAt) {
    const t = new Date(enrollment.lastReplyAt).getTime();
    if (Number.isFinite(t) && t > lastMs) lastMs = t;
  }
  return lastMs;
}

function countUnreadInbound(messages, lastReadAt) {
  const inbound = messages.filter((m) => m.direction === "inbound");
  if (!lastReadAt) return inbound.length;

  const readMs = new Date(lastReadAt).getTime();
  if (!Number.isFinite(readMs)) return inbound.length;

  return inbound.filter((m) => {
    const sentMs = new Date(m.sentAt).getTime();
    return Number.isFinite(sentMs) && sentMs > readMs;
  }).length;
}

async function loadThreadReadMap(userId, campaignId) {
  const rows = await CampaignWhatsAppThreadRead.find({
    userId: userOid(userId),
    campaignId: campaignOid(campaignId),
  })
    .select("candidateKey lastReadAt")
    .lean();

  const map = new Map();
  for (const row of rows) {
    map.set(String(row.candidateKey || "").trim(), row.lastReadAt);
  }
  return map;
}

async function markCampaignWhatsAppThreadRead(actorUserId, campaignId, candidateKey) {
  const campaign = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaign);

  const key = String(candidateKey || "").trim();
  if (!key) {
    const err = new Error("candidateKey is required");
    err.statusCode = 400;
    throw err;
  }

  const hasContact = await contactExistsInCampaign(campaignId, key);
  if (!hasContact) {
    const err = new Error("Contact not found in this campaign");
    err.statusCode = 404;
    throw err;
  }

  const lastReadAt = new Date();
  await CampaignWhatsAppThreadRead.findOneAndUpdate(
    {
      userId: userOid(actorUserId),
      campaignId: campaign._id,
      candidateKey: key,
    },
    { $set: { lastReadAt } },
    { upsert: true, new: true }
  );

  const messages = await CampaignWhatsAppMessage.find({
    userId: userOid(ownerUserId),
    campaignId: campaign._id,
    candidateKey: key,
  })
    .sort({ sentAt: 1 })
    .lean();

  const formatted = messages.map(formatMessageRow);
  return {
    candidateKey: key,
    lastReadAt: lastReadAt.toISOString(),
    unreadCount: countUnreadInbound(formatted, lastReadAt),
  };
}

function computeSessionWindow(messages, enrollment) {
  const lastInboundMs = lastCandidateInboundMs(messages, enrollment);
  if (!lastInboundMs) {
    return { canReply: false, expiresAt: null };
  }
  const expiresMs = lastInboundMs + WHATSAPP_SESSION_WINDOW_MS;
  return {
    canReply: Date.now() < expiresMs,
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

function parsePositiveInt(value, fallback, max = 100) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function formatMessageRow(doc) {
  return {
    id: String(doc._id),
    direction: doc.direction,
    body: doc.body || "",
    sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : new Date().toISOString(),
    status: doc.status || "sent",
    sequenceStep: doc.sequenceStepLabel || "",
    provider: doc.provider || "",
    externalMessageId: doc.externalMessageId || "",
    errorMessage: doc.errorMessage || "",
  };
}

/**
 * Persist an outbound (or failed) WhatsApp message for the campaign inbox.
 */
async function logCampaignWhatsAppMessage({
  userId,
  campaignId,
  enrollmentId,
  candidateKey,
  contactPhone,
  direction,
  body,
  sequenceStepOrder,
  sequenceStepLabel,
  provider,
  externalMessageId,
  status,
  errorMessage,
  sentAt,
}) {
  const doc = await CampaignWhatsAppMessage.create({
    userId: userOid(userId),
    campaignId: campaignOid(campaignId),
    enrollmentId: enrollmentId ? new mongoose.Types.ObjectId(enrollmentId) : null,
    candidateKey: String(candidateKey || "").trim(),
    contactPhone: String(contactPhone || "").trim(),
    direction: direction === "inbound" ? "inbound" : "outbound",
    body: String(body || "").trim(),
    sequenceStepOrder:
      sequenceStepOrder != null && Number.isFinite(Number(sequenceStepOrder))
        ? Number(sequenceStepOrder)
        : null,
    sequenceStepLabel: String(sequenceStepLabel || "").trim(),
    provider: provider === "meta" ? provider : "",
    externalMessageId: String(externalMessageId || "").trim(),
    status: status || "sent",
    errorMessage: String(errorMessage || "").trim(),
    sentAt: sentAt ? new Date(sentAt) : new Date(),
  });
  return doc;
}

async function deleteWhatsAppMessagesForCampaign(campaignId) {
  await CampaignWhatsAppMessage.deleteMany({
    campaignId: campaignOid(campaignId),
  });
}

/**
 * List WhatsApp conversation threads for a campaign (contacts + enrollments + message log).
 */
async function getCampaignWhatsAppConversations(actorUserId, campaignId, options = {}) {
  const threadPage = parsePositiveInt(options.threadPage, 1, 10_000);
  const threadPageSize = parsePositiveInt(options.threadPageSize, 25, 200);
  const messagePageSize = parsePositiveInt(options.messagePageSize, 30, 200);
  const campaign = await findCampaignInScope(actorUserId, campaignId);

  const cid = campaign._id;
  const ownerUserId = campaignOwnerUserId(campaign);
  const ownerOid = userOid(ownerUserId);

  const [enrollments, messageDocs, readByKey] = await Promise.all([
    CampaignSequenceEnrollment.find({ campaignId: cid, userId: ownerOid }).lean(),
    CampaignWhatsAppMessage.find({ campaignId: cid, userId: ownerOid })
      .sort({ sentAt: 1 })
      .lean(),
    loadThreadReadMap(actorUserId, campaignId),
  ]);

  const enrollmentByKey = new Map();
  for (const row of enrollments) {
    enrollmentByKey.set(row.candidateKey, row);
  }

  const messagesByKey = new Map();
  for (const doc of messageDocs) {
    const key = doc.candidateKey;
    if (!messagesByKey.has(key)) messagesByKey.set(key, []);
    messagesByKey.get(key).push(formatMessageRow(doc));
  }

  const contacts = await loadAllContactsForCampaign(campaignId);
  const allThreads = contacts.map((raw) => {
    const contact = formatContactFromCampaign(raw);
    const key = contact.candidateKey;
    const enrollment = enrollmentByKey.get(key);
    const fullMessages = messagesByKey.get(key) || [];
    const hasPhone = Boolean(contact.phone.trim());
    const threadStatus = deriveThreadStatus({ hasPhone, enrollment, messages: fullMessages });
    const lastMessage = fullMessages.length > 0 ? fullMessages[fullMessages.length - 1] : null;
    const lastReadAt = readByKey.get(key);
    const unreadCount = countUnreadInbound(fullMessages, lastReadAt);
    const messageCount = fullMessages.length;
    const messages = fullMessages.slice(-messagePageSize);

    return {
      contactKey: key,
      contact,
      messages,
      messageCount,
      hasMoreMessages: messageCount > messages.length,
      lastReadAt: lastReadAt ? new Date(lastReadAt).toISOString() : null,
      sessionWindow: computeSessionWindow(fullMessages, enrollment),
      lastPreview: buildLastPreview(lastMessage, hasPhone),
      lastTimeLabel: lastMessage?.sentAt || contact.addedAt,
      unreadCount,
      threadStatus,
      enrollment: enrollment
        ? {
            status: enrollment.status,
            currentStepOrder: enrollment.currentStepOrder || 1,
            sentCount: enrollment.sentCount || 0,
            lastError: enrollment.lastError || "",
            nextSendAt: enrollment.nextSendAt
              ? new Date(enrollment.nextSendAt).toISOString()
              : null,
          }
        : null,
    };
  });

  allThreads.sort((a, b) => {
    const ta = new Date(a.lastTimeLabel).getTime();
    const tb = new Date(b.lastTimeLabel).getTime();
    return tb - ta;
  });

  const threadCount = allThreads.length;
  const start = (threadPage - 1) * threadPageSize;
  const end = start + threadPageSize;
  const threads = allThreads.slice(start, end);

  return {
    campaignId: String(campaign._id),
    outreachStatus: campaign.outreachStatus || "idle",
    outreachChannel: campaign.outreachChannel || "whatsapp",
    threadCount,
    threadPage,
    threadPageSize,
    hasMoreThreads: end < threadCount,
    threads,
  };
}

async function getCampaignWhatsAppThreadMessages(
  actorUserId,
  campaignId,
  candidateKey,
  options = {}
) {
  const page = parsePositiveInt(options.page, 1, 10_000);
  const pageSize = parsePositiveInt(options.pageSize, 30, 200);
  const key = String(candidateKey || "").trim();
  if (!key) {
    const err = new Error("candidateKey is required");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaign);

  const hasContact = await contactExistsInCampaign(campaignId, key);
  if (!hasContact) {
    const err = new Error("Contact not found in this campaign");
    err.statusCode = 404;
    throw err;
  }

  const filter = {
    userId: userOid(ownerUserId),
    campaignId: campaignOid(campaignId),
    candidateKey: key,
  };
  const skip = (page - 1) * pageSize;
  const [totalMessages, messageDocs] = await Promise.all([
    CampaignWhatsAppMessage.countDocuments(filter),
    CampaignWhatsAppMessage.find(filter).sort({ sentAt: -1 }).skip(skip).limit(pageSize).lean(),
  ]);
  const messages = messageDocs.map(formatMessageRow).reverse();

  return {
    candidateKey: key,
    page,
    pageSize,
    totalMessages,
    hasMore: page * pageSize < totalMessages,
    messages,
  };
}

async function sendCampaignWhatsAppSessionMessage(actorUserId, campaignId, candidateKey, body) {
  const text = String(body || "").trim();
  if (!text) {
    const err = new Error("Message cannot be empty.");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaign);

  const key = String(candidateKey || "").trim();
  if (!key) {
    const err = new Error("candidateKey is required");
    err.statusCode = 400;
    throw err;
  }

  const rawContact = await findContactByCandidateKey(campaignId, key);
  if (!rawContact) {
    const err = new Error("Contact not found in this campaign");
    err.statusCode = 404;
    throw err;
  }

  const contact = formatContactFromCampaign(rawContact);
  const phone = contact.phone.trim();
  if (!phone) {
    const err = new Error("Contact has no phone number");
    err.statusCode = 400;
    throw err;
  }

  const enrollment = await CampaignSequenceEnrollment.findOne({
    campaignId: campaign._id,
    userId: userOid(ownerUserId),
    candidateKey: key,
  }).lean();

  const priorMessages = await CampaignWhatsAppMessage.find({
    campaignId: campaign._id,
    userId: userOid(ownerUserId),
    candidateKey: key,
  })
    .sort({ sentAt: 1 })
    .lean();

  const formattedPrior = priorMessages.map(formatMessageRow);
  const sessionWindow = computeSessionWindow(formattedPrior, enrollment);
  if (!sessionWindow.canReply) {
    const err = new Error(
      "The 24-hour reply window has expired. Wait for the candidate to message again, or use an approved template from your outreach sequence."
    );
    err.statusCode = 400;
    throw err;
  }

  const sentAt = new Date();
  let sendResult;
  try {
    sendResult = await sendWhatsAppSessionMessage(ownerUserId, { to: phone, body: text });
  } catch (sendError) {
    await logCampaignWhatsAppMessage({
      userId: ownerUserId,
      campaignId,
      enrollmentId: enrollment?._id,
      candidateKey: key,
      contactPhone: phone,
      direction: "outbound",
      body: text,
      sequenceStepOrder: null,
      sequenceStepLabel: "",
      provider: "meta",
      externalMessageId: "",
      status: "failed",
      errorMessage: sendError?.message || "Send failed",
      sentAt,
    });
    throw sendError;
  }

  const doc = await logCampaignWhatsAppMessage({
    userId: ownerUserId,
    campaignId,
    enrollmentId: enrollment?._id,
    candidateKey: key,
    contactPhone: phone,
    direction: "outbound",
    body: text,
    sequenceStepOrder: null,
    sequenceStepLabel: "",
    provider: sendResult.provider || "meta",
    externalMessageId: sendResult.messageId || "",
    status: "sent",
    errorMessage: "",
    sentAt,
  });

  notifyCampaignThreadUpdated(String(ownerUserId), {
    campaignId: String(campaign._id),
    candidateKey: key,
    newMessages: 1,
    hasNewCandidateReply: false,
    source: "whatsapp_send",
  });

  const readState = await markCampaignWhatsAppThreadRead(actorUserId, campaignId, key);

  return {
    message: formatMessageRow(doc),
    sessionWindow: computeSessionWindow(
      [...formattedPrior, formatMessageRow(doc)],
      enrollment
    ),
    lastReadAt: readState.lastReadAt,
    unreadCount: readState.unreadCount,
  };
}

module.exports = {
  logCampaignWhatsAppMessage,
  deleteWhatsAppMessagesForCampaign,
  getCampaignWhatsAppConversations,
  getCampaignWhatsAppThreadMessages,
  sendCampaignWhatsAppSessionMessage,
  markCampaignWhatsAppThreadRead,
  computeSessionWindow,
  WHATSAPP_SESSION_WINDOW_MS,
};
