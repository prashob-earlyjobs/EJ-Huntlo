const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const CampaignOutreachReply = require("../models/CampaignOutreachReply");
const OutreachPlan = require("../models/OutreachPlan");
const { applyMergeFields } = require("./outreachMergeService");
const { getGmailIntegration } = require("./gmailClient");
const {
  fetchThreadMessages,
  resolveThreadIdFromMessage,
  normalizeMessage,
} = require("./gmailReadService");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { maybeAutoReplyAfterCandidateMessage } = require("./campaignAutoReplyService");
const {
  findCampaignInScope,
  campaignOwnerUserId,
} = require("../utils/campaignScope");

const SYNC_BATCH_SIZE = Math.max(
  1,
  Math.min(30, Number(process.env.OUTREACH_REPLY_SYNC_BATCH_SIZE) || 15)
);

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

/** Gmail API message/thread ids — not Meta WhatsApp wamid.* values stored on WA enrollments. */
function looksLikeGmailResourceId(id) {
  const value = String(id || "").trim();
  if (!value) return false;
  if (/^wamid\./i.test(value)) return false;
  return true;
}

function isEmailEnrollmentForGmailSync(enrollment) {
  const email = String(enrollment?.contactEmail || "").trim();
  if (!email.includes("@")) return false;
  const threadId = String(enrollment?.lastThreadId || "").trim();
  const messageId = String(enrollment?.lastMessageId || "").trim();
  if (threadId && !looksLikeGmailResourceId(threadId)) return false;
  if (messageId && !looksLikeGmailResourceId(messageId)) return false;
  return Boolean(threadId || messageId);
}

function formatReply(doc) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(o._id),
    campaignId: String(o.campaignId),
    enrollmentId: String(o.enrollmentId),
    candidateKey: o.candidateKey || "",
    gmailThreadId: o.gmailThreadId || "",
    gmailMessageId: o.gmailMessageId || "",
    fromEmail: o.fromEmail || "",
    toEmail: o.toEmail || "",
    subject: o.subject || "",
    snippet: o.snippet || "",
    bodyText: o.bodyText || "",
    bodyHtml: o.bodyHtml || "",
    receivedAt: o.receivedAt,
    isFromCandidate: Boolean(o.isFromCandidate),
    createdAt: o.createdAt,
  };
}

async function ensureThreadId(enrollment, userId) {
  if (!isEmailEnrollmentForGmailSync(enrollment)) return "";

  const storedThreadId = String(enrollment.lastThreadId || "").trim();
  if (storedThreadId && looksLikeGmailResourceId(storedThreadId)) {
    return storedThreadId;
  }

  const messageId = String(enrollment.lastMessageId || "").trim();
  if (!messageId || !looksLikeGmailResourceId(messageId)) return "";

  try {
    const threadId = await resolveThreadIdFromMessage(userId, messageId);
    if (threadId) {
      await CampaignSequenceEnrollment.updateOne(
        { _id: enrollment._id },
        { $set: { lastThreadId: threadId } }
      );
      enrollment.lastThreadId = threadId;
    }
    return threadId || "";
  } catch (err) {
    console.warn(
      `[outreach-reply-sync] enrollment ${enrollment._id} could not resolve thread from message ${messageId}:`,
      err?.message || err
    );
    return "";
  }
}

/**
 * Store the merged outreach email we just sent (so thread UI has body before Gmail sync).
 */
async function recordOutboundSentMessage({
  enrollment,
  sendResult,
  subject,
  body,
  toEmail,
}) {
  const messageId = String(sendResult?.messageId || "").trim();
  const threadId = String(sendResult?.threadId || "").trim();
  if (!messageId) return;

  const now = new Date();
  const bodyText = String(body || "").trim();
  const fromEmail = String(sendResult?.fromEmail || "").trim();
  const mailSubject = String(subject || "").trim();
  const recipient = String(toEmail || "").trim();

  await CampaignOutreachReply.findOneAndUpdate(
    {
      userId: enrollment.userId,
      gmailMessageId: messageId,
    },
    {
      $set: {
        campaignId: enrollment.campaignId,
        enrollmentId: enrollment._id,
        candidateKey: enrollment.candidateKey,
        gmailThreadId: threadId,
        fromEmail,
        toEmail: recipient,
        subject: mailSubject,
        snippet: bodyText.slice(0, 240),
        bodyText,
        bodyHtml: "",
        receivedAt: now,
        isFromCandidate: false,
      },
    },
    { upsert: true, new: true }
  );
}

