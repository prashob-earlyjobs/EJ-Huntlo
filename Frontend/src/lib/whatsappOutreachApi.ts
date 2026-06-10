import { authHeaders } from "@/lib/auth";
import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";

export type WhatsAppCalendlyAutomation = {
  enabled: boolean;
  meetingUri?: string;
  meetingName?: string;
  schedulingUrl?: string;
  durationMinutes?: number;
  kind?: string;
};

export type WhatsAppOutreachPlanRecord = {
  id: string;
  channel: "whatsapp";
  name: string;
  jobDescription?: string;
  calendlyAutomation?: WhatsAppCalendlyAutomation;
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
    ...(Number(o.waitMinutes) > 0 ? { waitMinutes: Math.max(0, Number(o.waitMinutes) || 0) } : {}),
    ...(typeof o.templateId === "string" && o.templateId.trim()
      ? { templateId: o.templateId.trim() }
      : {}),
    ...(o.isNoReplyFallback ? { isNoReplyFallback: true } : {}),
    ...(o.isReplyFollowUp ? { isReplyFollowUp: true } : {}),
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
  const jobDescription =
    typeof o.jobDescription === "string" ? o.jobDescription.trim() : undefined;
  let calendlyAutomation: WhatsAppCalendlyAutomation | undefined;
  if (o.calendlyAutomation && typeof o.calendlyAutomation === "object") {
    const c = o.calendlyAutomation as Record<string, unknown>;
    calendlyAutomation = {
      enabled: Boolean(c.enabled),
      ...(typeof c.meetingUri === "string" ? { meetingUri: c.meetingUri } : {}),
      ...(typeof c.meetingName === "string" ? { meetingName: c.meetingName } : {}),
      ...(typeof c.schedulingUrl === "string" ? { schedulingUrl: c.schedulingUrl } : {}),
      ...(typeof c.durationMinutes === "number" ? { durationMinutes: c.durationMinutes } : {}),
      ...(typeof c.kind === "string" ? { kind: c.kind } : {}),
    };
  }
  return {
    id,
    channel: "whatsapp",
    name,
    ...(jobDescription ? { jobDescription } : {}),
    ...(calendlyAutomation ? { calendlyAutomation } : {}),
    touchpoints,
  };
}

export type WhatsAppOutreachPlanListItem = {
  id: string;
  name: string;
  touchpointCount: number;
};

export async function listWhatsAppOutreachPlans(
  token: string
): Promise<WhatsAppOutreachPlanListItem[]> {
  const res = await fetch(`${apiBase()}/api/outreach/whatsapp/plans`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load WhatsApp sequences"
    );
  }
  if (!Array.isArray(data.plans)) return [];
  return (data.plans as unknown[])
    .map((raw: unknown) => {
      if (!raw || typeof raw !== "object") return null;
      const o = raw as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const name = typeof o.name === "string" ? o.name : "";
      if (!id || !name) return null;
      return {
        id,
        name,
        touchpointCount: Math.max(0, Number(o.touchpointCount) || 0),
      } satisfies WhatsAppOutreachPlanListItem;
    })
    .filter((item): item is WhatsAppOutreachPlanListItem => item !== null);
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
    jobDescription?: string;
    calendlyAutomation?: WhatsAppCalendlyAutomation;
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
      ...(payload.jobDescription !== undefined
        ? { jobDescription: payload.jobDescription }
        : {}),
      ...(payload.calendlyAutomation !== undefined
        ? { calendlyAutomation: payload.calendlyAutomation }
        : {}),
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
