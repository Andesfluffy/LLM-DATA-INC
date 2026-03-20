/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Good enough for an MVP on a single process. On a multi-instance / serverless
 * deployment each instance has its own window, so the effective limit per user
 * is (limit × instances) — acceptable until a shared store (Redis/KV) is added.
 */

type Window = { timestamps: number[] };

const windows = new Map<string, Window>();

// Prevent the Map from growing forever — prune stale keys periodically.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 min
let lastPrune = Date.now();

function maybePrune(windowMs: number) {
  if (Date.now() - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = Date.now();
  const cutoff = Date.now() - windowMs;
  for (const [key, win] of windows) {
    win.timestamps = win.timestamps.filter((t) => t > cutoff);
    if (win.timestamps.length === 0) windows.delete(key);
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

/**
 * @param key      Unique identifier for the caller (e.g. userId or IP)
 * @param limit    Max requests allowed in the window
 * @param windowMs Sliding window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  maybePrune(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let win = windows.get(key);
  if (!win) {
    win = { timestamps: [] };
    windows.set(key, win);
  }

  // Drop timestamps outside the current window
  win.timestamps = win.timestamps.filter((t) => t > cutoff);

  if (win.timestamps.length >= limit) {
    // Oldest timestamp tells us when a slot opens up
    const oldest = win.timestamps[0]!;
    const retryAfterMs = oldest + windowMs - now;
    return { ok: false, retryAfterMs };
  }

  win.timestamps.push(now);
  return { ok: true };
}

/* ─── Global daily AI-call counter ───────────────────────────────────────────
 *
 * Tracks total AI/LLM API calls per user per calendar day (UTC).
 * Prevents a single user from exhausting the entire free-tier quota.
 * Default: 150 calls/day per user (configurable via AI_DAILY_LIMIT env var).
 */

const AI_DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "150", 10);

type DailyCounter = { day: string; count: number };
const dailyCounters = new Map<string, DailyCounter>();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Check + increment the daily AI call counter for a user.
 * Call this before every LLM API request.
 *
 * @param userId  Unique user identifier
 * @param cost    Number of "calls" this operation represents (default 1)
 * @returns       { ok: true } or { ok: false, remaining: 0 }
 */
export function checkAiDailyLimit(
  userId: string,
  cost: number = 1
): { ok: true; remaining: number } | { ok: false; remaining: 0 } {
  const day = todayUTC();
  const key = `ai:${userId}`;

  let counter = dailyCounters.get(key);
  if (!counter || counter.day !== day) {
    counter = { day, count: 0 };
    dailyCounters.set(key, counter);
  }

  if (counter.count + cost > AI_DAILY_LIMIT) {
    return { ok: false, remaining: 0 };
  }

  counter.count += cost;
  return { ok: true, remaining: AI_DAILY_LIMIT - counter.count };
}

/** Read the current count without incrementing. */
export function getAiDailyUsage(userId: string): { count: number; limit: number; day: string } {
  const day = todayUTC();
  const key = `ai:${userId}`;
  const counter = dailyCounters.get(key);
  const count = counter && counter.day === day ? counter.count : 0;
  return { count, limit: AI_DAILY_LIMIT, day };
}
