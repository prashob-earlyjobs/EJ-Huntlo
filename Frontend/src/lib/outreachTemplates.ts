export function createEmptyTouchpoint(order: number): OutreachTouchpointDraft {
  return {
    order,
    label: order === 1 ? "First message" : `Follow-up ${order - 1}`,
    subject: "",
    body: "",
    waitDays: order === 1 ? 0 : 3,
    waitHours: 0,
  };
}

export type OutreachTouchpointDraft = {
  order: number;
  label: string;
  subject: string;
  body: string;
  waitDays: number;
  /** Sub-day delays; takes precedence over `waitDays` when scheduling sends. */
  waitHours?: number;
  /** HH:mm in `timezone` (IST = India Standard Time, UTC). */
  sendTime?: string;
  /** `IST` (India) or `UTC`. */
  timezone?: string;
  waitUnit?: "days";
};

export type EmailWaitUnit = "hours" | "days" | "business_days" | "weeks" | "months";

export const EMAIL_WAIT_UNIT_OPTIONS: { value: EmailWaitUnit; label: string }[] = [
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
  { value: "business_days", label: "business days" },
  { value: "weeks", label: "weeks" },
  { value: "months", label: "months" },
];

export function emailWaitFromDisplay(
  amount: number,
  unit: EmailWaitUnit
): { waitDays: number; waitHours: number } {
  const n = Math.max(0, Math.floor(amount) || 0);
  if (unit === "hours") return { waitDays: 0, waitHours: n };
  if (unit === "weeks") return { waitDays: n * 7, waitHours: 0 };
  if (unit === "months") return { waitDays: n * 30, waitHours: 0 };
  return { waitDays: n, waitHours: 0 };
}

export function inferEmailWaitDisplay(
  waitDays: number,
  waitHours = 0
): { amount: number; unit: EmailWaitUnit } {
  const hours = Math.max(0, Number(waitHours) || 0);
  const days = Math.max(0, Number(waitDays) || 0);

  if (hours > 0 && days === 0) {
    if (hours >= 24 && hours % 24 === 0) {
      return { amount: hours / 24, unit: "days" };
    }
    return { amount: hours, unit: "hours" };
  }

  if (days <= 0) return { amount: 0, unit: "hours" };
  if (days >= 30 && days % 30 === 0) {
    return { amount: days / 30, unit: "months" };
  }
  if (days >= 7 && days % 7 === 0) {
    return { amount: days / 7, unit: "weeks" };
  }
  return { amount: days, unit: "business_days" };
}

export function emailWaitConnectorLabel(waitDays: number, waitHours = 0): string {
  const hours = Math.max(0, Number(waitHours) || 0);
  const days = Math.max(0, Number(waitDays) || 0);

  if (hours > 0 && days === 0) {
    if (hours === 1) return "1 hour later";
    if (hours < 24) return `${hours} hours later`;
    const dayCount = Math.round(hours / 24);
    if (dayCount === 1) return "1 day later";
    return `${dayCount} days later`;
  }

  if (days === 0) return "Next step";
  if (days === 1) return "1 day later";
  return `${days} days later`;
}

/** Outreach template from API (`GET /api/outreach/templates`). */
export type OutreachTemplateListItem = {
  id: string;
  name: string;
  description: string;
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  touchpointCount?: number;
  isGlobal: boolean;
  starterKey?: string | null;
  createdBy: string | null;
  createdByName?: string | null;
};
