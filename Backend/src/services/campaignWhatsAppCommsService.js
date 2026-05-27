const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const CampaignWhatsAppMessage = require("../models/CampaignWhatsAppMessage");

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
async function getCampaignWhatsAppConversations(userId, campaignId) {
  const campaign = await Campaign.findOne({
    _id: campaignOid(campaignId),
    userId: userOid(userId),
  }).lean();

  if (!campaign) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const cid = campaign._id;
  const uid = userOid(userId);

  const [enrollments, messageDocs] = await Promise.all([
    CampaignSequenceEnrollment.find({ campaignId: cid, userId: uid }).lean(),
    CampaignWhatsAppMessage.find({ campaignId: cid, userId: uid })
      .sort({ sentAt: 1 })
      .lean(),
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

  const contacts = Array.isArray(campaign.contacts) ? campaign.contacts : [];
  const threads = contacts.map((raw) => {
    const contact = formatContactFromCampaign(raw);
    const key = contact.candidateKey;
    const enrollment = enrollmentByKey.get(key);
    const messages = messagesByKey.get(key) || [];
    const hasPhone = Boolean(contact.phone.trim());
    const threadStatus = deriveThreadStatus({ hasPhone, enrollment, messages });
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const unreadCount = messages.filter((m) => m.direction === "inbound").length;

    return {
      contactKey: key,
      contact,
      messages,
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

  threads.sort((a, b) => {
    const ta = new Date(a.lastTimeLabel).getTime();
    const tb = new Date(b.lastTimeLabel).getTime();
    return tb - ta;
  });

  return {
    campaignId: String(campaign._id),
    outreachStatus: campaign.outreachStatus || "idle",
    outreachChannel: campaign.outreachChannel || "whatsapp",
    threadCount: threads.length,
    threads,
  };
}

module.exports = {
  logCampaignWhatsAppMessage,
  deleteWhatsAppMessagesForCampaign,
  getCampaignWhatsAppConversations,
};
