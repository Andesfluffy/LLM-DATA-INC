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
