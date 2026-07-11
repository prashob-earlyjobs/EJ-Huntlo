import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type AdminOutreachTriggerPhase = "upcoming" | "completed" | "all";

export type AdminOutreachTrigger = {
  triggerKey: string;
  enrollmentId: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  ownerName: string;
  ownerEmail: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  currentStepOrder: number;
  stepLabel: string;
  channel: string;
  condition: string;
  sentCount: number;
  replyCount: number;
  enrollmentStatus: string;
  lastError: string;
  nextSendAt: string | null;
  completedAt: string | null;
  triggerPhase: AdminOutreachTriggerPhase;
  isDue: boolean;
  isProjected: boolean;
  isManual: boolean;
  isFailed: boolean;
  queueIndex: number;
  queueTotal: number;
  lastSentAt: string | null;
};

export type AdminOutreachTriggersPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type AdminOutreachTriggersResponse = {
  triggers: AdminOutreachTrigger[];
  summary: {
    total: number;
    due: number;
    upcoming: number;
    completed: number;
  };
  pagination: AdminOutreachTriggersPagination;
  generatedAt: string;
};

function normalizeTriggerPhase(value: unknown): AdminOutreachTriggerPhase {
  const key = String(value || "upcoming").trim().toLowerCase();
  if (key === "completed" || key === "all") return key;
  return "upcoming";
}

export async function fetchAdminUpcomingOutreachTriggers(
  token: string,
  options?: {
    page?: number;
    limit?: number;
    dueOnly?: boolean;
    campaignId?: string;
    phase?: AdminOutreachTriggerPhase;
  }
): Promise<AdminOutreachTriggersResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.dueOnly) params.set("dueOnly", "1");
  if (options?.phase) params.set("phase", options.phase);
  if (options?.campaignId?.trim()) params.set("campaignId", options.campaignId.trim());
  const qs = params.toString();

  const res = await fetch(
    `${apiBase()}/api/outreach-campaigns/admin/upcoming-triggers${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load outreach triggers"
    );
  }

  const pagination = data.pagination || {};
  const summary = data.summary || {};

  return {
    triggers: Array.isArray(data.triggers)
      ? data.triggers.map((row: Record<string, unknown>) => ({
          triggerKey: String(row.triggerKey || `${row.enrollmentId}:${row.currentStepOrder}`),
          enrollmentId: String(row.enrollmentId || ""),
          campaignId: String(row.campaignId || ""),
          campaignName: String(row.campaignName || ""),
          campaignStatus: String(row.campaignStatus || ""),
          ownerName: String(row.ownerName || ""),
          ownerEmail: String(row.ownerEmail || ""),
          candidateName: String(row.candidateName || ""),
          candidateEmail: String(row.candidateEmail || ""),
          candidatePhone: String(row.candidatePhone || ""),
          currentStepOrder: Number(row.currentStepOrder) || 1,
          stepLabel: String(row.stepLabel || ""),
          channel: String(row.channel || ""),
          condition: String(row.condition || ""),
          sentCount: Number(row.sentCount) || 0,
          replyCount: Number(row.replyCount) || 0,
          enrollmentStatus: String(row.enrollmentStatus || ""),
          lastError: String(row.lastError || "").trim(),
          nextSendAt: row.nextSendAt ? String(row.nextSendAt) : null,
          completedAt: row.completedAt ? String(row.completedAt) : null,
          triggerPhase: normalizeTriggerPhase(row.triggerPhase),
          isDue: Boolean(row.isDue),
          isProjected: Boolean(row.isProjected),
          isManual: Boolean(row.isManual),
          isFailed: Boolean(row.isFailed),
          queueIndex: Number(row.queueIndex) || 1,
          queueTotal: Number(row.queueTotal) || 1,
          lastSentAt: row.lastSentAt ? String(row.lastSentAt) : null,
        }))
      : [],
    summary: {
      total: Number(summary.total) || 0,
      due: Number(summary.due) || 0,
      upcoming: Number(summary.upcoming) || 0,
      completed: Number(summary.completed) || 0,
    },
    pagination: {
      page: Number(pagination.page) || 1,
      limit: Number(pagination.limit) || 25,
      total: Number(pagination.total) || 0,
      totalPages: Number(pagination.totalPages) || 1,
      hasMore: Boolean(pagination.hasMore),
    },
    generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : new Date().toISOString(),
  };
}
