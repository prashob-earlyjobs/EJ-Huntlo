const { EVENTS } = require("./events");
const hub = require("./hub");

/**
 * Push campaign thread changes to the user's open dashboard sessions.
 * Called from outreach/reply services — not from HTTP controllers.
 */
function notifyCampaignThreadUpdated(userId, payload) {
  return hub.emitToUser(String(userId), EVENTS.CAMPAIGN_THREAD_UPDATED, {
    campaignId: String(payload.campaignId || ""),
    candidateKey: String(payload.candidateKey || ""),
    newMessages: Number(payload.newMessages) || 0,
    hasNewCandidateReply: Boolean(payload.hasNewCandidateReply),
    source: payload.source || "sync",
    at: new Date().toISOString(),
  });
}

module.exports = { notifyCampaignThreadUpdated };
