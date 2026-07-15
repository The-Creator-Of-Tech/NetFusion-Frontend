// Simple in-memory rate limiter using a Map.
// Max 20 requests per userId per hour window.
// NOTE: This is per-process. In production, use Redis for multi-instance deployments.

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = store.get(userId);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + WINDOW_MS;
    store.set(userId, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, remaining: MAX_REQUESTS - existing.count, resetAt: existing.resetAt };
}
