/** Outbound event names sent to the browser over WebSocket */
const EVENTS = {
  CONNECTED: "realtime.connected",
  CAMPAIGN_THREAD_UPDATED: "campaign.thread.updated",
  CANDIDATE_SEARCH_POLL: "candidates.search.poll",
};

module.exports = { EVENTS };
