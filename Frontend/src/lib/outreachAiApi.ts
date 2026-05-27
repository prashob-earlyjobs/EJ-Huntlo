import { authHeaders } from "@/lib/auth";
import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type GenerateOutreachFromJdResult = {
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  touchpointCount: number;
};

function parseTouchpoint(raw: unknown, index: number): OutreachTouchpointDraft | null {
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

export async function generateOutreachSequenceFromJd(
  token: string,
  jobDescription: string,
  options?: { planName?: string }
): Promise<GenerateOutreachFromJdResult> {
  const res = await fetch(`${apiBase()}/api/outreach/ai/generate-sequence`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      jobDescription: jobDescription.trim(),
      planName: options?.planName?.trim() || "",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to generate outreach sequence"
    );
  }
  const touchpoints = Array.isArray(data.touchpoints)
    ? data.touchpoints
        .map(parseTouchpoint)
        .filter((t): t is OutreachTouchpointDraft => t !== null)
    : [];
  if (touchpoints.length === 0) {
    throw new Error("AI returned an empty sequence. Try again.");
  }
  return {
    planName: typeof data.planName === "string" ? data.planName : "AI outreach sequence",
    touchpoints,
    touchpointCount:
      typeof data.touchpointCount === "number" ? data.touchpointCount : touchpoints.length,
  };
}