function normalizeSubjectKey(subject) {
  return String(subject || "")
    .trim()
    .toLowerCase()
    .replace(/^re:\s*/i, "");
}

async function backfillEmptyOutboundBodies(enrollment, senderFirstName = "") {
  const emptyDocs = await CampaignOutreachReply.find({
    enrollmentId: enrollment._id,
    isFromCandidate: false,
    $or: [{ bodyText: "" }, { bodyText: { $exists: false } }],
  }).lean();
  if (emptyDocs.length === 0) return 0;

  const planId = enrollment.outreachPlanId;
  if (!planId || !mongoose.Types.ObjectId.isValid(String(planId))) {
    return 0;
  }

  const plan = await OutreachPlan.findById(planId).select("touchpoints").lean();
  if (!plan?.touchpoints?.length) return 0;

  const contact = {
    name: enrollment.contactName,
    email: enrollment.contactEmail,
    phone: enrollment.contactPhone,
    company: enrollment.contactCompany,
    role: enrollment.contactRole,
  };

  const bySubject = new Map();
  for (const tp of plan.touchpoints) {
    const mergedSubject = applyMergeFields(String(tp.subject || ""), {
      contact,
      senderFirstName,
    }).trim();
    const mergedBody = applyMergeFields(String(tp.body || ""), {
      contact,
      senderFirstName,
    }).trim();
    if (mergedSubject && mergedBody) {
      bySubject.set(normalizeSubjectKey(mergedSubject), mergedBody);
    }
  }

  let updated = 0;
  for (const doc of emptyDocs) {
    const body = bySubject.get(normalizeSubjectKey(doc.subject));
    if (!body) continue;
    await CampaignOutreachReply.updateOne(
      { _id: doc._id },
      { $set: { bodyText: body, snippet: body.slice(0, 240) } }
    );
    updated += 1;
  }
  return updated;
}

