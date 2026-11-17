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
