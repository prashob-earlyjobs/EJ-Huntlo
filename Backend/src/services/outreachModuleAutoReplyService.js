const mongoose = require("mongoose");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const CampaignOutreachReply = require("../models/CampaignOutreachReply");
const { buildReplySubject } = require("./gmailSendService");
const { sendCampaignEmail } = require("./emailSendService");
const { getSenderFirstNameForEmail } = require("./emailIntegrationService");
const {
  generateCampaignAutoReply,
  MAX_CONVERSATION_EXCHANGES,
} = require("./outreachReplyAiService");
const {
  isAutoReplyEnabled,
  dispositionLabel,
} = require("./campaignAutoReplyService");
const { getAiConfig } = require("../config/ai");

const MAX_AUTO_REPLIES = Math.max(
  1,
  Math.min(20, Number(process.env.OUTREACH_AUTO_REPLY_MAX) || MAX_CONVERSATION_EXCHANGES)
);

function isFinalDisposition(disposition) {
  return disposition === "interested" || disposition === "not_interested";
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

function summarizeEmailTouchpoints(campaignDoc) {
  const touchpoints = Array.isArray(campaignDoc?.channelMessage?.emailTouchpoints)
    ? campaignDoc.channelMessage.emailTouchpoints
    : [];
  const sorted = [...touchpoints].sort((a, b) => (a.order || 0) - (b.order || 0));
  return sorted
    .slice(0, 4)
    .map((tp, i) => {
      const subj = String(tp.subject || "").trim();
      const body = String(tp.body || "").trim().slice(0, 400);
      return `Step ${i + 1}: ${subj}\n${body}`;
    })
    .join("\n\n");
}

function summarizeModulePlanSummary(campaignDoc) {
  const parts = [];
  const emailSummary = summarizeEmailTouchpoints(campaignDoc);
  if (emailSummary) parts.push(emailSummary);

  for (const step of campaignDoc?.sequenceSteps || []) {
    if (step.channel !== "email") continue;
    const msg = step.message && typeof step.message === "object" ? step.message : {};
    const touchpoints = Array.isArray(msg.emailTouchpoints) ? msg.emailTouchpoints : [];
    if (touchpoints.length > 0) {
      parts.push(
        summarizeEmailTouchpoints({ channelMessage: { emailTouchpoints: touchpoints } })
      );
      continue;
    }
    const subj = String(msg.subject || "").trim();
    const body = String(msg.body || "").trim().slice(0, 400);
    if (subj || body) {
      parts.push(`Sequence email: ${subj}\n${body}`);
    }
  }

  return parts.filter(Boolean).join("\n\n");
}

async function loadOutreachModuleAutoReplyContext(enrollment, campaignDoc) {
  const userId = String(enrollment.userId);
  const campaign =
    campaignDoc ||
    (await OutreachModuleCampaign.findById(enrollment.outreachModuleCampaignId)
      .select("name jobTitle jobDescription emailIntegrationId calendlyAutomation emailAutoReplyEnabled")
      .lean());

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

  const integrationId = campaign?.emailIntegrationId
    ? String(campaign.emailIntegrationId)
    : null;

  return {
    userId,
    campaignDoc: campaign,
    emailIntegrationId: integrationId,
    campaignName: campaign?.name || "",
    jobTitle: String(campaign?.jobTitle || "").trim(),
    jobDescription: String(campaign?.jobDescription || "").trim(),
    contactName: enrollment.contactName || "",
    contactRole: enrollment.contactRole || "",
    contactCompany: enrollment.contactCompany || "",
    planSummary: summarizeModulePlanSummary(campaign),
    threadMessages,
    threadSubject,
    references,
    senderFirstName: await getSenderFirstNameForEmail(userId, integrationId),
    calendlyAutomation: normalizeCalendlyAutomation(campaign?.calendlyAutomation),
    emailAutoReplyEnabled: campaign?.emailAutoReplyEnabled !== false,
  };
}

/**
 * Send a Gemini-crafted auto-reply after a new candidate email (idempotent per message id).
 */
async function maybeAutoReplyOutreachModuleAfterCandidateMessage({
  enrollment,
  candidateMessage,
  threadId,
  campaignDoc = null,
}) {
  if (!isAutoReplyEnabled()) return { sent: false, reason: "disabled" };

  const cfg = getAiConfig();
  if (!cfg.useVertex && !cfg.useAiStudio) {
    return { sent: false, reason: "ai_not_configured" };
  }

  const context = await loadOutreachModuleAutoReplyContext(enrollment, campaignDoc);
  if (!context.emailAutoReplyEnabled) {
    return { sent: false, reason: "campaign_disabled" };
  }

  const gmailMessageId = String(candidateMessage?.gmailMessageId || "").trim();
  if (!gmailMessageId) return { sent: false, reason: "no_message_id" };

  if (enrollment.lastAutoRepliedToMessageId === gmailMessageId) {
    return { sent: false, reason: "already_replied" };
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

  const latestBody = String(
    candidateMessage?.bodyText || candidateMessage?.snippet || ""
  ).trim();
  const autoReplyTurn = (enrollment.autoReplyCount || 0) + 1;
  const schedulingUrl = String(context.calendlyAutomation?.schedulingUrl || "").trim();
  const calendlyEnabled = Boolean(
    context.calendlyAutomation?.enabled && schedulingUrl
  );

  let ai;
  try {
    ai = await generateCampaignAutoReply({
      campaignName: context.campaignName,
      jobDescription: context.jobDescription,
      contactName: context.contactName,
      contactRole: context.contactRole,
      contactCompany: context.contactCompany,
      planSummary: context.planSummary,
      threadMessages: context.threadMessages,
      latestCandidateMessage: latestBody,
      currentDisposition: enrollment.replyDisposition || "unknown",
      autoReplyTurn,
      maxExchanges: MAX_CONVERSATION_EXCHANGES,
      interviewSchedulingUrl: calendlyEnabled ? schedulingUrl : "",
    });
  } catch (err) {
    console.error(
      `[outreach-module-auto-reply] enrollment ${enrollment._id}:`,
      err?.message || err
    );
    return { sent: false, reason: "ai_error" };
  }

  const onFinalExchange = autoReplyTurn >= MAX_CONVERSATION_EXCHANGES;
  if (onFinalExchange && ai.disposition !== "not_interested") {
    ai.disposition = "interested";
    ai.shouldSendReply = true;
    if (!String(ai.replyBody || "").trim()) {
      const firstName =
        String(enrollment.contactName || "").trim().split(/\s+/)[0] || "there";
      ai.replyBody = `Hi ${firstName}, thank you for your interest in the role. We would love to speak with you — please use the link below to pick a time that works for you.`;
    }
  }

  if (!ai.shouldSendReply || !ai.replyBody) {
    if (isFinalDisposition(ai.disposition)) {
      const { applyReplyDispositionToModuleEnrollment } = require("./replyDispositionUtils");
      await applyReplyDispositionToModuleEnrollment({
        enrollment,
        disposition: ai.disposition,
        latestBody,
        source: "ai",
      });
      await OutreachModuleEnrollment.updateOne(
        { _id: enrollment._id },
        { $set: { lastAutoRepliedToMessageId: gmailMessageId } }
      );
    }
    return { sent: false, reason: "no_reply_body", disposition: ai.disposition };
  }

  let replyBody = ai.replyBody;
  const shouldAttachCalendly =
    calendlyEnabled &&
    ai.disposition !== "not_interested" &&
    (ai.disposition === "interested" || onFinalExchange);
  if (shouldAttachCalendly) {
    replyBody = ensureCalendlyLinkInReply(replyBody, context.calendlyAutomation);
  }

  const subject = buildReplySubject(context.threadSubject);
  const inReplyTo = String(candidateMessage?.rfcMessageId || "").trim();
  const references = [context.references, inReplyTo].filter(Boolean).join(" ").trim();

  let sendResult;
  try {
    sendResult = await sendCampaignEmail(
      context.userId,
      {
        to: contactEmail,
        subject,
        body: replyBody,
        threadId: tid,
        inReplyTo: inReplyTo || undefined,
        references: references || undefined,
      },
      { integrationId: context.emailIntegrationId || undefined }
    );
  } catch (err) {
    console.error(
      `[outreach-module-auto-reply] send enrollment ${enrollment._id}:`,
      err?.message || err
    );
    return { sent: false, reason: "send_failed" };
  }

  const { recordOutboundSentMessage } = require("./campaignReplySyncService");
  await recordOutboundSentMessage({
    enrollment: {
      ...enrollment,
      campaignId: enrollment.outreachModuleCampaignId,
      candidateKey: enrollment.candidateRefId,
    },
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
    if (enrollment.status === "active" || enrollment.status === "paused") {
      update.status = "paused";
    }
  } else if (enrollment.status === "active") {
    update.status = "paused";
    update.lastError = "Reply received — auto-responding";
  }

  await OutreachModuleEnrollment.updateOne({ _id: enrollment._id }, { $set: update });

  const campaignId = String(enrollment.outreachModuleCampaignId || "");
  const candidateRefId = String(enrollment.candidateRefId || "");
  if (campaignId && isFinalDisposition(ai.disposition)) {
    const { applyReplyDispositionToModuleEnrollment } = require("./replyDispositionUtils");
    await applyReplyDispositionToModuleEnrollment({
      enrollment,
      disposition: ai.disposition,
      latestBody,
      source: "ai",
    });
  } else if (campaignId && candidateRefId) {
    const { updateEmbeddedCandidateAfterSend } = require("./outreachModuleSendService");
    await updateEmbeddedCandidateAfterSend(campaignId, candidateRefId, {
      matchEmail: enrollment.contactEmail,
      lastResponse: latestBody.slice(0, 200),
      nextAction: isFinalDisposition(ai.disposition)
        ? "Conversation complete"
        : "AI auto-reply sent",
      interaction: {
        type: "email",
        summary: `AI reply: ${subject}`,
        content: { bodyPreview: replyBody.slice(0, 280), disposition: ai.disposition },
      },
    });
  }

  console.log(
    `[outreach-module-auto-reply] sent enrollment ${enrollment._id} turn=${autoReplyTurn} disposition=${ai.disposition}`
  );

  return {
    sent: true,
    disposition: ai.disposition,
    final: isFinalDisposition(ai.disposition),
  };
}

module.exports = {
  maybeAutoReplyOutreachModuleAfterCandidateMessage,
  loadOutreachModuleAutoReplyContext,
  summarizeModulePlanSummary,
};