async function syncEnrollmentReplies(enrollment, integrationEmail) {
  const userId = String(enrollment.userId);
  const threadId = await ensureThreadId(enrollment, userId);
  if (!threadId) {
    return { newReplies: 0, candidateReplies: 0, threadId: "" };
  }

  let messages = [];
  try {
    messages = await fetchThreadMessages(userId, threadId);
  } catch (err) {
    console.warn(
      `[outreach-reply-sync] enrollment ${enrollment._id} thread ${threadId} fetch failed:`,
      err?.message || err
    );
    return { newReplies: 0, candidateReplies: 0, threadId };
  }
  if (messages.length === 0) {
    return { newReplies: 0, candidateReplies: 0, threadId };
  }

  const existing = await CampaignOutreachReply.find({
    enrollmentId: enrollment._id,
  })
    .select("gmailMessageId bodyText")
    .lean();
  const existingIds = new Set(existing.map((r) => r.gmailMessageId));
  const emptyBodyIds = new Set(
    existing.filter((r) => !String(r.bodyText || "").trim()).map((r) => r.gmailMessageId)
  );

  let newReplies = 0;
  let candidateReplies = 0;
  let latestCandidateReplyAt = null;
  let latestNewCandidateMessage = null;

  for (const msg of messages) {
    const parsed = await normalizeMessage(userId, msg, {
      userEmail: integrationEmail,
      contactEmail: enrollment.contactEmail,
    });
    if (!parsed.gmailMessageId) continue;

    // Gmail sync often has no body on our sent messages; recordOutboundSentMessage stores it.
    if (!parsed.isFromCandidate && !String(parsed.bodyText || "").trim()) {
      continue;
    }

    if (existingIds.has(parsed.gmailMessageId)) {
      if (parsed.bodyText && emptyBodyIds.has(parsed.gmailMessageId)) {
        await CampaignOutreachReply.updateOne(
          { enrollmentId: enrollment._id, gmailMessageId: parsed.gmailMessageId },
          {
            $set: {
              bodyText: parsed.bodyText,
              bodyHtml: parsed.bodyHtml || "",
              snippet: parsed.snippet || parsed.bodyText.slice(0, 240),
            },
          }
        );
      }
      continue;
    }

    const isCandidate = parsed.isFromCandidate;
    try {
      await CampaignOutreachReply.create({
        userId: enrollment.userId,
        campaignId: enrollment.campaignId,
        enrollmentId: enrollment._id,
        candidateKey: enrollment.candidateKey,
        gmailThreadId: threadId,
        gmailMessageId: parsed.gmailMessageId,
        rfcMessageId: parsed.rfcMessageId || "",
        fromEmail: parsed.fromEmail,
        toEmail: parsed.toEmail,
        subject: parsed.subject,
        snippet: parsed.snippet,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        receivedAt: parsed.receivedAt,
        isFromCandidate: isCandidate,
      });
      existingIds.add(parsed.gmailMessageId);
      newReplies += 1;
      if (isCandidate) {
        candidateReplies += 1;
        if (
          !latestCandidateReplyAt ||
          parsed.receivedAt > latestCandidateReplyAt
        ) {
          latestCandidateReplyAt = parsed.receivedAt;
          latestNewCandidateMessage = parsed;
        }
      }
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }

  if (candidateReplies > 0) {
    const replyCount = await CampaignOutreachReply.countDocuments({
      enrollmentId: enrollment._id,
      isFromCandidate: true,
    });
    const enrollmentUpdate = {
      hasReply: true,
      replyCount,
      lastReplyAt: latestCandidateReplyAt,
      lastReplySyncedAt: new Date(),
      lastThreadId: threadId,
    };
    if (enrollment.status === "active") {
      enrollmentUpdate.status = "paused";
      enrollmentUpdate.lastError = "Reply received — sequence paused";
    }
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollment._id },
      { $set: enrollmentUpdate }
    );
  } else {
    await CampaignSequenceEnrollment.updateOne(
      { _id: enrollment._id },
      {
        $set: {
          lastReplySyncedAt: new Date(),
          lastThreadId: threadId,
        },
      }
    );
  }

  let backfilled = 0;
  try {
    backfilled = await backfillEmptyOutboundBodies(enrollment);
  } catch (err) {
    console.warn(
      `[outreach-reply-sync] enrollment ${enrollment._id} backfill skipped:`,
      err?.message || err
    );
  }

  if (newReplies > 0 || backfilled > 0) {
    notifyCampaignThreadUpdated(userId, {
      campaignId: String(enrollment.campaignId),
      candidateKey: enrollment.candidateKey,
      newMessages: newReplies + backfilled,
      hasNewCandidateReply: candidateReplies > 0,
      source: "gmail_sync",
    });
  }

  if (latestNewCandidateMessage) {
    const fresh = await CampaignSequenceEnrollment.findById(enrollment._id).lean();
    try {
      await maybeAutoReplyAfterCandidateMessage({
        enrollment: fresh || enrollment,
        candidateMessage: latestNewCandidateMessage,
        threadId,
      });
    } catch (err) {
      console.error(
        `[outreach-auto-reply] enrollment ${enrollment._id}:`,
        err?.message || err
      );
    }
  }

  return { newReplies, candidateReplies, threadId };
}

/**
 * Poll Gmail threads for email-campaign enrollments that have sent at least one outreach email.
 * Skips WhatsApp campaigns (their lastMessageId values are Meta ids, not Gmail ids).
 */
async function syncDueEnrollmentReplies() {
  const enrollments = await CampaignSequenceEnrollment.aggregate([
    {
      $match: {
        sentCount: { $gt: 0 },
        contactEmail: { $regex: /@/ },
        $or: [
          { lastThreadId: { $exists: true, $ne: "" } },
          { lastMessageId: { $exists: true, $ne: "" } },
        ],
      },
    },
    {
      $lookup: {
        from: Campaign.collection.name,
        localField: "campaignId",
        foreignField: "_id",
        as: "campaignRows",
      },
    },
    {
      $match: {
        campaignRows: { $ne: [] },
        "campaignRows.0.outreachChannel": { $ne: "whatsapp" },
      },
    },
    { $sort: { lastReplySyncedAt: 1, updatedAt: 1 } },
    { $limit: SYNC_BATCH_SIZE },
    { $project: { campaignRows: 0 } },
  ]);

  if (enrollments.length === 0) return { checked: 0, newReplies: 0 };

  const byUser = new Map();
  for (const row of enrollments) {
    const uid = String(row.userId);
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(row);
  }

  let checked = 0;
  let newReplies = 0;

  for (const [userId, rows] of byUser.entries()) {
    let integrationEmail = "";
    try {
      const integration = await getGmailIntegration(userId);
      integrationEmail = integration.email || "";
    } catch {
      continue;
    }

    for (const enrollment of rows) {
      if (!isEmailEnrollmentForGmailSync(enrollment)) continue;
      try {
        const result = await syncEnrollmentReplies(enrollment, integrationEmail);
        checked += 1;
        newReplies += result.newReplies;
      } catch (err) {
        console.error(
          `[outreach-reply-sync] enrollment ${enrollment._id}:`,
          err?.message || err
        );
      }
    }
  }

  return { checked, newReplies };
}

