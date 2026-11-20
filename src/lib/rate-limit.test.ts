import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("allows up to max per window, then blocks", () => {
    const now = 0;
    const rl = createRateLimiter({ max: 3, windowMs: 1000, now: () => now });
    expect([1, 2, 3, 4].map(() => rl.allow("a"))).toEqual([true, true, true, false]);
  });
  it("tracks keys independently", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(rl.allow("a")).toBe(true);
    expect(rl.allow("b")).toBe(true);
    expect(rl.allow("a")).toBe(false);
  });
  it("resets after the window", () => {
    let now = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => now });
    rl.allow("a");
    expect(rl.allow("a")).toBe(false);
    now = 1001;
    expect(rl.allow("a")).toBe(true);
  });
  it("does not grow without bound", () => {
    const now = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1000, maxKeys: 100, now: () => now });
    for (let i = 0; i < 1000; i++) rl.allow(`k${i}`);
    expect(rl.size()).toBeLessThanOrEqual(100);
  });
});

describe("rate limiter at capacity", () => {
  it("denies new keys when full of live keys, instead of evicting real counters", () => {
    const rl = createRateLimiter({ max: 5, windowMs: 1000, maxKeys: 3, now: () => 0 });
    expect(["a", "b", "c"].map((k) => rl.allow(k))).toEqual([true, true, true]);
    expect(rl.allow("d")).toBe(false);
    expect(rl.size()).toBe(3);
    // existing keys keep their counters
    for (let i = 0; i < 4; i++) rl.allow("a");
    expect(rl.allow("a")).toBe(false);
  });
  it("accepts new keys again once old ones expire", () => {
    let now = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1000, maxKeys: 2, now: () => now });
    rl.allow("a");
    rl.allow("b");
    expect(rl.allow("c")).toBe(false);
    now = 1001;
    expect(rl.allow("c")).toBe(true);
  });
  it("sweeps at most once per window", () => {
    let now = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1000, maxKeys: 2, now: () => now });
    rl.allow("a");
    rl.allow("b");
    now = 500;
    expect(rl.sweepCount()).toBeLessThanOrEqual(1);
    for (let i = 0; i < 50; i++) rl.allow(`new${i}`);
    expect(rl.sweepCount()).toBeLessThanOrEqual(1);
  });
  it("reclaims expired keys immediately even after a mid-window failed sweep", () => {
    let now = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1000, maxKeys: 2, now: () => now });
    rl.allow("a");
    rl.allow("b");
    now = 900;
    expect(rl.allow("c")).toBe(false); // triggers mid-window sweep; 0 expired
    now = 1001;
    expect(rl.allow("c")).toBe(true); // keys from t=0 expired, must succeed without waiting to t=1900
  });
  it("evicts oldest key when evictOnFull is enabled instead of locking out new keys", () => {
    const rl = createRateLimiter({ max: 2, windowMs: 1000, maxKeys: 3, evictOnFull: true, now: () => 0 });
    expect(["a", "b", "c"].map((k) => rl.allow(k))).toEqual([true, true, true]);
    expect(rl.allow("d")).toBe(true);
    expect(rl.size()).toBe(3);
    expect(rl.allow("d")).toBe(true);
    expect(rl.allow("d")).toBe(false);
    // "a" was evicted so it can start fresh without global lockout
    expect(rl.allow("a")).toBe(true);
  });

  it("exposes non-mutating isLimited check", () => {
    const rl = createRateLimiter({ max: 2, windowMs: 1000, now: () => 0 });
    expect(rl.isLimited("a")).toBe(false);
    rl.allow("a");
    expect(rl.isLimited("a")).toBe(false);
    rl.allow("a");
    expect(rl.isLimited("a")).toBe(true);
  });
});
