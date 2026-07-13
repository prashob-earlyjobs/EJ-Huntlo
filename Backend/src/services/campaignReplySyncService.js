const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const CampaignOutreachReply = require("../models/CampaignOutreachReply");
const OutreachPlan = require("../models/OutreachPlan");
const { applyMergeFields } = require("./outreachMergeService");
const {
  fetchThreadMessages,
  resolveThreadIdFromMessage,
  normalizeMessage,
} = require("./gmailReadService");
const {
  getEmailIntegrationForCampaign,
} = require("./emailIntegrationService");
const {
  fetchZohoThreadMessages,
  resolveZohoThreadIdFromMessage,
} = require("./zohoMailReadService");
const {
  fetchOutlookThreadMessages,
  resolveOutlookThreadIdFromMessage,
} = require("./outlookMailReadService");
const { fetchCustomMailThreadMessages } = require("./customMailReadService");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { toReplyPreview } = require("./emailMimeBodyUtils");
const {
  inferReplyDispositionFromText,
  isFinalDisposition,
  applyReplyDispositionToModuleEnrollment,
  getLatestCandidateReplyBody,
} = require("./replyDispositionUtils");
const {
  findCampaignInScope,
  campaignOwnerUserId,
} = require("../utils/campaignScope");

const SYNC_BATCH_SIZE = Math.max(
  1,
  Math.min(30, Number(process.env.OUTREACH_REPLY_SYNC_BATCH_SIZE) || 15)
);

/** Allow small clock skew between mail server and app when comparing reply time to send time. */
const OUTREACH_REPLY_SKEW_MS = 2 * 60 * 1000;

