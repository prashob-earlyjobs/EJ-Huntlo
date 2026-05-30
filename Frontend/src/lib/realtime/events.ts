/** Must match Backend/src/realtime/events.js */
export const RealtimeEvents = {
  CONNECTED: "realtime.connected",
  CAMPAIGN_THREAD_UPDATED: "campaign.thread.updated",
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

export type RealtimeMessage =
  | { event: typeof RealtimeEvents.CONNECTED; data: { userId: string } }
  | {
      event: typeof RealtimeEvents.CAMPAIGN_THREAD_UPDATED;
      data: CampaignThreadUpdatedPayload;
    };
