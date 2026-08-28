type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type ReadToolCache = {
  getOrSet<T>(key: string, loader: () => Promise<T>): Promise<T>;
};

/**
 * In-process TTL cache for read-only AI tools.
 * Never use for addToCart / mutations.
 */
export function createReadToolCache(options?: {
  ttlMs?: number;
}): ReadToolCache {
  const ttlMs = options?.ttlMs ?? 45_000;
  const store = new Map<string, CacheEntry<unknown>>();
  const inflight = new Map<string, Promise<unknown>>();

  return {
    async getOrSet<T>(key: string, loader: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const hit = store.get(key);
      if (hit && hit.expiresAt > now) {
        return hit.value as T;
      }

      const pending = inflight.get(key);
      if (pending) {
        return pending as Promise<T>;
      }

      const promise = (async () => {
        try {
          const value = await loader();
          store.set(key, { value, expiresAt: Date.now() + ttlMs });
          return value;
        } finally {
          inflight.delete(key);
        }
      })();

      inflight.set(key, promise);
      return promise as Promise<T>;
    },
  };
}

export function searchCacheKey(query: string, limit: number): string {
  return `search:${query.trim().toLowerCase()}:${limit}`;
}

export function productCacheKey(slugOrId: string): string {
  return `product:${slugOrId.trim().toLowerCase()}`;
}

export function merchantCacheKey(): string {
  return "merchant";
}