function outreachSendCutoff(enrollment) {
  const raw = enrollment?.lastSentAt;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Only treat inbound mail as a campaign reply if it arrived at or after our outreach send. */
function messageQualifiesForEnrollmentReply(enrollment, message) {
  const cutoff = outreachSendCutoff(enrollment);
  if (!cutoff) return true;
  const receivedAt =
    message?.receivedAt instanceof Date ? message.receivedAt : new Date(message?.receivedAt || 0);
  if (!Number.isFinite(receivedAt.getTime())) return false;
  return receivedAt.getTime() >= cutoff.getTime() - OUTREACH_REPLY_SKEW_MS;
}

function verifiedCandidateReplyQuery(enrollment) {
  const contactEmail = String(enrollment.contactEmail || "").trim().toLowerCase();
  const query = {
    enrollmentId: enrollment._id,
    isFromCandidate: true,
  };
  const cutoff = outreachSendCutoff(enrollment);
  if (cutoff) {
    query.receivedAt = { $gte: new Date(cutoff.getTime() - OUTREACH_REPLY_SKEW_MS) };
  }
  if (contactEmail.includes("@")) {
    query.fromEmail = new RegExp(`^${contactEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }
  return query;
}

async function purgePreOutreachCandidateReplies(enrollment) {
  const cutoff = outreachSendCutoff(enrollment);
  if (!cutoff) return 0;

  const contactEmail = String(enrollment.contactEmail || "").trim().toLowerCase();
  const stale = await CampaignOutreachReply.find({
    enrollmentId: enrollment._id,
    isFromCandidate: true,
    receivedAt: { $lt: new Date(cutoff.getTime() - OUTREACH_REPLY_SKEW_MS) },
  })
    .select("_id fromEmail")
    .lean();

  const ids = stale
    .filter((row) => {
      if (!contactEmail.includes("@")) return true;
      return String(row.fromEmail || "").trim().toLowerCase() === contactEmail;
    })
    .map((row) => row._id);

  if (ids.length === 0) return 0;
  await CampaignOutreachReply.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function enrollmentModelFor(enrollment) {
  if (enrollment?.outreachModuleCampaignId && !enrollment?.campaignId) {
    return OutreachModuleEnrollment;
  }
  return CampaignSequenceEnrollment;
}

function replyCampaignId(enrollment) {
  return enrollment.campaignId || enrollment.outreachModuleCampaignId;
}

function replyCandidateKey(enrollment) {
  return enrollment.candidateKey || enrollment.candidateRefId || "";
}

function isModuleEnrollment(enrollment) {
  return Boolean(enrollment?.outreachModuleCampaignId && !enrollment?.campaignId);
}

/**
 * Outbound campaign emails synced from the inbox were incorrectly flagged as replies
 * (hasReply + paused), blocking no-response follow-up steps such as voice calls.
 */
async function countVerifiedCandidateReplies(enrollment) {
  return CampaignOutreachReply.countDocuments(verifiedCandidateReplyQuery(enrollment));
}

async function repairFalsePositiveEnrollmentReplyFlags(enrollment) {
  await purgePreOutreachCandidateReplies(enrollment);

  const verifiedReplyCount = await countVerifiedCandidateReplies(enrollment);
  const storedCount = Number(enrollment.replyCount || 0);
  const flagged = Boolean(enrollment?.hasReply) || storedCount > 0;

  if (verifiedReplyCount > 0) {
    if (!enrollment.hasReply || storedCount !== verifiedReplyCount) {
      await enrollmentModelFor(enrollment).updateOne(
        { _id: enrollment._id },
        { $set: { hasReply: true, replyCount: verifiedReplyCount } }
      );
    }
    return { repaired: false, resumed: false };
  }

  if (!flagged) return { repaired: false, resumed: false };

  const moduleEnrollment = isModuleEnrollment(enrollment);
  const $set = {
    hasReply: false,
    replyCount: 0,
    lastError: "",
  };
  const $unset = { lastReplyAt: "" };
  let resumed = false;

  if (moduleEnrollment && ["paused", "active"].includes(enrollment.status)) {
    const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
    const { buildExecutionPlan, findNextPendingAutomatableStep } = require("./outreachModuleSendService");
    const campaign = await OutreachModuleCampaign.findById(
      enrollment.outreachModuleCampaignId
    ).lean();
    if (campaign && ["active", "completed"].includes(campaign.status)) {
      const plan = buildExecutionPlan(campaign);
      const pendingStep = findNextPendingAutomatableStep(plan, enrollment);
      if (pendingStep) {
        $set.status = "active";
        $set.currentStepOrder = pendingStep.order;
        const nextSendAt = enrollment.nextSendAt ? new Date(enrollment.nextSendAt) : null;
        $set.nextSendAt =
          nextSendAt && nextSendAt.getTime() > Date.now() ? nextSendAt : new Date();
        resumed = true;
      }
    }
  }

  await enrollmentModelFor(enrollment).updateOne({ _id: enrollment._id }, { $set, $unset });
  return { repaired: true, resumed };
}

async function repairOutreachModuleFalsePositiveReplyFlags(campaignId) {
  const enrollments = await OutreachModuleEnrollment.find({
    outreachModuleCampaignId: campaignId,
    sentCount: { $gt: 0 },
  }).lean();

  let resumed = 0;
  for (const enrollment of enrollments) {
    await purgePreOutreachCandidateReplies(enrollment);
    const verified = await countVerifiedCandidateReplies(enrollment);
    const stored = Number(enrollment.replyCount || 0);

    if (verified > 0) {
      if (!enrollment.hasReply || stored !== verified) {
        await OutreachModuleEnrollment.updateOne(
          { _id: enrollment._id },
          { $set: { hasReply: true, replyCount: verified } }
        );
      }
      continue;
    }

    if (!enrollment.hasReply && stored <= 0) continue;

    const result = await repairFalsePositiveEnrollmentReplyFlags(enrollment);
    if (result.resumed) resumed += 1;
  }

  if (resumed > 0) {
    setImmediate(() => {
      const { processDueOutreachModuleEnrollments } = require("./outreachModuleSendService");
      processDueOutreachModuleEnrollments().catch((err) => {
        console.error(
          "[outreach-module-reply-sync] post-repair send tick:",
          err?.message || err
        );
      });
    });
  }

  return { checked: enrollments.length, resumed };
}

/** Gmail API message/thread ids — not Meta WhatsApp wamid.* values stored on WA enrollments. */
function looksLikeGmailResourceId(id) {
  const value = String(id || "").trim();
  if (!value) return false;
  if (/^wamid\./i.test(value)) return false;
  return true;
}

function isEmailEnrollmentForSync(enrollment) {
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

async function ensureThreadId(enrollment, userId, provider, integrationDoc) {
  if (!isEmailEnrollmentForSync(enrollment)) return "";

  if (provider === "custom_mail") {
    const stored = String(enrollment.lastThreadId || enrollment.lastMessageId || "").trim();
    if (stored) return stored;
    const contact = String(enrollment.contactEmail || "").trim().toLowerCase();
    return contact.includes("@") ? `smtp-thread:${contact}` : "";
  }

  const integrationId = integrationDoc?._id ? String(integrationDoc._id) : undefined;

  const storedThreadId = String(enrollment.lastThreadId || "").trim();
  if (storedThreadId && looksLikeGmailResourceId(storedThreadId)) {
    return storedThreadId;
  }

  const messageId = String(enrollment.lastMessageId || "").trim();
  if (!messageId || !looksLikeGmailResourceId(messageId)) return "";

  try {
    let threadId = "";
    if (provider === "zoho_mail") {
      threadId = await resolveZohoThreadIdFromMessage(integrationDoc, messageId);
    } else if (provider === "outlook") {
      threadId = await resolveOutlookThreadIdFromMessage(integrationDoc, messageId);
    } else if (provider === "gmail") {
      threadId = await resolveThreadIdFromMessage(userId, messageId, integrationId);
    } else {
      return messageId;
    }
    if (threadId) {
      await enrollmentModelFor(enrollment).updateOne(
        { _id: enrollment._id },
        { $set: { lastThreadId: threadId } }
      );
      enrollment.lastThreadId = threadId;
    }
    return threadId || messageId;
  } catch (err) {
    console.warn(
      `[outreach-reply-sync] enrollment ${enrollment._id} could not resolve thread from message ${messageId}:`,
      err?.message || err
    );
    return messageId;
  }
}

async function fetchProviderThreadMessages(provider, userId, integrationDoc, enrollment, threadId) {
  if (provider === "custom_mail") {
    return fetchCustomMailThreadMessages(integrationDoc, enrollment, threadId);
  }
  if (provider === "zoho_mail") {
    return fetchZohoThreadMessages(integrationDoc, enrollment, threadId);
  }
  if (provider === "outlook") {
    return fetchOutlookThreadMessages(integrationDoc, enrollment, threadId);
  }

  const integrationId = integrationDoc?._id ? String(integrationDoc._id) : undefined;
  const raw = await fetchThreadMessages(userId, threadId, integrationId);
  const integrationEmail = integrationDoc?.email || "";
  const parsed = [];
  for (const msg of raw) {
    const row = await normalizeMessage(userId, msg, {
      userEmail: integrationEmail,
      contactEmail: enrollment.contactEmail,
      integrationId,
    });
    if (row?.gmailMessageId) parsed.push(row);
  }
  return parsed;
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
        campaignId: replyCampaignId(enrollment),
        enrollmentId: enrollment._id,
        candidateKey: replyCandidateKey(enrollment),
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
    { upsert: true, returnDocument: "after" }
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

function candidateMessageFromReplyDoc(doc) {
  if (!doc) return null;
  const gmailMessageId = String(doc.gmailMessageId || "").trim();
  if (!gmailMessageId) return null;
  return {
    gmailMessageId,
    bodyText: doc.bodyText || "",
    snippet: doc.snippet || "",
    rfcMessageId: doc.rfcMessageId || "",
    receivedAt: doc.receivedAt,
    isFromCandidate: true,
  };
}

async function resolveCandidateMessageForAutoReply(enrollment, preferMessage = null) {
  if (preferMessage?.gmailMessageId) {
    return preferMessage;
  }

  const latest = await CampaignOutreachReply.findOne({
    enrollmentId: enrollment._id,
    isFromCandidate: true,
  })
    .sort({ receivedAt: -1 })
    .lean();

  const fresh = await enrollmentModelFor(enrollment).findById(enrollment._id).lean();
  if (!latest || !fresh) return null;

  const msgId = String(latest.gmailMessageId || "").trim();
  if (!msgId || String(fresh.lastAutoRepliedToMessageId || "") === msgId) {
    return null;
  }

  return candidateMessageFromReplyDoc(latest);
}

async function attemptAutoReplyForEnrollment(enrollment, threadId, { preferMessage = null } = {}) {
  const candidateMessage = await resolveCandidateMessageForAutoReply(
    enrollment,
    preferMessage
  );
  if (!candidateMessage) return;

  const EnrollmentModel = enrollmentModelFor(enrollment);
  const fresh = await EnrollmentModel.findById(enrollment._id).lean();
  if (!fresh) return;

  try {
    if (isModuleEnrollment(fresh)) {
      const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
      const campaignDoc = await OutreachModuleCampaign.findById(
        fresh.outreachModuleCampaignId
      ).lean();
      const {
        maybeAutoReplyOutreachModuleAfterCandidateMessage,
      } = require("./outreachModuleAutoReplyService");
      const result = await maybeAutoReplyOutreachModuleAfterCandidateMessage({
        enrollment: fresh,
        candidateMessage,
        threadId,
        campaignDoc,
      });
      if (result?.sent) {
        console.log(
          `[outreach-module-auto-reply] enrollment ${fresh._id} sent turn ${fresh.autoReplyCount || 0}`
        );
      } else if (result?.reason && result.reason !== "already_replied") {
        console.log(
          `[outreach-module-auto-reply] enrollment ${fresh._id} skipped: ${result.reason}`
        );
      }
    } else {
      const { maybeAutoReplyAfterCandidateMessage } = require("./campaignAutoReplyService");
      await maybeAutoReplyAfterCandidateMessage({
        enrollment: fresh,
        candidateMessage,
        threadId,
      });
    }
  } catch (err) {
    console.error(
      `[outreach-auto-reply] enrollment ${enrollment._id}:`,
      err?.message || err
    );
  }
}

async function applyKeywordDispositionAfterAutoReply(enrollmentId) {
  const fresh = await OutreachModuleEnrollment.findById(enrollmentId).lean();
  if (!fresh || isFinalDisposition(fresh.replyDisposition)) return;

  const latestBody = await getLatestCandidateReplyBody(enrollmentId);
  const inferred = inferReplyDispositionFromText(latestBody);
  if (!isFinalDisposition(inferred)) return;

  await applyReplyDispositionToModuleEnrollment({
    enrollment: fresh,
    disposition: inferred,
    latestBody,
    source: "inference",
  });
}

async function syncEnrollmentReplies(enrollment, integrationEmail, provider, integrationDoc) {
  const repairResult = await repairFalsePositiveEnrollmentReplyFlags(enrollment);
  let resumedEnrollment = Boolean(repairResult.resumed);
  if (repairResult.repaired) {
    enrollment = await enrollmentModelFor(enrollment).findById(enrollment._id).lean();
    if (!enrollment) {
      return { newReplies: 0, candidateReplies: 0, threadId: "", resumed: resumedEnrollment };
    }
  }

  await purgePreOutreachCandidateReplies(enrollment);

  const userId = String(enrollment.userId);
  const threadId = await ensureThreadId(enrollment, userId, provider, integrationDoc);
  if (!threadId) {
    return { newReplies: 0, candidateReplies: 0, threadId: "" };
  }

  let messages = [];
  try {
    messages = await fetchProviderThreadMessages(
      provider,
      userId,
      integrationDoc,
      enrollment,
      threadId
    );
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
  let newRecruiterMessages = 0;
  let latestCandidateReplyAt = null;
  let latestNewCandidateMessage = null;

  for (const parsed of messages) {
    if (!parsed.gmailMessageId) continue;

    if (!messageQualifiesForEnrollmentReply(enrollment, parsed)) {
      continue;
    }

    // Outbound bodies are stored at send time; provider sync may omit our sent body.
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
    if (!isCandidate) {
      newRecruiterMessages += 1;
    }
    try {
      await CampaignOutreachReply.create({
        userId: enrollment.userId,
        campaignId: replyCampaignId(enrollment),
        enrollmentId: enrollment._id,
        candidateKey: replyCandidateKey(enrollment),
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

  const moduleEnrollment = isModuleEnrollment(enrollment);
  // Module sequences: only pause on real candidate replies — synced outbound mail is not a reply.
  const shouldPauseSequence =
    candidateReplies > 0 || (newRecruiterMessages > 0 && !moduleEnrollment);
  if (shouldPauseSequence) {
    const latestBody = String(
      latestNewCandidateMessage?.bodyText || latestNewCandidateMessage?.snippet || ""
    ).trim();

    const enrollmentUpdate = {
      lastReplySyncedAt: new Date(),
      lastThreadId: threadId,
    };
    if (candidateReplies > 0) {
      enrollmentUpdate.hasReply = true;
      enrollmentUpdate.replyCount = await countVerifiedCandidateReplies({
        ...enrollment,
        _id: enrollment._id,
      });
      enrollmentUpdate.lastReplyAt = latestCandidateReplyAt;
    }
    if (enrollment.status === "active") {
      enrollmentUpdate.status = "paused";
      enrollmentUpdate.nextSendAt = null;
      enrollmentUpdate.lastError = moduleEnrollment
        ? "Reply received — auto-responding"
        : candidateReplies > 0
          ? "Reply received — sequence paused"
          : "Manual reply sent — sequence paused";
    }
    await enrollmentModelFor(enrollment).updateOne(
      { _id: enrollment._id },
      { $set: enrollmentUpdate }
    );

    if (moduleEnrollment && candidateReplies > 0) {
      const campaignId = String(enrollment.outreachModuleCampaignId || "");
      const candidateRefId = String(enrollment.candidateRefId || "");
      if (campaignId) {
        const { updateEmbeddedCandidateAfterSend } = require("./outreachModuleSendService");
        await updateEmbeddedCandidateAfterSend(campaignId, candidateRefId, {
          responseStatus: "replied",
          matchEmail: enrollment.contactEmail,
          lastResponse: toReplyPreview(latestBody) || "Reply received",
          nextAction: "AI auto-reply pending",
          interaction: {
            type: "email",
            summary: "Candidate replied",
            content: { bodyPreview: latestBody.slice(0, 280) },
          },
        }).catch((err) => {
          console.warn(
            `[outreach-module-reply-sync] candidate update ${candidateRefId}:`,
            err?.message || err
          );
        });
      }
    } else if (enrollmentUpdate.status === "paused" && enrollment.campaignId) {
      const { maybeCompleteCampaign } = require("./campaignOutreachSendService");
      await maybeCompleteCampaign(String(enrollment.campaignId));
    }
  } else {
    await enrollmentModelFor(enrollment).updateOne(
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

  if (!isModuleEnrollment(enrollment) && (newReplies > 0 || backfilled > 0)) {
    notifyCampaignThreadUpdated(userId, {
      campaignId: String(enrollment.campaignId),
      candidateKey: enrollment.candidateKey,
      newMessages: newReplies + backfilled,
      hasNewCandidateReply: candidateReplies > 0,
      source:
        provider === "zoho_mail"
          ? "zoho_sync"
          : provider === "outlook"
            ? "outlook_sync"
            : "gmail_sync",
    });
  }

  await attemptAutoReplyForEnrollment(enrollment, threadId, {
    preferMessage: latestNewCandidateMessage,
  });

  if (isModuleEnrollment(enrollment)) {
    await applyKeywordDispositionAfterAutoReply(enrollment._id);
  }

  return { newReplies, candidateReplies, threadId, resumed: resumedEnrollment };
}

/**
 * Poll Gmail threads for email-campaign enrollments that have sent at least one outreach email.
 * Skips WhatsApp campaigns (their lastMessageId values are Meta ids, not Gmail ids).
 */
async function syncDueEnrollmentReplies() {
  const liveCampaignIds = await Campaign.find({
    outreachStatus: { $in: ["active", "paused", "completed"] },
  })
    .distinct("_id")
    .lean();
  if (liveCampaignIds.length === 0) return { checked: 0, newReplies: 0 };

  const enrollments = await CampaignSequenceEnrollment.find({
    campaignId: { $in: liveCampaignIds },
    sentCount: { $gt: 0 },
    $or: [
      { lastThreadId: { $exists: true, $ne: "" } },
      { lastMessageId: { $exists: true, $ne: "" } },
    ],
  })
    .sort({ lastReplySyncedAt: 1, updatedAt: 1 })
    .limit(SYNC_BATCH_SIZE)
    .lean();

  if (enrollments.length === 0) return { checked: 0, newReplies: 0 };

  const byIntegration = new Map();
  for (const row of enrollments) {
    const campaign = await Campaign.findById(row.campaignId)
      .select("userId emailIntegrationId")
      .lean();
    if (!campaign) continue;
    const key = `${campaign.userId}:${campaign.emailIntegrationId || "default"}`;
    if (!byIntegration.has(key)) {
      byIntegration.set(key, { campaign, rows: [] });
    }
    byIntegration.get(key).rows.push(row);
  }

  let checked = 0;
  let newReplies = 0;

  for (const { campaign, rows } of byIntegration.values()) {
    let integrationEmail = "";
    let provider = "";
    let integrationDoc = null;
    try {
      integrationDoc = await getEmailIntegrationForCampaign(campaign);
      provider = integrationDoc.provider;
      integrationEmail = integrationDoc.email || "";
    } catch {
      continue;
    }

    for (const enrollment of rows) {
      if (!isEmailEnrollmentForSync(enrollment)) continue;
      try {
        const result = await syncEnrollmentReplies(
          enrollment,
          integrationEmail,
          provider,
          integrationDoc
        );
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

  const campaign = await findCampaignInScope(actorUserId, campaignId, {
    select: "userId emailIntegrationId",
  });
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
    try {
      const integration = await getEmailIntegrationForCampaign(campaign);
      await syncEnrollmentReplies(
        enrollment,
        integration.email || "",
        integration.provider,
        integration
      );
      synced = true;
    } catch {
      /* integration unavailable */
    }
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
    select: "userId outreachChannel emailIntegrationId",
  });
  if (campaign.outreachChannel === "whatsapp") {
    return { synced: 0, newReplies: 0, replies: [] };
  }
  const ownerUserId = campaignOwnerUserId(campaign);

  let integration;
  try {
    integration = await getEmailIntegrationForCampaign(campaign);
  } catch {
    return { synced: 0, newReplies: 0, replies: [] };
  }
  const provider = integration.provider;
  const enrollments = await CampaignSequenceEnrollment.find({
    userId: userOid(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    sentCount: { $gt: 0 },
    contactEmail: { $regex: /@/ },
  }).lean();

  let newReplies = 0;
  for (const enrollment of enrollments) {
    if (!isEmailEnrollmentForSync(enrollment)) continue;
    const result = await syncEnrollmentReplies(
      enrollment,
      integration.email || "",
      provider,
      integration
    );
    newReplies += result.newReplies;
  }

  const replies = await listCampaignReplies(actorUserId, campaignId);
  return { synced: enrollments.length, newReplies, replies };
}

/**
 * Poll email threads for outreach-module enrollments (single or multi-channel email steps).
 */
async function syncDueOutreachModuleEnrollmentReplies() {
  const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");

  const liveCampaignIds = await OutreachModuleCampaign.find({
    status: { $in: ["active", "paused", "completed"] },
    $or: [{ channel: "email" }, { "sequenceSteps.channel": "email" }],
  })
    .distinct("_id")
    .lean();

  if (liveCampaignIds.length === 0) return { checked: 0, newReplies: 0 };

  const enrollments = await OutreachModuleEnrollment.find({
    outreachModuleCampaignId: { $in: liveCampaignIds },
    sentCount: { $gt: 0 },
    contactEmail: { $regex: /@/ },
    $or: [
      { lastThreadId: { $exists: true, $ne: "" } },
      { lastMessageId: { $exists: true, $ne: "" } },
    ],
  })
    .sort({ lastReplySyncedAt: 1, updatedAt: 1 })
    .limit(SYNC_BATCH_SIZE)
    .lean();

  if (enrollments.length === 0) return { checked: 0, newReplies: 0 };

  const byIntegration = new Map();
  for (const row of enrollments) {
    const campaign = await OutreachModuleCampaign.findById(row.outreachModuleCampaignId)
      .select("userId emailIntegrationId")
      .lean();
    if (!campaign) continue;
    const key = `${campaign.userId}:${campaign.emailIntegrationId || "default"}`;
    if (!byIntegration.has(key)) {
      byIntegration.set(key, { campaign, rows: [] });
    }
    byIntegration.get(key).rows.push(row);
  }

  let checked = 0;
  let newReplies = 0;

  for (const { campaign, rows } of byIntegration.values()) {
    let integrationEmail = "";
    let provider = "";
    let integrationDoc = null;
    try {
      integrationDoc = await getEmailIntegrationForCampaign(campaign);
      provider = integrationDoc.provider;
      integrationEmail = integrationDoc.email || "";
    } catch {
      continue;
    }

    for (const enrollment of rows) {
      if (!isEmailEnrollmentForSync(enrollment)) continue;
      try {
        const result = await syncEnrollmentReplies(
          enrollment,
          integrationEmail,
          provider,
          integrationDoc
        );
        checked += 1;
        newReplies += result.newReplies;
      } catch (err) {
        console.error(
          `[outreach-module-reply-sync] enrollment ${enrollment._id}:`,
          err?.message || err
        );
      }
    }
  }

  return { checked, newReplies };
}

/**
 * Poll connected inbox for one outreach-module campaign (used by tracking view).
 */
async function syncOutreachModuleCampaignEmailReplies(campaignDoc) {
  const hasEmail =
    campaignDoc?.channel === "email" ||
    (Array.isArray(campaignDoc?.sequenceSteps) &&
      campaignDoc.sequenceSteps.some((step) => step.channel === "email"));
  if (!hasEmail) return 0;

  let integration;
  try {
    integration = await getEmailIntegrationForCampaign(campaignDoc);
  } catch {
    return 0;
  }
  if (!integration) return 0;

  const campaignId = campaignDoc._id;
  const enrollments = await OutreachModuleEnrollment.find({
    outreachModuleCampaignId: campaignId,
    sentCount: { $gt: 0 },
    contactEmail: { $regex: /@/ },
  }).lean();

  let newReplies = 0;
  let resumedEnrollments = 0;
  const provider = integration.provider;
  const integrationEmail = integration.email || "";

  for (const enrollment of enrollments) {
    if (!isEmailEnrollmentForSync(enrollment)) continue;
    try {
      const result = await syncEnrollmentReplies(
        enrollment,
        integrationEmail,
        provider,
        integration
      );
      newReplies += result.newReplies;
      if (result.resumed) resumedEnrollments += 1;
    } catch (err) {
      console.error(
        `[outreach-module-reply-sync] campaign ${campaignId} enrollment ${enrollment._id}:`,
        err?.message || err
      );
    }
  }

  if (resumedEnrollments > 0) {
    setImmediate(() => {
      const { processDueOutreachModuleEnrollments } = require("./outreachModuleSendService");
      processDueOutreachModuleEnrollments().catch((err) => {
        console.error(
          "[outreach-module-reply-sync] post-repair send tick:",
          err?.message || err
        );
      });
    });
  }

  return newReplies;
}

async function deleteRepliesForCampaign(campaignId) {
  await CampaignOutreachReply.deleteMany({
    campaignId: new mongoose.Types.ObjectId(campaignId),
  });
}

/** Clear false reply flags and resume sequences before the send tick (voice/email follow-ups). */
async function repairStuckOutreachModuleEnrollmentsBeforeSend() {
  const now = new Date();
  const campaignIds = await OutreachModuleEnrollment.distinct("outreachModuleCampaignId", {
    status: { $in: ["active", "paused", "completed", "failed", "skipped"] },
    $or: [
      { status: "active", nextSendAt: { $lte: now } },
      { status: "paused", hasReply: true },
      { status: "paused", replyCount: { $gt: 0 } },
      { status: "completed" },
      { status: "failed" },
      { status: "skipped" },
    ],
  });

  let resumed = 0;
  for (const campaignId of campaignIds) {
    const result = await repairOutreachModuleFalsePositiveReplyFlags(campaignId);
    resumed += Number(result.resumed) || 0;
  }

  return { campaigns: campaignIds.length, resumed };
}

module.exports = {
  syncDueEnrollmentReplies,
  syncDueOutreachModuleEnrollmentReplies,
  syncOutreachModuleCampaignEmailReplies,
  repairOutreachModuleFalsePositiveReplyFlags,
  repairStuckOutreachModuleEnrollmentsBeforeSend,
  syncCampaignReplies,
  syncEnrollmentReplies,
  recordOutboundSentMessage,
  listContactEmailThread,
  listCampaignReplies,
  listEnrollmentReplies,
  deleteRepliesForCampaign,
  formatReply,
};
