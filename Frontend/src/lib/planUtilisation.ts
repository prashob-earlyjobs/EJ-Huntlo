export type UserUtilisationStats = {
  candidateSearches: number;
  emailUnveils: number;
  candidateUnveils: number;
  mobileUnveils: number;
  linkedinLookups: number;
};

export type UtilisationHistoryRow = {
  id: string;
  action: string;
  amount: number;
  createdAt: string;
};

export type UtilisationHistoryPagination = {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
};

export const UTILISATION_HISTORY_PAGE_SIZE = 20;

export function parseUtilisationHistoryPagination(
  raw: unknown
): UtilisationHistoryPagination {
  const fallback: UtilisationHistoryPagination = {
    page: 1,
    limit: UTILISATION_HISTORY_PAGE_SIZE,
    totalDocs: 0,
    totalPages: 1,
  };
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const page =
    typeof o.page === "number" && Number.isFinite(o.page)
      ? Math.max(1, Math.floor(o.page))
      : fallback.page;
  const limit =
    typeof o.limit === "number" && Number.isFinite(o.limit)
      ? Math.max(1, Math.floor(o.limit))
      : fallback.limit;
  const totalDocs =
    typeof o.totalDocs === "number" && Number.isFinite(o.totalDocs)
      ? Math.max(0, Math.floor(o.totalDocs))
      : fallback.totalDocs;
  const totalPages =
    typeof o.totalPages === "number" && Number.isFinite(o.totalPages)
      ? Math.max(1, Math.floor(o.totalPages))
      : Math.max(1, Math.ceil(totalDocs / limit));
  return { page, limit, totalDocs, totalPages };
}

export function parseUtilisationPayload(raw: unknown): UserUtilisationStats {
  const empty: UserUtilisationStats = {
    candidateSearches: 0,
    emailUnveils: 0,
    candidateUnveils: 0,
    mobileUnveils: 0,
    linkedinLookups: 0,
  };
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  const n = (key: keyof UserUtilisationStats) => {
    const v = o[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  };
  return {
    candidateSearches: n("candidateSearches"),
    emailUnveils: n("emailUnveils"),
    candidateUnveils: n("candidateUnveils"),
    mobileUnveils: n("mobileUnveils"),
    linkedinLookups: n("linkedinLookups"),
  };
}

/** Remaining / limit from plan quota (e.g. 255/300). No quota → —/— */
export function quotaRemainingDisplay(
  used: number,
  limit: number | null | undefined
): string {
  const u = Math.max(0, Math.floor(Number(used) || 0));
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    const L = Math.floor(limit);
    return `${Math.max(0, L - u)}/${L}`;
  }
  return "—/—";
}

export function quotaUsedPercent(
  used: number,
  limit: number | null | undefined
): number {
  const u = Math.max(0, Math.floor(Number(used) || 0));
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((u / Math.floor(limit)) * 100));
}

export function parseUtilisationHistoryPayload(raw: unknown): UtilisationHistoryRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: UtilisationHistoryRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const action = typeof o.action === "string" ? o.action : "";
    const amount =
      typeof o.amount === "number" && Number.isFinite(o.amount)
        ? Math.max(1, Math.floor(o.amount))
        : 1;
    let createdAt = "";
    const cat = o.createdAt;
    if (typeof cat === "string") createdAt = cat;
    else if (typeof cat === "number" && Number.isFinite(cat))
      createdAt = new Date(cat).toISOString();
    if (!id || !createdAt) continue;
    rows.push({ id, action, amount, createdAt });
  }
  return rows;
}

export function utilisationQuotaActionLabel(action: string): string {
  switch (action) {
    case "candidateSearches":
      return "Candidate search";
    case "emailUnveils":
      return "Email unveil";
    case "candidateUnveils":
      return "Candidate unveil";
    case "mobileUnveils":
      return "Mobile unveil";
    case "linkedinLookups":
      return "LinkedIn search";
    default:
      return action ? action.replace(/([A-Z])/g, " $1").trim() : "Activity";
  }
}
