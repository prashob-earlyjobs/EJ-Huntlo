import type { CandidateFilterForm } from "@/lib/sourcingFilters";
import { pathForDashboardTab } from "@/lib/dashboardRoutes";

const STORAGE_KEY = "ej_pending_public_search";
const CLAIMED_SESSION_KEY = "ej_claimed_public_session_id";

export type PendingPublicSearch = {
  futureJobsSessionId: string;
  prompt: string;
  filterForm?: CandidateFilterForm;
  sessionTitle?: string;
  totalMatched?: number;
  savedAt: number;
};

export function savePendingPublicSearch(data: Omit<PendingPublicSearch, "savedAt">): void {
  if (typeof window === "undefined") return;
  const futureJobsSessionId = data.futureJobsSessionId?.trim();
  const prompt = data.prompt?.trim();
  if (!futureJobsSessionId || !prompt) return;

  const payload: PendingPublicSearch = {
    futureJobsSessionId,
    prompt,
    filterForm: data.filterForm,
    sessionTitle: data.sessionTitle,
    totalMatched: data.totalMatched,
    savedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingPublicSearch(): PendingPublicSearch | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPublicSearch;
    if (!parsed?.futureJobsSessionId?.trim() || !parsed?.prompt?.trim()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearPendingPublicSearch(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function setClaimedPublicSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  const sid = sessionId.trim();
  if (!sid) return;
  localStorage.setItem(CLAIMED_SESSION_KEY, sid);
}

export function getClaimedPublicSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const sid = localStorage.getItem(CLAIMED_SESSION_KEY)?.trim();
  return sid || null;
}

export function clearClaimedPublicSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CLAIMED_SESSION_KEY);
}

export function pathForClaimedPublicSession(): string | null {
  const sid = getClaimedPublicSessionId();
  if (!sid) return null;
  return pathForDashboardTab("Session Results", { sessionId: sid });
}
