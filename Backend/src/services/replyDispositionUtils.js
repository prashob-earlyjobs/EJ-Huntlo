const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const CampaignOutreachReply = require("../models/CampaignOutreachReply");
const { toReplyPreview } = require("./emailMimeBodyUtils");

function dispositionLabel(disposition) {
  if (disposition === "interested") {
    return "Candidate interested — conversation complete";
  }
  if (disposition === "not_interested") {
    return "Candidate not interested — conversation complete";
  }
  return "";
}

function isFinalDisposition(disposition) {
  return disposition === "interested" || disposition === "not_interested";
}

/**
 * Lightweight keyword classifier for inbound email replies (works without AI).
 */
function inferReplyDispositionFromText(text) {
  const s = String(text || "").trim().toLowerCase();
  if (!s) return "unknown";

  const notInterestedPatterns = [
    /\bnot\s+interested\b/,
    /\bno\s+longer\s+interested\b/,
    /\bnot\s+looking\b/,
    /\bplease\s+(remove|unsubscribe|stop)\b/,
    /\bunsubscribe\b/,
    /\bstop\s+(emailing|contacting|messaging|mailing)\b/,
    /\bdon'?t\s+contact\b/,
    /\bnot\s+a\s+good\s+fit\b/,
    /\bi'?ll\s+pass\b/,
    /\bno\s+thanks?\b/,
    /\bnot\s+at\s+this\s+time\b/,
    /\bdecline\b/,
    /\bpass\s+on\s+this\b/,
  ];

  for (const re of notInterestedPatterns) {
    if (re.test(s)) return "not_interested";
  }

  const interestedPatterns = [
    /\byes[,!]?\s+i(?:'m| am)?\s+interested\b/,
    /\bvery\s+interested\b/,
    /\bwould\s+love\s+to\b/,
    /\bhappy\s+to\s+(chat|speak|talk|connect|discuss)\b/,
    /\blet'?s\s+schedule\b/,
    /\bsounds\s+interesting\b/,
    /\binterested\s+in\s+(learning|hearing|the|this)\b/,
    /\bkeen\s+to\s+(learn|hear|chat|speak)\b/,
  ];

  for (const re of interestedPatterns) {
    if (re.test(s)) return "interested";
  }

  return "unknown";
}

function responseStatusForDisposition(disposition) {
  if (disposition === "interested") return "interested";
  if (disposition === "not_interested") return "not_interested";
  return "replied";
}

async function applyReplyDispositionToModuleEnrollment({
  enrollment,
  disposition,
  latestBody = "",
  source = "inference",
}) {
  if (!isFinalDisposition(disposition)) return false;

  const enrollmentId = enrollment?._id;
  const campaignId = String(enrollment?.outreachModuleCampaignId || "");
  const candidateRefId = String(enrollment?.candidateRefId || "");
  if (!enrollmentId || !campaignId) return false;

  const currentDisposition = String(enrollment.replyDisposition || "unknown");
  if (isFinalDisposition(currentDisposition) && currentDisposition !== disposition) {
    return false;
  }
  if (currentDisposition === disposition) {
    return await syncEmbeddedCandidateDisposition({
      campaignId,
      candidateRefId,
      contactEmail: enrollment.contactEmail,
      disposition,
      latestBody,
      source,
      skipIfAlreadySet: true,
    });
  }

  const now = new Date();
  await OutreachModuleEnrollment.updateOne(
    { _id: enrollmentId },
    {
      $set: {
        replyDisposition: disposition,
        replyDispositionAt: now,
        lastError: dispositionLabel(disposition),
        ...(enrollment.status === "active" ? { status: "paused" } : {}),
      },
    }
  );

  await syncEmbeddedCandidateDisposition({
    campaignId,
    candidateRefId,
    contactEmail: enrollment.contactEmail,
    disposition,
    latestBody,
    source,
    skipIfAlreadySet: false,
  });

  return true;
}

async function syncEmbeddedCandidateDisposition({
  campaignId,
  candidateRefId,
  contactEmail,
  disposition,
  latestBody,
  source,
  skipIfAlreadySet,
}) {
  const { updateEmbeddedCandidateAfterSend } = require("./outreachModuleSendService");
  const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");

  const campaign = await OutreachModuleCampaign.findById(campaignId).select("candidates").lean();
  if (!campaign) return false;

  const candidates = Array.isArray(campaign.candidates) ? campaign.candidates : [];
  const email = String(contactEmail || "").trim().toLowerCase();
  let candidate = candidateRefId
    ? candidates.find((c) => String(c.candidateRefId || "") === candidateRefId)
    : null;
  if (!candidate && email) {
    candidate = candidates.find(
      (c) => String(c.email || "").trim().toLowerCase() === email
    );
  }
  if (!candidate) return false;

  const current = String(candidate.responseStatus || "no_response");
  const target = responseStatusForDisposition(disposition);
  if (skipIfAlreadySet && current === target) return false;

  const preview = toReplyPreview(latestBody) || candidate.lastResponse || "Reply received";
  await updateEmbeddedCandidateAfterSend(campaignId, candidateRefId || candidate.candidateRefId, {
    responseStatus: target,
    matchEmail: contactEmail,
    lastResponse: preview,
    nextAction: disposition === "not_interested" ? "Archive" : "Follow up",
    interaction: {
      type: "email",
      summary:
        source === "ai"
          ? `AI classified: ${disposition.replace("_", " ")}`
          : `Reply classified: ${disposition.replace("_", " ")}`,
      content: { bodyPreview: preview.slice(0, 280), disposition },
    },
  });

  return true;
}

async function getLatestCandidateReplyBody(enrollmentId) {
  const latest = await CampaignOutreachReply.findOne({
    enrollmentId,
    isFromCandidate: true,
  })
    .sort({ receivedAt: -1 })
    .select("bodyText snippet")
    .lean();

  return String(latest?.bodyText || latest?.snippet || "").trim();
}

async function inferAndApplyReplyDispositionForEnrollment(enrollment, { source = "inference" } = {}) {
  if (!enrollment?._id) return "unknown";
  if (isFinalDisposition(enrollment.replyDisposition)) {
    return enrollment.replyDisposition;
  }

  const latestBody = await getLatestCandidateReplyBody(enrollment._id);
  const disposition = inferReplyDispositionFromText(latestBody);
  if (!isFinalDisposition(disposition)) return "unknown";

  await applyReplyDispositionToModuleEnrollment({
    enrollment,
    disposition,
    latestBody,
    source,
  });
  return disposition;
}

async function syncReplyDispositionsForCampaign(campaignId) {
  const enrollments = await OutreachModuleEnrollment.find({
    outreachModuleCampaignId: campaignId,
    hasReply: true,
    replyDisposition: { $in: ["unknown", null, ""] },
  })
    .select(
      "_id outreachModuleCampaignId candidateRefId contactEmail replyDisposition status hasReply"
    )
    .lean();

  let updated = 0;
  for (const enrollment of enrollments) {
    const disposition = await inferAndApplyReplyDispositionForEnrollment(enrollment);
    if (isFinalDisposition(disposition)) updated += 1;
  }
  return updated;
}

module.exports = {
  dispositionLabel,
  isFinalDisposition,
  inferReplyDispositionFromText,
  responseStatusForDisposition,
  applyReplyDispositionToModuleEnrollment,
  inferAndApplyReplyDispositionForEnrollment,
  syncReplyDispositionsForCampaign,
  getLatestCandidateReplyBody,
  syncEmbeddedCandidateDisposition,
};
