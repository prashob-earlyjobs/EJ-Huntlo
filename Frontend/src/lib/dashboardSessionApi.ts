import { authHeaders } from "@/lib/auth";
import { dedupeFetch, invalidateDedupeKey } from "@/lib/fetchDedupe";
import { parsePricingPlansFromApi, type PricingPlansPayload } from "@/lib/pricingPlans";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function tokenKey(token: string) {
  return token.slice(-16);
}

export type JsonFetchResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

async function fetchJson(
  url: string,
  init?: RequestInit
): Promise<JsonFetchResult> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function fetchMyProfile(
  token: string,
  options?: { force?: boolean }
): Promise<JsonFetchResult> {
  const key = `users/me:${tokenKey(token)}`;
  return dedupeFetch(
    key,
    () =>
      fetchJson(`${apiBase()}/api/users/me`, {
        headers: authHeaders(token),
      }),
    options
  );
}

export function fetchMyDashboard(
  token: string,
  options?: { force?: boolean }
): Promise<JsonFetchResult> {
  const key = `users/me/dashboard:${tokenKey(token)}`;
  return dedupeFetch(
    key,
    () =>
      fetchJson(`${apiBase()}/api/users/me/dashboard`, {
        headers: authHeaders(token),
      }),
    options
  );
}

export function fetchPricingPlans(
  options?: { force?: boolean }
): Promise<{ plans: PricingPlansPayload | null }> {
  return dedupeFetch(
    "pricing-plans",
    async () => {
      const { ok, data } = await fetchJson(`${apiBase()}/api/pricing-plans`);
      if (!ok || !data.success || !data.plans) {
        return { plans: null };
      }
      return { plans: parsePricingPlansFromApi(data.plans) };
    },
    options
  );
}

export function invalidateDashboardSessionCaches(token: string) {
  const suffix = tokenKey(token);
  invalidateDedupeKey(`users/me:${suffix}`);
  invalidateDedupeKey(`users/me/dashboard:${suffix}`);
}
