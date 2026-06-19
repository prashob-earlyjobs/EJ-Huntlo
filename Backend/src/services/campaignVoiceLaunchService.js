const Campaign = require("../models/Campaign");
const { findCampaignDocumentInScope } = require("../utils/campaignScope");
/**
 * Voice-call launch only. Uses Hunar API + campaign_voice_calls via webhooks.
 * Does not create CampaignSequenceEnrollment rows (gmail/whatsapp).
 */
const {  loadAllContactsForCampaign,
  loadContactsByCandidateKeys,
} = require("./campaignContactService");
const { getActiveRevealJobForCampaign } = require("./campaignRevealJobService");
const { createHunarBulkCalls } = require("./hunarVoiceCallService");
const {
  assertVoiceCallCreditsAvailable,
  seedPendingVoiceCalls,
  logVoiceCallCreditUsage,
} = require("./voiceCallCreditsService");
const { resolveAndSyncVoiceAgentForLaunch } = require("./voiceLaunchPromptService");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");

async function launchVoiceCampaign(actorUserId, campaignId, options = {}) {
  const activeRevealJob = await getActiveRevealJobForCampaign(actorUserId, campaignId);
  if (activeRevealJob) {
    const err = new Error(
      "Contact unveil is still in progress. Wait for it to finish before launching."
    );
    err.code = "REVEAL_IN_PROGRESS";
    err.statusCode = 409;
    throw err;
  }

  const campaign = await findCampaignDocumentInScope(actorUserId, campaignId);
  if (campaign.outreachChannel !== "voice_call") {
    const err = new Error("This campaign is not configured for AI voice calls.");
    err.statusCode = 400;
    throw err;
  }

  if (!String(campaign.jobDescription || "").trim()) {
    const err = new Error("Add a job description before launching AI voice calls.");
    err.statusCode = 400;
    throw err;
  }

  if (
    !String(campaign.hunarVoiceAgentId || campaign.hunarVoiceAgent?.id || "").trim()
  ) {
    const err = new Error(
      "Save the voice agent in the Editor tab before launching calls."
    );
    err.statusCode = 400;
    throw err;
  }

  if (campaign.outreachStatus === "active") {
    const err = new Error("This voice campaign is already active.");
    err.statusCode = 409;
    throw err;
  }

  const candidateKeys = Array.isArray(options.candidateKeys)
    ? options.candidateKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  const contacts =
    candidateKeys.length > 0
      ? await loadContactsByCandidateKeys(campaignId, candidateKeys)
      : await loadAllContactsForCampaign(campaignId);

  if (contacts.length === 0) {
    const err = new Error("Add contacts to this campaign before launching.");
    err.statusCode = 400;
    throw err;
  }

  const dialableContacts = contacts.filter((contact) =>
    Boolean(normalizeToWhatsAppDigits(contact.phone))
  );
  if (dialableContacts.length === 0) {
    const err = new Error("No selected contacts have a valid phone number for AI voice calls.");
    err.statusCode = 400;
    err.code = "VOICE_NO_VALID_PHONES";
    throw err;
  }

  await assertVoiceCallCreditsAvailable(actorUserId, dialableContacts.length);

  await resolveAndSyncVoiceAgentForLaunch(campaign);

  const result = await createHunarBulkCalls({
    campaign,
    contacts: dialableContacts,
  });

  await seedPendingVoiceCalls({
    campaign,
    contacts: dialableContacts,
    requestId: result.requestId,
  });
  await logVoiceCallCreditUsage(actorUserId, result.dialedCount);

  const now = new Date();
  campaign.outreachStatus = "active";
  campaign.outreachStartedAt = now;
  await campaign.save();

  return {
    outreachStatus: "active",
    dialedCount: result.dialedCount,
    skipped: Math.max(0, contacts.length - result.dialedCount),
    requestId: result.requestId,
    hunarResponse: result.response,
  };
}

module.exports = {
  launchVoiceCampaign,
};