async function listContactEmailThread(actorUserId, campaignId, candidateKey, { sync = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    const err = new Error("Invalid campaign id");
    err.statusCode = 400;
    throw err;
  }
  const key = String(candidateKey || "").trim();
  if (!key) {
    const err = new Error("candidateKey is required");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const enrollment = await CampaignSequenceEnrollment.findOne({
    userId: userOid(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    candidateKey: key,
  }).lean();

  if (!enrollment) {
    return {
      hasEnrollment: false,
      sentCount: 0,
      hasReply: false,
      replyCount: 0,
      messages: [],
      synced: false,
    };
  }

  let synced = false;
  if (sync && (enrollment.sentCount || 0) > 0) {
    const integration = await getGmailIntegration(ownerUserId);
    await syncEnrollmentReplies(enrollment, integration.email || "");
    synced = true;
    const refreshed = await CampaignSequenceEnrollment.findById(enrollment._id).lean();
    if (refreshed) Object.assign(enrollment, refreshed);
  }

  const docs = await CampaignOutreachReply.find({
    userId: userOid(ownerUserId),
    enrollmentId: enrollment._id,
  })
    .sort({ receivedAt: 1 })
    .lean();

  return {
    hasEnrollment: true,
    sentCount: enrollment.sentCount || 0,
    hasReply: Boolean(enrollment.hasReply),
    replyCount: enrollment.replyCount || 0,
    enrollmentStatus: enrollment.status || "",
    replyDisposition: enrollment.replyDisposition || "unknown",
    autoReplyCount: enrollment.autoReplyCount || 0,
    messages: docs.map(formatReply),
    synced,
  };
}

async function listCampaignReplies(actorUserId, campaignId, { candidateKey } = {}) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    const err = new Error("Invalid campaign id");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const filter = {
    userId: userOid(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    isFromCandidate: true,
  };
  if (candidateKey) {
    filter.candidateKey = String(candidateKey).trim();
  }

  const docs = await CampaignOutreachReply.find(filter)
    .sort({ receivedAt: -1 })
    .lean();

  return docs.map(formatReply);
}

async function listEnrollmentReplies(userId, enrollmentId) {
  if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
    const err = new Error("Invalid enrollment id");
    err.statusCode = 400;
    throw err;
  }

  const docs = await CampaignOutreachReply.find({
    userId: userOid(userId),
    enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
    isFromCandidate: true,
  })
    .sort({ receivedAt: -1 })
    .lean();

  return docs.map(formatReply);
}

async function syncCampaignReplies(actorUserId, campaignId) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    const err = new Error("Invalid campaign id");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, {
    select: "userId outreachChannel",
  });
  if (campaign.outreachChannel === "whatsapp") {
    return { synced: 0, newReplies: 0, replies: [] };
  }
  const ownerUserId = campaignOwnerUserId(campaign);

  const integration = await getGmailIntegration(ownerUserId);
  const enrollments = await CampaignSequenceEnrollment.find({
    userId: userOid(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    sentCount: { $gt: 0 },
    contactEmail: { $regex: /@/ },
  }).lean();

  let newReplies = 0;
  for (const enrollment of enrollments) {
    if (!isEmailEnrollmentForGmailSync(enrollment)) continue;
    const result = await syncEnrollmentReplies(enrollment, integration.email || "");
    newReplies += result.newReplies;
  }

  const replies = await listCampaignReplies(actorUserId, campaignId);
  return { synced: enrollments.length, newReplies, replies };
}

async function deleteRepliesForCampaign(campaignId) {
  await CampaignOutreachReply.deleteMany({
    campaignId: new mongoose.Types.ObjectId(campaignId),
  });
}

module.exports = {
  syncDueEnrollmentReplies,
  syncCampaignReplies,
  syncEnrollmentReplies,
  recordOutboundSentMessage,
  listContactEmailThread,
  listCampaignReplies,
  listEnrollmentReplies,
  deleteRepliesForCampaign,
  formatReply,
};
