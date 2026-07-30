// Lightweight in-memory sliding-window rate limiter.
//
// NOTE: state lives in a module-level Map, so it is per-process. On serverless
// (Vercel) each instance/cold start has its own window, making this best-effort
// — enough to blunt password guessing from a single client, not a distributed
// limiter. For strict guarantees, back this with a shared store (e.g. Turso).

type Options = { limit?: number; windowMs?: number };

const store = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  opts: Options = {},
): { allowed: boolean; retryAfterSec: number } {
  const limit = opts.limit ?? 5;
  const windowMs = opts.windowMs ?? 10 * 60 * 1000;
  const now = Date.now();
  const windowStart = now - windowMs;

  const hits = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const oldest = hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, hits);
    return { allowed: false, retryAfterSec };
  }

  hits.push(now);
  store.set(key, hits);
  return { allowed: true, retryAfterSec: 0 };
}
