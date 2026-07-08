import { authHeaders } from "@/lib/auth";
import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";
import { ensureWhatsAppSequenceWithFallbacks } from "@/lib/whatsappOutreach";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type GenerateOutreachChannel = "gmail" | "whatsapp";

export type GenerateGmailOutreachFromJdResult = {
  channel: "gmail";
  planName: string;
  jobTitle: string;
  jobDescription: string;
  touchpoints: OutreachTouchpointDraft[];
  touchpointCount: number;
};

export type GenerateWhatsAppOutreachFromJdResult = {
  channel: "whatsapp";
  planName: string;
  jobTitle: string;
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
    waitHours: typeof o.waitHours === "number" ? Math.max(0, o.waitHours) : 0,
  };
}

function parseWhatsAppTouchpoint(raw: unknown, index: number): WhatsAppTouchpointDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const body = typeof o.body === "string" ? o.body.trim() : "";
  if (!body) return null;
  const parsedOrder = Number(o.order);
  return {
    order: Number.isFinite(parsedOrder) && parsedOrder > 0 ? parsedOrder : index + 1,
    label: typeof o.label === "string" ? o.label : `Step ${index + 1}`,
    body,
    waitHours: typeof o.waitHours === "number" ? Math.max(0, o.waitHours) : 0,
    templateId: typeof o.templateId === "string" ? o.templateId : undefined,
    isNoReplyFallback: Boolean(o.isNoReplyFallback),
    isReplyFollowUp: Boolean(o.isReplyFollowUp),
  };
}

function parseTopLevelReplyQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item || "").trim()).filter(Boolean);
}

function mergeReplyQuestionsIntoTouchpoints(
  touchpoints: WhatsAppTouchpointDraft[],
  replyQuestions: string[]
): WhatsAppTouchpointDraft[] {
  const byReplyFlag = touchpoints
    .filter((tp) => tp.isReplyFollowUp)
    .sort((a, b) => a.order - b.order);
  if (byReplyFlag.length > 0) return touchpoints;

  const byOrder = touchpoints
    .filter((tp) => tp.order > 3 && !tp.isNoReplyFallback)
    .sort((a, b) => a.order - b.order);
  if (byOrder.length > 0) {
    const automated = touchpoints.filter((tp) => tp.order <= 3 || tp.isNoReplyFallback);
    return [
      ...automated,
      ...byOrder.map((tp, index) => ({
        ...tp,
        order: 4 + index,
        isReplyFollowUp: true,
        isNoReplyFallback: false,
        label: tp.label || `Reply question ${index + 1}`,
      })),
    ];
  }

  if (replyQuestions.length === 0) return touchpoints;

  const automated = touchpoints.filter((tp) => tp.order <= 3 || tp.isNoReplyFallback);
  const mergedReply = replyQuestions.map((body, index) => ({
    order: 4 + index,
    label: `Reply question ${index + 1}`,
    body,
    waitHours: 0,
    isNoReplyFallback: false,
    isReplyFollowUp: true,
  }));
  return [...automated, ...mergedReply];
}

export async function generateOutreachSequenceFromJd(
  token: string,
  jobDescription: string,
  options?: { planName?: string; channel?: GenerateOutreachChannel; jobTitle?: string }
): Promise<GenerateOutreachFromJdResult> {
  const channel = options?.channel === "whatsapp" ? "whatsapp" : "gmail";
  const trimmedJd = jobDescription.trim();
  const jobTitle = String(options?.jobTitle || "").trim();
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
    const topLevelReplyQuestions = parseTopLevelReplyQuestions(data.replyQuestions);
    const parsedTouchpoints = Array.isArray(data.touchpoints)
      ? (data.touchpoints as unknown[])
          .map(parseWhatsAppTouchpoint)
          .filter((t): t is WhatsAppTouchpointDraft => t !== null)
      : [];
    const touchpoints = ensureWhatsAppSequenceWithFallbacks(
      mergeReplyQuestionsIntoTouchpoints(parsedTouchpoints, topLevelReplyQuestions),
      { minReplyFollowups: 4 }
    );
    if (touchpoints.length === 0) {
      throw new Error("AI returned an empty WhatsApp sequence. Try again.");
    }
    return {
      channel: "whatsapp",
      planName,
      jobTitle,
      jobDescription: trimmedJd,
      touchpoints,
      touchpointCount:
        typeof data.touchpointCount === "number" ? data.touchpointCount : touchpoints.length,
    };
  }

  const touchpoints = Array.isArray(data.touchpoints)
    ? (data.touchpoints as unknown[])
        .map(parseGmailTouchpoint)
        .filter((t): t is OutreachTouchpointDraft => t !== null)
    : [];
  if (touchpoints.length === 0) {
    throw new Error("AI returned an empty sequence. Try again.");
  }
  return {
    channel: "gmail",
    planName,
    jobTitle,
    jobDescription: trimmedJd,
    touchpoints,
    touchpointCount:
      typeof data.touchpointCount === "number" ? data.touchpointCount : touchpoints.length,
  };
}
