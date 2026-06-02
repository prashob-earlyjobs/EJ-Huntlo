import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";

export type GmailWaitUnit = "hours" | "days";

export const GMAIL_WAIT_UNIT_OPTIONS: { value: GmailWaitUnit; label: string }[] = [
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
];

type WaitFields = Pick<OutreachTouchpointDraft, "waitDays" | "waitHours">;

export function inferGmailWaitDisplay(
  touchpoint: WaitFields
): { amount: number; unit: GmailWaitUnit } {
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);

  if (waitHours > 0 && waitDays === 0) {
    if (waitHours >= 24 && waitHours % 24 === 0) {
      return { amount: waitHours / 24, unit: "days" };
    }
    return { amount: waitHours, unit: "hours" };
  }

  return { amount: waitDays, unit: "days" };
}

export function maxWaitAmountForUnit(unit: GmailWaitUnit): number {
  return unit === "hours" ? 168 : 30;
}

export function clampWaitAmount(amount: number, unit: GmailWaitUnit): number {
  const max = maxWaitAmountForUnit(unit);
  return Math.min(max, Math.max(0, Math.floor(amount) || 0));
}

export function gmailWaitFromDisplay(
  amount: number,
  unit: GmailWaitUnit
): Pick<OutreachTouchpointDraft, "waitDays" | "waitHours" | "waitUnit"> {
  const n = clampWaitAmount(amount, unit);
  if (unit === "hours") {
    return { waitHours: n, waitDays: 0, waitUnit: "days" };
  }
  return { waitHours: 0, waitDays: n, waitUnit: "days" };
}

export function formatGmailWaitConnectorLabel(touchpoint: WaitFields): string {
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);

  if (waitHours > 0 && waitDays === 0) {
    if (waitHours === 1) return "1 hour later";
    if (waitHours < 24) return `${waitHours} hours later`;
    const days = Math.round(waitHours / 24);
    if (days === 1) return "1 day later";
    return `${days} days later`;
  }

  if (waitDays === 0) return "Next step";
  return waitDays === 1 ? "1 day later" : `${waitDays} days later`;
}

export function touchpointDelayHours(touchpoint: WaitFields): number {
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);
  if (waitHours > 0 && waitDays === 0) return waitHours;
  return waitDays * 24;
}
