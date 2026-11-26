import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { normalizeDatabaseUrl } from "@/lib/db/pool";
import {
  allowDistributedLimit,
  isDistributedLimited,
  resetDistributedRateLimitsForTests,
} from "@/lib/api/pg-rate-limit";
import {
  normalizeTelegramChatId,
  sanitizeChoices,
  sanitizeEmailFrequency,
} from "@/lib/crm/notifications-store";
import { notifyNewDemoLead, sendTelegramMessage } from "@/lib/notifications/telegram";
import { reportServerError, resetAlertThrottleForTests } from "./alerts";

describe("Phase 2 infrastructure, alerting, SSL & rate-limit guards", () => {
  afterEach(() => {
    resetAlertThrottleForTests();
    resetDistributedRateLimitsForTests("test-");
    vi.restoreAllMocks();
  });

  it("upgrades sslmode=require to sslmode=verify-full on remote Postgres hosts only", () => {
    expect(
      normalizeDatabaseUrl("postgresql://app:pw@ep-cool-123.us-east-1.aws.neon.tech/neondb?sslmode=require"),
    ).toBe("postgresql://app:pw@ep-cool-123.us-east-1.aws.neon.tech/neondb?sslmode=verify-full");

    expect(
      normalizeDatabaseUrl("postgresql://app:pw@ep-cool-123.us-east-1.aws.neon.tech/neondb?sslmode=verify-full"),
    ).toBe("postgresql://app:pw@ep-cool-123.us-east-1.aws.neon.tech/neondb?sslmode=verify-full");

    expect(
      normalizeDatabaseUrl("postgresql://app:pw@localhost:5432/qeydai?sslmode=require"),
    ).toBe("postgresql://app:pw@localhost:5432/qeydai?sslmode=require");
  });

  it("sends Telegram lead notifications to default and workspace member chat IDs, and skips cleanly when unconfigured", async () => {
    const skipped = await sendTelegramMessage({ text: "hi", env: {} });
    expect(skipped).toEqual({ ok: false, skipped: true, reason: "not_configured" });

    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    await notifyNewDemoLead({
      tenantId: "biz_abc",
      name: "Nigar",
      phone: "+994507778899",
      createdAt: "2026-11-26T12:00:00Z",
      extraChatIds: ["987654321", "111222333"],
      fetchImpl,
      env: {
        QEYDAI_ALERT_TELEGRAM_BOT_TOKEN: "123456:TESTTOKEN",
        QEYDAI_ALERT_TELEGRAM_CHAT_ID: "111222333",
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.body.chat_id).sort()).toEqual(["111222333", "987654321"]);
    expect(String(calls[0].body.text)).toContain("biz_abc");
    expect(String(calls[0].body.text)).toContain("+994507778899");
  });

  it("logs structured server errors and throttles duplicate Telegram/webhook alerts per context", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 })) as unknown as typeof fetch;
    const env = {
      QEYDAI_ALERT_TELEGRAM_BOT_TOKEN: "123456:TESTTOKEN",
      QEYDAI_ALERT_TELEGRAM_CHAT_ID: "111222333",
      QEYDAI_ERROR_WEBHOOK_URL: "https://alerts.example.test/hook",
    };

    await reportServerError("api.test.db", new Error("connection reset"), { tenantId: "biz_1" }, {
      fetchImpl: fetchMock,
      env,
      nowMs: 1_000_000,
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Same context within 60s should still log locally but NOT spam Telegram/webhook again.
    await reportServerError("api.test.db", new Error("connection reset"), { tenantId: "biz_1" }, {
      fetchImpl: fetchMock,
      env,
      nowMs: 1_010_000,
    });
    expect(errSpy).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // After 60s cooldown, alert dispatches again.
    await reportServerError("api.test.db", new Error("connection reset"), undefined, {
      fetchImpl: fetchMock,
      env,
      nowMs: 1_065_000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("enforces distributed rate limits via Postgres pool and falls back cleanly in memory", async () => {
    const limit = { name: "test-lead", max: 2, windowMs: 60_000 };
    expect(await isDistributedLimited(limit, "ip-1", null)).toBe(false);
    expect(await allowDistributedLimit(limit, "ip-1", null)).toBe(true);
    expect(await allowDistributedLimit(limit, "ip-1", null)).toBe(true);
    expect(await isDistributedLimited(limit, "ip-1", null)).toBe(true);
    expect(await allowDistributedLimit(limit, "ip-1", null)).toBe(false);

    let counter = 0;
    const fakePool = {
      connect: async () => ({
        query: async (sql: string) => {
          if (sql.includes("INSERT INTO auth_rate_limits")) {
            counter += 1;
            return { rows: [{ count: counter }] };
          }
          if (sql.includes("SELECT count FROM auth_rate_limits")) {
            return { rows: [{ count: counter }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    } as unknown as Pool;

    const pgLimit = { name: "test-pg-lead", max: 2, windowMs: 60_000 };
    expect(await allowDistributedLimit(pgLimit, "ip-pg", fakePool)).toBe(true);
    expect(await allowDistributedLimit(pgLimit, "ip-pg", fakePool)).toBe(true);
    expect(await isDistributedLimited(pgLimit, "ip-pg", fakePool)).toBe(true);
    expect(await allowDistributedLimit(pgLimit, "ip-pg", fakePool)).toBe(false);
  });

  it("validates Telegram chat IDs and sanitizes notification preferences", () => {
    expect(normalizeTelegramChatId("")).toBeNull();
    expect(normalizeTelegramChatId("123456789")).toBe("123456789");
    expect(normalizeTelegramChatId("-1001234567890")).toBe("-1001234567890");
    expect(normalizeTelegramChatId("not-a-chat-id")).toBe("invalid");
    expect(sanitizeChoices({ "leads:email": true, bad: "yes" })).toEqual({ "leads:email": true });
    expect(sanitizeEmailFrequency({ leads: "immediate", inbox: "invalid" })).toEqual({ leads: "immediate" });
  });
});
