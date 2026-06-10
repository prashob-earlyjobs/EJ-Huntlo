import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";

export type WhatsAppWaitUnit = "minutes" | "hours" | "days";

export const WHATSAPP_WAIT_UNIT_OPTIONS: { value: WhatsAppWaitUnit; label: string }[] = [
  { value: "minutes", label: "minutes" },
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
];

export function getWhatsAppWaitUnitOptions(): { value: WhatsAppWaitUnit; label: string }[] {
  return WHATSAPP_WAIT_UNIT_OPTIONS;
}

type WaitFields = Pick<WhatsAppTouchpointDraft, "waitHours" | "waitMinutes">;

function inferFromWaitHoursOnly(waitHours: number): { amount: number; unit: WhatsAppWaitUnit } {
  if (waitHours <= 0) return { amount: 0, unit: "hours" };
  if (waitHours >= 24 && waitHours % 24 === 0) {
    return { amount: waitHours / 24, unit: "days" };
  }
  return { amount: waitHours, unit: "hours" };
}

export function inferWhatsAppWaitDisplay(
  touchpoint: WaitFields | number
): { amount: number; unit: WhatsAppWaitUnit } {
  if (typeof touchpoint === "number") {
    return inferFromWaitHoursOnly(touchpoint);
  }
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  if (waitMinutes > 0 && waitHours === 0) {
    return { amount: waitMinutes, unit: "minutes" };
  }
  return inferFromWaitHoursOnly(waitHours);
}

export function maxWhatsAppWaitAmountForUnit(unit: WhatsAppWaitUnit): number {
  if (unit === "minutes") return 120;
  if (unit === "hours") return 168;
  return 30;
}

export function clampWhatsAppWaitAmount(amount: number, unit: WhatsAppWaitUnit): number {
  const max = maxWhatsAppWaitAmountForUnit(unit);
  return Math.min(max, Math.max(0, Math.floor(amount) || 0));
}

export function whatsAppWaitFromDisplay(
  amount: number,
  unit: WhatsAppWaitUnit
): Pick<WhatsAppTouchpointDraft, "waitHours" | "waitMinutes"> {
  const n = clampWhatsAppWaitAmount(amount, unit);
  if (unit === "minutes") {
    return { waitHours: 0, waitMinutes: n };
  }
  if (unit === "hours") {
    return { waitHours: n, waitMinutes: 0 };
  }
  return { waitHours: n * 24, waitMinutes: 0 };
}

export function formatWhatsAppWaitLabel(touchpoint: WaitFields | number): string {
  if (typeof touchpoint === "number") {
    return formatWhatsAppWaitLabel({ waitHours: touchpoint, waitMinutes: 0 });
  }
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);

  if (waitMinutes > 0 && waitHours === 0) {
    return waitMinutes === 1 ? "1 minute later" : `${waitMinutes} minutes later`;
  }
  if (waitHours <= 0) return "Send immediately";
  if (waitHours < 24) {
    return waitHours === 1 ? "1 hour later" : `${waitHours} hours later`;
  }
  const days = Math.round(waitHours / 24);
  return days === 1 ? "1 day later" : `${days} days later`;
}
