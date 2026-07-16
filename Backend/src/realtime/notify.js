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

/**
 * Candidate search poll progress → one user (all their tabs).
 * @param {string} userId
 * @param {object} payload
 */
function emitCandidateSearchPoll(userId, payload = {}) {
  if (!userId) return 0;
  const done = Boolean(payload.done);
  return hub.emitToUser(String(userId), EVENTS.CANDIDATE_SEARCH_POLL, {
    sessionId: String(payload.sessionId || ""),
    attempt: typeof payload.attempt === "number" ? payload.attempt : 0,
    totalDocs:
      typeof payload.totalDocs === "number" ? payload.totalDocs : 0,
    candidateCount:
      typeof payload.candidateCount === "number"
        ? payload.candidateCount
        : Array.isArray(payload.docs)
          ? payload.docs.length
          : 0,
    docs: Array.isArray(payload.docs) ? payload.docs : [],
    candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
    polling: done ? false : payload.polling !== false,
    done,
    /** true on the final poll frame so the FE can stop the loader */
    status: done ? true : Boolean(payload.status),
    at: new Date().toISOString(),
  });
}

/** Same payload to every connected client. */
function broadcastCandidateSearchPoll(payload = {}) {
  const done = Boolean(payload.done);
  return hub.broadcast(EVENTS.CANDIDATE_SEARCH_POLL, {
    sessionId: String(payload.sessionId || ""),
    attempt: typeof payload.attempt === "number" ? payload.attempt : 0,
    totalDocs:
      typeof payload.totalDocs === "number" ? payload.totalDocs : 0,
    candidateCount:
      typeof payload.candidateCount === "number"
        ? payload.candidateCount
        : Array.isArray(payload.docs)
          ? payload.docs.length
          : 0,
    docs: Array.isArray(payload.docs) ? payload.docs : [],
    candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
    polling: done ? false : payload.polling !== false,
    done,
    status: done ? true : Boolean(payload.status),
    at: new Date().toISOString(),
  });
}

module.exports = {
  notifyCampaignThreadUpdated,
  emitCandidateSearchPoll,
  broadcastCandidateSearchPoll,
};
