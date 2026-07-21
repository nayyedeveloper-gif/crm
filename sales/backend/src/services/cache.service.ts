interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

export const getCached = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setCached = <T>(key: string, data: T, ttlMs?: number): void => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs || parseInt(process.env.CACHE_TTL_MS || '180000', 10),
  });
};

export const clearCache = (key?: string): void => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

export const getCacheInfo = (key: string): { age: number; ttl: number } | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  return {
    age: Date.now() - entry.timestamp,
    ttl: entry.ttl,
  };
};
