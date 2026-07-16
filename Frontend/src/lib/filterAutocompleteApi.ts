import { authHeaders, getStoredAuth } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type FilterAutocompleteResult = {
  success: boolean;
  filterType?: string;
  query?: string;
  suggestions: string[];
  message?: string;
};

export async function fetchFilterAutocomplete(options: {
  filterType?: string;
  query: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<string[]> {
  const auth = getStoredAuth();
  if (!auth?.token) return [];

  const params = new URLSearchParams({
    filter_type: options.filterType || "region",
    query: options.query.trim(),
    limit: String(options.limit ?? 10),
  });

  const res = await fetch(`${apiBase()}/api/candidates/filters/autocomplete?${params}`, {
    headers: authHeaders(auth.token),
    signal: options.signal,
  });

  const data = (await res.json().catch(() => null)) as FilterAutocompleteResult | null;
  if (!res.ok || !data?.success || !Array.isArray(data.suggestions)) {
    return [];
  }
  return data.suggestions
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}
