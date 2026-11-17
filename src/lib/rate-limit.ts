type Options = { max: number; windowMs: number; maxKeys?: number; now?: () => number };

/**
 * Fixed-window in-memory limiter. Per-process only; replace with a shared store (Redis/Postgres)
 * when scaled out. When full of live keys it denies new keys (fail closed) instead of evicting
 * real counters, and sweeps expired keys at most once per window to avoid CPU amplification.
 */
export function createRateLimiter({ max, windowMs, maxKeys = 10_000, now = Date.now }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = -Infinity;
  let sweeps = 0;

  function sweep(t: number) {
    if (t - lastSweep < windowMs) return;
    lastSweep = t;
    sweeps++;
    for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
  }

  return {
    allow(key: string): boolean {
      const t = now();
      const cur = hits.get(key);
      if (cur && cur.resetAt > t) {
        if (cur.count >= max) return false;
        cur.count++;
        return true;
      }
      if (cur) hits.delete(key); // expired entry for this key
      if (hits.size >= maxKeys) {
        sweep(t);
        if (hits.size >= maxKeys) return false;
      }
      hits.set(key, { count: 1, resetAt: t + windowMs });
      return true;
    },
    size: () => hits.size,
    sweepCount: () => sweeps,
    clear: () => {
      hits.clear();
      lastSweep = -Infinity;
      sweeps = 0;
    },
  };
}
