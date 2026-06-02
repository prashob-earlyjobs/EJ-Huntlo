import type { CampaignOutreachStatus } from "@/lib/campaigns";

export const CAMPAIGN_MAX_CONTACTS = 200;

export const CAMPAIGN_CONTACTS_LOCKED_MESSAGE =
  "This campaign has already been launched. Contacts cannot be added after launch.";

export function isCampaignLaunched(
  outreachStatus?: CampaignOutreachStatus | string
): boolean {
  return (outreachStatus ?? "idle") !== "idle";
}

export function campaignContactSlotsRemaining(currentCount: number): number {
  return Math.max(0, CAMPAIGN_MAX_CONTACTS - Math.max(0, currentCount));
}

export function campaignContactLimitMessage(): string {
  return `Maximum ${CAMPAIGN_MAX_CONTACTS} contacts per campaign.`;
}

/**
 * Reject the whole add/import when incoming exceeds remaining slots (no partial add).
 */
export function validateCampaignContactBatch(
  currentCount: number,
  incomingCount: number
): { ok: true; remaining: number } | { ok: false; message: string; remaining: number } {
  const remaining = campaignContactSlotsRemaining(currentCount);
  const incoming = Math.max(0, incomingCount);
  if (incoming === 0) {
    return { ok: true, remaining };
  }
  if (remaining <= 0 || incoming > remaining) {
    return {
      ok: false,
      remaining,
      message: campaignContactLimitMessage(),
    };
  }
  return { ok: true, remaining };
}

/** Trim `incoming` so current + incoming does not exceed the campaign cap. */
export function sliceContactsToFit<T>(
  currentCount: number,
  incoming: T[]
): { allowed: T[]; rejectedCount: number } {
  const remaining = campaignContactSlotsRemaining(currentCount);
  if (remaining <= 0) {
    return { allowed: [], rejectedCount: incoming.length };
  }
  if (incoming.length <= remaining) {
    return { allowed: incoming, rejectedCount: 0 };
  }
  return {
    allowed: incoming.slice(0, remaining),
    rejectedCount: incoming.length - remaining,
  };
}

export function formatContactLimitToast(
  rejectedCount: number,
  addedCount: number
): string | null {
  if (rejectedCount <= 0) return null;
  if (addedCount <= 0) return campaignContactLimitMessage();
  return `Added ${addedCount} contact${addedCount === 1 ? "" : "s"}. ${rejectedCount} could not be added (limit is ${CAMPAIGN_MAX_CONTACTS} per campaign).`;
}
