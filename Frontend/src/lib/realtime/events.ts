/** Must match Backend/src/realtime/events.js */
export const RealtimeEvents = {
  CONNECTED: "realtime.connected",
  CAMPAIGN_THREAD_UPDATED: "campaign.thread.updated",
  CANDIDATE_SEARCH_POLL: "candidates.search.poll",
} as const;

export type RealtimeEventName = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];

export type CampaignThreadUpdatedPayload = {
  campaignId: string;
  candidateKey: string;
  newMessages: number;
  hasNewCandidateReply: boolean;
  source: string;
  at: string;
  /** Set when automated outreach finishes for the whole campaign. */
  outreachStatus?: "completed";
};

export type CandidateSearchPollPayload = {
  sessionId: string;
  attempt: number;
  totalDocs: number;
  candidateCount: number;
  docs: unknown[];
  candidates: unknown[];
  polling: boolean;
  done: boolean;
  /** true on the final socket frame — stop the badge loader */
  status?: boolean;
  at: string;
};

export type RealtimeMessage =
  | { event: typeof RealtimeEvents.CONNECTED; data: { userId: string } }
  | {
      event: typeof RealtimeEvents.CAMPAIGN_THREAD_UPDATED;
      data: CampaignThreadUpdatedPayload;
    }
  | {
      event: typeof RealtimeEvents.CANDIDATE_SEARCH_POLL;
      data: CandidateSearchPollPayload;
    };
