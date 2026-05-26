"use client";

import { useEffect } from "react";

import { realtimeClient } from "@/lib/realtime/client";
import type { CampaignThreadUpdatedPayload } from "@/lib/realtime/events";

/**
 * Subscribe to live campaign thread updates for one campaign (WebSocket only).
 * HTTP fetch stays in campaignEmailThread.ts — this only signals when to refresh.
 */
export function useCampaignThreadRealtime(
  campaignId: string | null | undefined,
  onThreadUpdated: (payload: CampaignThreadUpdatedPayload) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !campaignId) return;

    const unsubscribe = realtimeClient.subscribeThreadUpdated((payload) => {
      if (payload.campaignId === campaignId) {
        onThreadUpdated(payload);
      }
    });

    return unsubscribe;
  }, [campaignId, enabled, onThreadUpdated]);
}
