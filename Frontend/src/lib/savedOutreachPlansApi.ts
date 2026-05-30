import { authHeaders } from "@/lib/auth";

export type SavedOutreachPlanChannel = "gmail" | "whatsapp";

export const SAVED_OUTREACH_PLANS_PAGE_SIZE = 8;

export type SavedOutreachPlanItem = {
  id: string;
  name: string;
  touchpointCount: number;
  channel: SavedOutreachPlanChannel;
  updatedAt?: string | null;
};

export type SavedOutreachPlansPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type SavedOutreachPlansResult = {
  plans: SavedOutreachPlanItem[];
  pagination: SavedOutreachPlansPagination;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function parsePagination(raw: unknown): SavedOutreachPlansPagination {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const page = typeof o.page === "number" && o.page > 0 ? o.page : 1;
  const limit =
    typeof o.limit === "number" && o.limit > 0 ? o.limit : SAVED_OUTREACH_PLANS_PAGE_SIZE;
  const total = typeof o.total === "number" && o.total >= 0 ? o.total : 0;
  const totalPages =
    typeof o.totalPages === "number" && o.totalPages > 0
      ? o.totalPages
      : Math.max(1, Math.ceil(total / limit) || 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: typeof o.hasMore === "boolean" ? o.hasMore : page < totalPages,
  };
}

export async function fetchSavedOutreachPlans(
  token: string,
  options?: { page?: number; limit?: number; channel?: SavedOutreachPlanChannel }
): Promise<SavedOutreachPlansResult> {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const limit = options?.limit && options.limit > 0 ? options.limit : SAVED_OUTREACH_PLANS_PAGE_SIZE;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (options?.channel === "gmail" || options?.channel === "whatsapp") {
    qs.set("channel", options.channel);
  }
  const res = await fetch(`${apiBase()}/api/outreach/saved-plans?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load saved outreaches"
    );
  }
  const plans = Array.isArray(data.plans)
    ? data.plans
        .map((raw: unknown): SavedOutreachPlanItem | null => {
          if (!raw || typeof raw !== "object") return null;
          const o = raw as Record<string, unknown>;
          const id = typeof o.id === "string" ? o.id : "";
          const name = typeof o.name === "string" ? o.name : "";
          const channel = o.channel === "whatsapp" ? "whatsapp" : "gmail";
          if (!id || !name) return null;
          return {
            id,
            name,
            channel,
            touchpointCount: Math.max(0, Number(o.touchpointCount) || 0),
            updatedAt:
              typeof o.updatedAt === "string"
                ? o.updatedAt
                : o.updatedAt
                  ? new Date(String(o.updatedAt)).toISOString()
                  : null,
          };
        })
        .filter((item): item is SavedOutreachPlanItem => item !== null)
    : [];
  return {
    plans,
    pagination: parsePagination(data.pagination),
  };
}
