const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const CampaignOutreachReply = require("../models/CampaignOutreachReply");
const OutreachPlan = require("../models/OutreachPlan");
const UserIntegration = require("../models/UserIntegration");
const { sendGmailMessage, buildReplySubject } = require("./gmailSendService");
const { generateCampaignAutoReply } = require("./outreachReplyAiService");
const { notifyCampaignThreadUpdated } = require("../realtime/notify");
const { getAiConfig } = require("../config/ai");

const MAX_AUTO_REPLIES = Math.max(
  1,
  Math.min(20, Number(process.env.OUTREACH_AUTO_REPLY_MAX) || 8)
);

function isAutoReplyEnabled() {
  const flag = String(process.env.OUTREACH_AUTO_REPLY_ENABLED ?? "true").trim().toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function isFinalDisposition(disposition) {
  return disposition === "interested" || disposition === "not_interested";
}

async function getSenderFirstName(userId) {
  const doc = await UserIntegration.findOne({
    userId: userOid(userId),
    provider: "gmail",
  })
    .select("senderName email")
    .lean();
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  if (doc?.email?.includes("@")) {
    return doc.email.split("@")[0];
  }
  return "";
}

function summarizePlanTouchpoints(touchpoints) {
  const sorted = [...(touchpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  return sorted
    .slice(0, 4)
    .map((tp, i) => {
      const subj = String(tp.subject || "").trim();
      const body = String(tp.body || "").trim().slice(0, 400);
      return `Step ${i + 1}: ${subj}\n${body}`;
    })
    .join("\n\n");
}

function normalizeCalendlyAutomation(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: Boolean(o.enabled),
    meetingName: String(o.meetingName || "").trim(),
    schedulingUrl: String(o.schedulingUrl || "").trim(),
  };
}

function ensureCalendlyLinkInReply(replyBody, calendlyAutomation) {
  const body = String(replyBody || "").trim();
  const schedulingUrl = String(calendlyAutomation?.schedulingUrl || "").trim();
  if (!body || !schedulingUrl) return body;
  if (body.toLowerCase().includes(schedulingUrl.toLowerCase())) return body;

  return `${body}\n\nYou can pick a time here: ${schedulingUrl}`;
}

async function loadAutoReplyContext(enrollment) {
  const userId = String(enrollment.userId);
  const campaign = await Campaign.findById(enrollment.campaignId)
    .select("name outreachPlanId")
    .lean();

  let planSummary = "";
  let calendlyAutomation = { enabled: false, meetingName: "", schedulingUrl: "" };
  if (campaign?.outreachPlanId) {
    const plan = await OutreachPlan.findById(campaign.outreachPlanId)
      .select("name touchpoints calendlyAutomation")
      .lean();
    if (plan) {
      planSummary = `Plan: ${plan.name || ""}\n${summarizePlanTouchpoints(plan.touchpoints)}`;
      calendlyAutomation = normalizeCalendlyAutomation(plan.calendlyAutomation);
    }
  }

  const docs = await CampaignOutreachReply.find({ enrollmentId: enrollment._id })
    .sort({ receivedAt: 1 })
    .limit(30)
    .lean();

  const threadMessages = docs.map((d) => ({
    isFromCandidate: Boolean(d.isFromCandidate),
    bodyText: d.bodyText || d.snippet || "",
    snippet: d.snippet || "",
    subject: d.subject || "",
  }));

  const threadSubject =
    docs.map((d) => d.subject).find((s) => String(s || "").trim()) || "";

  const references = docs
    .map((d) => d.rfcMessageId)
    .filter(Boolean)
    .join(" ");

  return {
    userId,
    campaignName: campaign?.name || "",
    contactName: enrollment.contactName || "",
    contactRole: enrollment.contactRole || "",
    contactCompany: enrollment.contactCompany || "",
    planSummary,
    threadMessages,
    threadSubject,
    references,
    senderFirstName: await getSenderFirstName(userId),
    calendlyAutomation,
  };
}

/**
 * Send a Gemini-crafted auto-reply after a new candidate message (idempotent per message id).
 */
async function maybeAutoReplyAfterCandidateMessage({
  enrollment,
  candidateMessage,
  threadId,
}) {
  if (!isAutoReplyEnabled()) return { sent: false, reason: "disabled" };

  const cfg = getAiConfig();
  if (!cfg.useVertex && !cfg.useAiStudio) {
    return { sent: false, reason: "ai_not_configured" };
  }

  const gmailMessageId = String(candidateMessage?.gmailMessageId || "").trim();
  if (!gmailMessageId) return { sent: false, reason: "no_message_id" };

  if (enrollment.lastAutoRepliedToMessageId === gmailMessageId) {
    return { sent: false, reason: "already_replied" };
  }

  if (isFinalDisposition(enrollment.replyDisposition)) {
    return { sent: false, reason: "disposition_final" };
  }

  if ((enrollment.autoReplyCount || 0) >= MAX_AUTO_REPLIES) {
    return { sent: false, reason: "max_replies" };
  }

  const contactEmail = String(enrollment.contactEmail || "").trim();
  if (!contactEmail.includes("@")) {
    return { sent: false, reason: "no_contact_email" };
  }

  const tid = String(threadId || enrollment.lastThreadId || "").trim();
  if (!tid) return { sent: false, reason: "no_thread" };

  const context = await loadAutoReplyContext(enrollment);
  const latestBody = String(
    candidateMessage?.bodyText || candidateMessage?.snippet || ""
  ).trim();

  let ai;
  try {
    ai = await generateCampaignAutoReply({
      campaignName: context.campaignName,
      contactName: context.contactName,
      contactRole: context.contactRole,
      contactCompany: context.contactCompany,
      planSummary: context.planSummary,
      threadMessages: context.threadMessages,
      latestCandidateMessage: latestBody,
      currentDisposition: enrollment.replyDisposition || "unknown",
      autoReplyTurn: (enrollment.autoReplyCount || 0) + 1,
    });
  } catch (err) {
    console.error(
      `[outreach-auto-reply] enrollment ${enrollment._id}:`,
      err?.message || err
    );
    return { sent: false, reason: "ai_error" };
  }

  if (!ai.shouldSendReply || !ai.replyBody) {
    if (isFinalDisposition(ai.disposition)) {
      await CampaignSequenceEnrollment.updateOne(
        { _id: enrollment._id },
        {
          $set: {
            replyDisposition: ai.disposition,
            replyDispositionAt: new Date(),
            lastAutoRepliedToMessageId: gmailMessageId,
            lastError: dispositionLabel(ai.disposition),
          },
        }
      );
    }
    return { sent: false, reason: "no_reply_body", disposition: ai.disposition };
  }

  const replyBody =
    ai.disposition === "interested" && context.calendlyAutomation?.enabled
      ? ensureCalendlyLinkInReply(ai.replyBody, context.calendlyAutomation)
      : ai.replyBody;

  const subject = buildReplySubject(context.threadSubject);
  const inReplyTo = String(candidateMessage?.rfcMessageId || "").trim();
  const references = [context.references, inReplyTo].filter(Boolean).join(" ").trim();

  let sendResult;
  try {
    sendResult = await sendGmailMessage(context.userId, {
      to: contactEmail,
      subject,
      body: replyBody,
      threadId: tid,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
    });
  } catch (err) {
    console.error(
      `[outreach-auto-reply] send enrollment ${enrollment._id}:`,
      err?.message || err
    );
    return { sent: false, reason: "send_failed" };
  }

  const { recordOutboundSentMessage } = require("./campaignReplySyncService");
  await recordOutboundSentMessage({
    enrollment,
    sendResult,
    subject,
    body: replyBody,
    toEmail: contactEmail,
  });

  const now = new Date();
  const update = {
    autoReplyCount: (enrollment.autoReplyCount || 0) + 1,
    lastAutoReplyAt: now,
    lastAutoRepliedToMessageId: gmailMessageId,
    lastThreadId: sendResult.threadId || tid,
    lastMessageId: sendResult.messageId || enrollment.lastMessageId,
  };

  if (isFinalDisposition(ai.disposition)) {
    update.replyDisposition = ai.disposition;
    update.replyDispositionAt = now;
    update.lastError = dispositionLabel(ai.disposition);
  } else if (enrollment.status === "active") {
    update.status = "paused";
    update.lastError = "Reply received — auto-responding";
  }

  await CampaignSequenceEnrollment.updateOne({ _id: enrollment._id }, { $set: update });

  notifyCampaignThreadUpdated(context.userId, {
    campaignId: String(enrollment.campaignId),
    candidateKey: enrollment.candidateKey,
    newMessages: 1,
    hasNewCandidateReply: false,
    source: "auto_reply",
  });

  return {
    sent: true,
    disposition: ai.disposition,
    final: isFinalDisposition(ai.disposition),
  };
}

function dispositionLabel(disposition) {
  if (disposition === "interested") return "Candidate interested — conversation complete";
  if (disposition === "not_interested") return "Candidate not interested — conversation complete";
  return "Reply received — auto-responding";
}

module.exports = {
  maybeAutoReplyAfterCandidateMessage,
  isAutoReplyEnabled,
  dispositionLabel,
};
