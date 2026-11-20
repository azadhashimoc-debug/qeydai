type Options = {
  max: number;
  windowMs: number;
  maxKeys?: number;
  evictOnFull?: boolean;
  now?: () => number;
};

/**
 * Fixed-window in-memory limiter. Per-process only; replace with a shared store (Redis/Postgres)
 * when scaled out. By default denies new keys when full of live keys (fail closed); pass
 * `evictOnFull: true` for IP-keyed public/login limiters so key flooding cannot lock out legitimate callers.
 */
export function createRateLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
  evictOnFull = false,
  now = Date.now,
}: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  let nextSweepAt = -Infinity;
  let sweeps = 0;

  function sweep(t: number) {
    if (t < nextSweepAt) return;
    sweeps++;
    let removed = 0;
    let minResetAt = Infinity;
    for (const [k, v] of hits) {
      if (v.resetAt <= t) {
        hits.delete(k);
        removed++;
      } else if (v.resetAt < minResetAt) {
        minResetAt = v.resetAt;
      }
    }
    nextSweepAt = removed > 0 ? t : Math.min(t + windowMs, minResetAt);
  }

  return {
    isLimited(key: string): boolean {
      const cur = hits.get(key);
      return Boolean(cur && cur.resetAt > now() && cur.count >= max);
    },
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
        if (hits.size >= maxKeys) {
          if (!evictOnFull) return false;
          const oldest = hits.keys().next().value;
          if (oldest !== undefined) hits.delete(oldest);
        }
      }
      hits.set(key, { count: 1, resetAt: t + windowMs });
      return true;
    },
    size: () => hits.size,
    sweepCount: () => sweeps,
    clear: () => {
      hits.clear();
      nextSweepAt = -Infinity;
      sweeps = 0;
    },
  };
}
