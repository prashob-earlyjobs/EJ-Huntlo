import type { StoredAuth } from "@/lib/auth";
import { authHeaders } from "@/lib/auth";
import { pathForDashboardTab } from "@/lib/dashboardRoutes";
import { postAuthPath } from "@/lib/onboarding";
import {
  clearPendingPublicSearch,
  getPendingPublicSearch,
  setClaimedPublicSessionId,
  type PendingPublicSearch,
} from "@/lib/pendingPublicSearch";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type ClaimPublicSearchResult = {
  futureJobsSessionId: string;
  savedSessionId?: string;
  alreadyClaimed?: boolean;
};

export async function claimPublicSearch(
  token: string,
  pending: PendingPublicSearch
): Promise<ClaimPublicSearchResult | null> {
  const futureJobsSessionId = pending.futureJobsSessionId.trim();
  if (!futureJobsSessionId || !token) return null;

  const res = await fetch(`${apiBase()}/api/candidates/claim-public-search`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      futureJobsSessionId,
      prompt: pending.prompt,
      ...(pending.filterForm ? { filterForm: pending.filterForm } : {}),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    futureJobsSessionId?: string;
    savedSessionId?: string;
    alreadyClaimed?: boolean;
  };

  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : "Could not save your search to your account."
    );
  }

  const sid =
    typeof data.futureJobsSessionId === "string" && data.futureJobsSessionId.trim()
      ? data.futureJobsSessionId.trim()
      : futureJobsSessionId;

  return {
    futureJobsSessionId: sid,
    savedSessionId: data.savedSessionId,
    alreadyClaimed: data.alreadyClaimed,
  };
}

/** Claim a landing-page search after signup/login; returns session id when saved. */
export async function claimPendingPublicSearchIfAny(
  token: string
): Promise<string | null> {
  const pending = getPendingPublicSearch();
  if (!pending) return null;

  try {
    const result = await claimPublicSearch(token, pending);
    if (!result?.futureJobsSessionId) return null;
    clearPendingPublicSearch();
    setClaimedPublicSessionId(result.futureJobsSessionId);
    return result.futureJobsSessionId;
  } catch {
    return null;
  }
}

/** Post-auth redirect: claim pending search, then open session results when ready. */
export async function resolveAuthRedirect(
  user: Pick<StoredAuth, "role" | "onboardingCompleted" | "accountRole">,
  token: string
): Promise<string> {
  const claimedSessionId = await claimPendingPublicSearchIfAny(token);
  const base = postAuthPath(user);
  if (claimedSessionId && base === "/dashboard") {
    return pathForDashboardTab("Session Results", { sessionId: claimedSessionId });
  }
  return base;
}
