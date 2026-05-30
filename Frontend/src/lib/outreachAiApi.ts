import { authHeaders } from "@/lib/auth";
import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";
import { ensureWhatsAppSequenceWithFallbacks } from "@/lib/whatsappOutreach";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type GenerateOutreachChannel = "gmail" | "whatsapp";

export type GenerateGmailOutreachFromJdResult = {
  channel: "gmail";
  planName: string;
  jobDescription: string;
  touchpoints: OutreachTouchpointDraft[];
  touchpointCount: number;
};

export type GenerateWhatsAppOutreachFromJdResult = {
  channel: "whatsapp";
  planName: string;
  jobDescription: string;
  touchpoints: WhatsAppTouchpointDraft[];
  touchpointCount: number;
};

export type GenerateOutreachFromJdResult =
  | GenerateGmailOutreachFromJdResult
  | GenerateWhatsAppOutreachFromJdResult;

function parseGmailTouchpoint(raw: unknown, index: number): OutreachTouchpointDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : "";
  if (!subject || !body) return null;
  return {
    order: typeof o.order === "number" ? o.order : index + 1,
    label: typeof o.label === "string" ? o.label : `Step ${index + 1}`,
    subject,
    body,
    waitDays: typeof o.waitDays === "number" ? Math.max(0, o.waitDays) : 0,
  };
}

function parseWhatsAppTouchpoint(raw: unknown, index: number): WhatsAppTouchpointDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const body = typeof o.body === "string" ? o.body.trim() : "";
  if (!body) return null;
  return {
    order: typeof o.order === "number" ? o.order : index + 1,
    label: typeof o.label === "string" ? o.label : `Step ${index + 1}`,
    body,
    waitHours: typeof o.waitHours === "number" ? Math.max(0, o.waitHours) : 0,
    templateId: typeof o.templateId === "string" ? o.templateId : undefined,
    isNoReplyFallback: Boolean(o.isNoReplyFallback),
    isReplyFollowUp: Boolean(o.isReplyFollowUp),
  };
}

export async function generateOutreachSequenceFromJd(
  token: string,
  jobDescription: string,
  options?: { planName?: string; channel?: GenerateOutreachChannel }
): Promise<GenerateOutreachFromJdResult> {
  const channel = options?.channel === "whatsapp" ? "whatsapp" : "gmail";
  const trimmedJd = jobDescription.trim();
  const res = await fetch(`${apiBase()}/api/outreach/ai/generate-sequence`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      jobDescription: trimmedJd,
      planName: options?.planName?.trim() || "",
      channel,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to generate outreach sequence"
    );
  }

  const planName =
    typeof data.planName === "string" ? data.planName : "AI outreach sequence";

  if (channel === "whatsapp") {
    const touchpoints = Array.isArray(data.touchpoints)
      ? ensureWhatsAppSequenceWithFallbacks(
          data.touchpoints
            .map(parseWhatsAppTouchpoint)
            .filter((t): t is WhatsAppTouchpointDraft => t !== null)
        )
      : [];
    if (touchpoints.length === 0) {
      throw new Error("AI returned an empty WhatsApp sequence. Try again.");
    }
    return {
      channel: "whatsapp",
      planName,
      jobDescription: trimmedJd,
      touchpoints,
      touchpointCount:
        typeof data.touchpointCount === "number" ? data.touchpointCount : touchpoints.length,
    };
  }

  const touchpoints = Array.isArray(data.touchpoints)
    ? data.touchpoints
        .map(parseGmailTouchpoint)
        .filter((t): t is OutreachTouchpointDraft => t !== null)
    : [];
  if (touchpoints.length === 0) {
    throw new Error("AI returned an empty sequence. Try again.");
  }
  return {
    channel: "gmail",
    planName,
    jobDescription: trimmedJd,
    touchpoints,
    touchpointCount:
      typeof data.touchpointCount === "number" ? data.touchpointCount : touchpoints.length,
  };
}
