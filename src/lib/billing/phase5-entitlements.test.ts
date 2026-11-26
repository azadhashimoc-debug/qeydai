import { describe, expect, it } from "vitest";
import { computeEntitlement, periodDurationDays, PLAN_LIMITS } from "@/lib/billing/entitlements";
import { validateLaunchReadiness, validateProductionEnv } from "@/lib/deploy/check-env";

describe("Phase 5: 14-day trial & subscription entitlements", () => {
  it("grants full trial limits while inside the 14-day window", () => {
    const start = new Date("2026-11-01T00:00:00Z");
    const end = new Date("2026-11-15T00:00:00Z");
    const now = new Date("2026-11-10T12:00:00Z");

    const ent = computeEntitlement(
      {
        planCode: "trial",
        subscriptionStatus: "trialing",
        trialStartsAt: start,
        trialEndsAt: end,
        currentPeriodEnd: null,
      },
      now,
    );

    expect(ent.status).toBe("trialing");
    expect(ent.canWrite).toBe(true);
    expect(ent.trialDaysLeft).toBe(5);
    expect(ent.limits).toEqual(PLAN_LIMITS.trial);
  });

  it("blocks writes (canWrite=false) once the 14-day trial expires", () => {
    const start = new Date("2026-11-01T00:00:00Z");
    const end = new Date("2026-11-15T00:00:00Z");
    const afterEnd = new Date("2026-11-16T00:00:00Z");

    const ent = computeEntitlement(
      {
        planCode: "trial",
        subscriptionStatus: "trialing",
        trialStartsAt: start,
        trialEndsAt: end,
        currentPeriodEnd: null,
      },
      afterEnd,
    );

    expect(ent.status).toBe("expired");
    expect(ent.canWrite).toBe(false);
    expect(ent.trialDaysLeft).toBe(0);
  });

  it("honors active paid plans and expires them past currentPeriodEnd", () => {
    const start = new Date("2026-11-01T00:00:00Z");
    const trialEnd = new Date("2026-11-15T00:00:00Z");
    const periodEnd = new Date("2026-12-15T00:00:00Z");

    const active = computeEntitlement(
      {
        planCode: "growth",
        subscriptionStatus: "active",
        trialStartsAt: start,
        trialEndsAt: trialEnd,
        currentPeriodEnd: periodEnd,
      },
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(active.status).toBe("active");
    expect(active.canWrite).toBe(true);
    expect(active.limits).toEqual(PLAN_LIMITS.growth);

    const lapsed = computeEntitlement(
      {
        planCode: "growth",
        subscriptionStatus: "active",
        trialStartsAt: start,
        trialEndsAt: trialEnd,
        currentPeriodEnd: periodEnd,
      },
      new Date("2026-12-20T00:00:00Z"),
    );
    expect(lapsed.status).toBe("expired");
    expect(lapsed.canWrite).toBe(false);
  });

  it("maps Paycell billing periods to expected durations", () => {
    expect(periodDurationDays("monthly")).toBe(30);
    expect(periodDurationDays("halfYear")).toBe(180);
    expect(periodDurationDays("annual")).toBe(365);
  });
});

describe("Phase 5: production env & launch readiness validation", () => {
  it("accepts TRUST_PROXY=vercel and validates Phase 1-5 launch readiness vars", () => {
    const prod = validateProductionEnv({
      NEXT_PUBLIC_SITE_URL: "https://panelim.az",
      QEYDAI_DATABASE_URL: "postgresql://app:pass@db.neon.tech/neondb?sslmode=verify-full",
      QEYDAI_PANEL_SECRET: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      TRUST_PROXY: "vercel",
      GROQ_API_KEY: "gsk_live_test_123456",
      RESEND_API_KEY: "re_live_test_123456",
    });
    expect(prod.ok).toBe(true);
    expect(prod.items.find((i) => i.key === "TRUST_PROXY")?.severity).toBe("ok");

    const launch = validateLaunchReadiness({
      NEXT_PUBLIC_SITE_URL: "https://panelim.az",
      QEYDAI_DATABASE_URL: "postgresql://app:pass@db.neon.tech/neondb?sslmode=verify-full",
      QEYDAI_PANEL_SECRET: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      TRUST_PROXY: "vercel",
    });
    expect(launch.ok).toBe(true);
    const warned = launch.items.filter((i) => i.severity === "warn").map((i) => i.key);
    expect(warned).toEqual(
      expect.arrayContaining(["GROQ_API_KEY", "RESEND_API_KEY", "CRON_SECRET", "QEYDAI_PAYCELL_CHECKOUT_URL"]),
    );
  });
});
