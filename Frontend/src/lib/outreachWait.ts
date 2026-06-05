import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import { isQaEnv } from "@/lib/appEnv";

export type GmailWaitUnit = "minutes" | "hours" | "days";

const BASE_GMAIL_WAIT_UNIT_OPTIONS: { value: GmailWaitUnit; label: string }[] = [
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
];

const QA_MINUTES_OPTION: { value: GmailWaitUnit; label: string } = {
  value: "minutes",
  label: "minutes",
};

export function getGmailWaitUnitOptions(): { value: GmailWaitUnit; label: string }[] {
  if (!isQaEnv()) return BASE_GMAIL_WAIT_UNIT_OPTIONS;
  return [QA_MINUTES_OPTION, ...BASE_GMAIL_WAIT_UNIT_OPTIONS];
}

/** @deprecated Use getGmailWaitUnitOptions() for env-aware options. */
export const GMAIL_WAIT_UNIT_OPTIONS = BASE_GMAIL_WAIT_UNIT_OPTIONS;

type WaitFields = Pick<OutreachTouchpointDraft, "waitDays" | "waitHours" | "waitMinutes">;

export function inferGmailWaitDisplay(
  touchpoint: WaitFields
): { amount: number; unit: GmailWaitUnit } {
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);

  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return { amount: waitMinutes, unit: "minutes" };
  }

  if (waitHours > 0 && waitDays === 0) {
    if (waitHours >= 24 && waitHours % 24 === 0) {
      return { amount: waitHours / 24, unit: "days" };
    }
    return { amount: waitHours, unit: "hours" };
  }

  return { amount: waitDays, unit: "days" };
}

export function maxWaitAmountForUnit(unit: GmailWaitUnit): number {
  if (unit === "minutes") return 120;
  if (unit === "hours") return 168;
  return 30;
}

export function clampWaitAmount(amount: number, unit: GmailWaitUnit): number {
  const max = maxWaitAmountForUnit(unit);
  return Math.min(max, Math.max(0, Math.floor(amount) || 0));
}

export function gmailWaitFromDisplay(
  amount: number,
  unit: GmailWaitUnit
): Pick<OutreachTouchpointDraft, "waitDays" | "waitHours" | "waitMinutes" | "waitUnit"> {
  const n = clampWaitAmount(amount, unit);
  if (unit === "minutes") {
    if (!isQaEnv()) {
      return { waitHours: 0, waitDays: n, waitMinutes: 0, waitUnit: "days" };
    }
    return { waitHours: 0, waitDays: 0, waitMinutes: n, waitUnit: "minutes" };
  }
  if (unit === "hours") {
    return { waitHours: n, waitDays: 0, waitMinutes: 0, waitUnit: "hours" };
  }
  return { waitHours: 0, waitDays: n, waitMinutes: 0, waitUnit: "days" };
}

export function formatGmailWaitConnectorLabel(touchpoint: WaitFields): string {
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);

  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return waitMinutes === 1 ? "1 minute later" : `${waitMinutes} minutes later`;
  }

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
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);
  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return waitMinutes / 60;
  }
  if (waitHours > 0 && waitDays === 0) return waitHours;
  return waitDays * 24;
}

export function gmailWaitUsesSendAt(unit: GmailWaitUnit): boolean {
  return unit === "days";
}
