/**
 * Rate limiter backed by Upstash Redis (serverless-safe).
 *
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your env.
 * Falls back to in-memory if Redis is not configured (dev convenience).
 */

import { Redis } from "@upstash/redis";

/* ─── Redis client (lazy singleton) ─────────────────────────────────────── */

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

const AI_DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "150", 10);

/* ─── In-memory fallback (dev / missing env) ────────────────────────────── */

const memWindows = new Map<string, number[]>();
let lastMemPrune = Date.now();

function pruneMemWindows(windowMs: number) {
  if (Date.now() - lastMemPrune < 60_000) return;
  lastMemPrune = Date.now();
  const cutoff = Date.now() - windowMs;
  for (const [k, ts] of memWindows) {
    const filtered = ts.filter((t) => t > cutoff);
    if (filtered.length === 0) memWindows.delete(k);
    else memWindows.set(k, filtered);
  }
  // Prune stale daily counters
  const today = todayUTC();
  for (const [k, c] of memDailyCounters) {
    if (c.day !== today) memDailyCounters.delete(k);
  }
}

function memRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  pruneMemWindows(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  let ts = memWindows.get(key) ?? [];
  ts = ts.filter((t) => t > cutoff);
  if (ts.length >= limit) {
    const retryAfterMs = ts[0]! + windowMs - now;
    memWindows.set(key, ts);
    return { ok: false, retryAfterMs };
  }
  ts.push(now);
  memWindows.set(key, ts);
  return { ok: true };
}

const memDailyCounters = new Map<string, { day: string; count: number }>();

function memDailyLimit(
  key: string,
  cost: number,
  limit: number,
  day: string,
): { ok: true; remaining: number } | { ok: false; remaining: 0 } {
  let c = memDailyCounters.get(key);
  if (!c || c.day !== day) { c = { day, count: 0 }; memDailyCounters.set(key, c); }
  if (c.count + cost > limit) return { ok: false, remaining: 0 };
  c.count += cost;
  return { ok: true, remaining: limit - c.count };
}

function memDailyUsage(key: string, limit: number, day: string) {
  const c = memDailyCounters.get(key);
  const count = c && c.day === day ? c.count : 0;
  return { count, limit, day };
}

/* ─── Public API ────────────────────────────────────────────────────────── */

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

/**
 * Sliding-window rate limit. Uses Redis sorted sets when available.
 *
 * @param key      Unique identifier (e.g. `query:<userId>`)
 * @param limit    Max requests in the window
 * @param windowMs Window length in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return memRateLimit(key, limit, windowMs);

  const redisKey = `rl:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Step 1: Clean expired entries and check count BEFORE adding
  const cleanPipe = redis.pipeline();
  cleanPipe.zremrangebyscore(redisKey, 0, windowStart);
  cleanPipe.zcard(redisKey);
  const cleanResults = await cleanPipe.exec();
  const currentCount = (cleanResults[1] as number) ?? 0;

  if (currentCount >= limit) {
    const oldest = await redis.zrange<string[]>(redisKey, 0, 0);
    const oldestTs = oldest.length ? parseFloat(oldest[0]!) : now;
    const retryAfterMs = Math.max(oldestTs + windowMs - now, 1000);
    return { ok: false, retryAfterMs };
  }

  // Step 2: Under limit — add the entry and set TTL
  const addPipe = redis.pipeline();
  addPipe.zadd(redisKey, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
  addPipe.pexpire(redisKey, windowMs);
  await addPipe.exec();

  return { ok: true };
}

/* ─── Global daily AI-call counter ──────────────────────────────────────── */

/**
 * Check + increment the daily AI call counter for a user.
 */
export async function checkAiDailyLimit(
  userId: string,
  cost: number = 1,
): Promise<{ ok: true; remaining: number } | { ok: false; remaining: 0 }> {
  const day = todayUTC();
  const redis = getRedis();
  const key = `ai_daily:${userId}:${day}`;

  if (!redis) return memDailyLimit(key, cost, AI_DAILY_LIMIT, day);

  const current = (await redis.get<number>(key)) ?? 0;

  if (current + cost > AI_DAILY_LIMIT) {
    return { ok: false, remaining: 0 };
  }

  const pipe = redis.pipeline();
  pipe.incrby(key, cost);
  // Expire at end of UTC day + 1h buffer
  const now = new Date();
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const ttlSeconds = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000) + 3600;
  pipe.expire(key, ttlSeconds);
  await pipe.exec();

  return { ok: true, remaining: AI_DAILY_LIMIT - (current + cost) };
}

/** Read the current count without incrementing. */
export async function getAiDailyUsage(
  userId: string,
): Promise<{ count: number; limit: number; day: string }> {
  const day = todayUTC();
  const redis = getRedis();
  const key = `ai_daily:${userId}:${day}`;

  if (!redis) return memDailyUsage(key, AI_DAILY_LIMIT, day);

  const count = (await redis.get<number>(key)) ?? 0;
  return { count, limit: AI_DAILY_LIMIT, day };
}
