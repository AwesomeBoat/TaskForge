import { tooManyRequests } from './http';

type Window = { count: number; resetAt: number };

// In-memory fixed window. Correct for a single instance; swap the map for Redis
// when the app runs on more than one node.
const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  if (windows.size > MAX_TRACKED_KEYS) sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    throw tooManyRequests('Too many attempts. Please wait a moment and try again.', retryAfter);
  }
}

/** Only used as a rate-limit bucket key, never for authorization decisions. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Test-only escape hatch so suites do not trip each other's limits. */
export function resetRateLimits(): void {
  windows.clear();
}
