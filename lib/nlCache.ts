/**
 * Shared NL→SQL cache used by both /api/query and /api/nl2sql routes.
 * Prevents duplicate in-memory caches.
 */

const NL_CACHE_MAX = 500;
const NL_CACHE_TTL_MS = 30_000;

type CacheEntry = { sql: string; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function nlCacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.sql;
}

export function nlCacheSet(key: string, sql: string, ttlMs: number = NL_CACHE_TTL_MS) {
  // Evict expired entries first; if still too large, clear oldest half
  if (cache.size >= NL_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k);
    }
    if (cache.size >= NL_CACHE_MAX) {
      let count = 0;
      for (const k of cache.keys()) {
        cache.delete(k);
        if (++count >= NL_CACHE_MAX / 2) break;
      }
    }
  }
  cache.set(key, { sql, expiresAt: Date.now() + ttlMs });
}
