type Options = { max: number; windowMs: number; maxKeys?: number; now?: () => number };

/** Fixed-window in-memory limiter. Per-process only; replace with a shared store (Redis/Postgres) when scaled out. */
export function createRateLimiter({ max, windowMs, maxKeys = 10_000, now = Date.now }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  function sweep(t: number) {
    for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    // Still too many live keys: drop oldest entries (Map keeps insertion order).
    for (const k of hits.keys()) {
      if (hits.size < maxKeys) break;
      hits.delete(k);
    }
  }

  return {
    allow(key: string): boolean {
      const t = now();
      const cur = hits.get(key);
      if (!cur || cur.resetAt <= t) {
        if (hits.size >= maxKeys) sweep(t);
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      if (cur.count >= max) return false;
      cur.count++;
      return true;
    },
    size: () => hits.size,
    clear: () => hits.clear(),
  };
}
