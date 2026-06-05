import type { CandidateFilterForm } from "@/lib/sourcingFilters";
import type { SessionResultDoc } from "@/lib/sessionCandidateDetail";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type PublicCandidateSearchResponse = {
  success: true;
  futureJobsSessionId?: string;
  sessionTitle?: string;
  prompt: string;
  filterForm?: CandidateFilterForm;
  totalMatched: number;
  displayedCount: number;
  candidates: SessionResultDoc[];
};

type PublicApiError = {
  success?: false;
  message?: string;
  code?: string;
  sessionPending?: boolean;
};

async function parsePublicApiJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & PublicApiError;

  if (!res.ok || data.success === false) {
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : res.status === 429
          ? "Too many preview searches. Please try again later or sign up."
          : "Request failed";
    const err = new Error(message);
    (err as Error & { code?: string; sessionPending?: boolean }).code = data.code;
    (err as Error & { sessionPending?: boolean }).sessionPending = data.sessionPending;
    throw err;
  }

  return data;
}

/**
 * Public preview search — annotate + apply run server-side in one call.
 * (Optional filterForm can be passed if caller already annotated.)
 */
export async function searchPublicCandidates(
  prompt: string,
  filterForm?: CandidateFilterForm
): Promise<PublicCandidateSearchResponse> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Enter a search query to find candidates.");
  }

  const res = await fetch(`${apiBase()}/api/public-candidates/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: trimmed,
      ...(filterForm ? { filterForm } : {}),
    }),
  });

  return parsePublicApiJson<PublicCandidateSearchResponse>(res);
}
