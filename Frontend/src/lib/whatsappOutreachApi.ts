import { authHeaders } from "@/lib/auth";
import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";

export type WhatsAppOutreachPlanRecord = {
  id: string;
  channel: "whatsapp";
  name: string;
  touchpoints: WhatsAppTouchpointDraft[];
  touchpointCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function parseTouchpoint(raw: unknown): WhatsAppTouchpointDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const order = Number(o.order);
  if (!Number.isFinite(order) || order < 1) return null;
  return {
    order,
    label: typeof o.label === "string" ? o.label : "",
    body: typeof o.body === "string" ? o.body : "",
    waitHours: Math.max(0, Number(o.waitHours) || 0),
    ...(typeof o.templateId === "string" && o.templateId.trim()
      ? { templateId: o.templateId.trim() }
      : {}),
    ...(o.isNoReplyFallback ? { isNoReplyFallback: true } : {}),
  };
}

function parsePlan(raw: unknown): WhatsAppOutreachPlanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const name = typeof o.name === "string" ? o.name : "";
  if (!id || !name) return null;
  const touchpoints = Array.isArray(o.touchpoints)
    ? o.touchpoints.map(parseTouchpoint).filter((t): t is WhatsAppTouchpointDraft => t !== null)
    : [];
  return { id, channel: "whatsapp", name, touchpoints };
}

export async function fetchWhatsAppOutreachPlan(
  token: string,
  planId: string
): Promise<WhatsAppOutreachPlanRecord> {
  const res = await fetch(`${apiBase()}/api/outreach/whatsapp/plans/${planId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load WhatsApp sequence"
    );
  }
  const plan = parsePlan(data.plan);
  if (!plan) throw new Error("Invalid WhatsApp sequence response");
  return plan;
}

export async function saveWhatsAppOutreachPlan(
  token: string,
  payload: {
    planId?: string | "new";
    name: string;
    touchpoints: WhatsAppTouchpointDraft[];
  }
): Promise<WhatsAppOutreachPlanRecord> {
  const isNew = !payload.planId || payload.planId === "new";
  const url = isNew
    ? `${apiBase()}/api/outreach/whatsapp/plans`
    : `${apiBase()}/api/outreach/whatsapp/plans/${payload.planId}`;
  const res = await fetch(url, {
    method: isNew ? "POST" : "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      name: payload.name,
      channel: "whatsapp",
      touchpoints: payload.touchpoints,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to save WhatsApp sequence"
    );
  }
  const plan = parsePlan(data.plan);
  if (!plan) throw new Error("Invalid WhatsApp sequence response");
  return plan;
}
