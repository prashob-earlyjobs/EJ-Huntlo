export const CAMPAIGN_MAX_CONTACTS = 200;

export function campaignContactSlotsRemaining(currentCount: number): number {
  return Math.max(0, CAMPAIGN_MAX_CONTACTS - Math.max(0, currentCount));
}

export function campaignContactLimitMessage(): string {
  return `Each campaign can have at most ${CAMPAIGN_MAX_CONTACTS} contacts.`;
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
