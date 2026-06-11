type CacheEntry = {
  data: unknown;
  at: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 120_000;

export function dedupeFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!options?.force) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < ttlMs) {
      return Promise.resolve(cached.data as T);
    }
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  } else {
    cache.delete(key);
    inflight.delete(key);
  }

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      inflight.delete(key);
      return data;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateDedupeKey(key: string) {
  cache.delete(key);
  inflight.delete(key);
}
