import { createHmac, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SqliteEnrollmentStore } from "@/lib/enrollment/sqlite-store";

let activeStore: SqliteEnrollmentStore;

vi.mock("@/lib/api/instance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/instance")>("@/lib/api/instance");
  return { ...actual, getSharedStore: () => activeStore };
});

import { POST as registerPost } from "@/app/api/panel/account/register/route";
import { POST as checkoutPost } from "./checkout/route";
import { POST as webhookPost } from "./webhook/route";
import { GET as billingGet } from "@/app/api/panel/billing/route";
import { PANEL_COOKIE_NAME } from "@/lib/api/panel-auth";
import { PAYCELL_PRICES_AZN } from "@/lib/billing/paycell";

const PANEL_SECRET = "test-billing-panel-secret-0123456789abcdef";
const PAYCELL_SECRET = "test-paycell-webhook-secret-0123456789";

function cookieOf(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${PANEL_COOKIE_NAME}=[^;]+`).exec(raw);
  return match ? match[0] : "";
}

function sign(raw: string, secret = PAYCELL_SECRET) {
  return createHmac("sha256", secret).update(raw, "utf8").digest("hex");
}

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
suite("Paycell billing routes & /api/panel/billing", () => {
  let prev: Record<string, string | undefined>;

  beforeEach(() => {
    prev = {
      QEYDAI_PANEL_SECRET: process.env.QEYDAI_PANEL_SECRET,
      QEYDAI_ADMIN_KEYS: process.env.QEYDAI_ADMIN_KEYS,
      QEYDAI_DATABASE_URL: process.env.QEYDAI_DATABASE_URL,
      QEYDAI_PAYCELL_WEBHOOK_SECRET: process.env.QEYDAI_PAYCELL_WEBHOOK_SECRET,
      QEYDAI_PAYCELL_CHECKOUT_URL: process.env.QEYDAI_PAYCELL_CHECKOUT_URL,
      TRUST_PROXY: process.env.TRUST_PROXY,
    };
    process.env.TRUST_PROXY = "x-forwarded-for";
    process.env.QEYDAI_PANEL_SECRET = PANEL_SECRET;
    process.env.QEYDAI_PAYCELL_WEBHOOK_SECRET = PAYCELL_SECRET;
    process.env.QEYDAI_PAYCELL_CHECKOUT_URL = "https://paycell.example/checkout";
    delete process.env.QEYDAI_ADMIN_KEYS;
    activeStore = new SqliteEnrollmentStore(":memory:");
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  async function createOwnerSession(email = `owner-${randomUUID()}@example.com`) {
    const reg = await registerPost(
      new Request("http://localhost:3000/api/panel/account/register", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "10.20.0.1" },
        body: JSON.stringify({ email, password: "Sifre-2026-ok", businessName: "Billing Studio" }),
      }),
    );
    const body = (await reg.json()) as { tenantId: string };
    return { tenantId: body.tenantId, cookie: cookieOf(reg) };
  }

  it("checkout returns 503 when billing env vars are missing, 401 without session, 422 on invalid plan, and 200 signed payload", async () => {
    const { cookie } = await createOwnerSession();

    expect(
      (
        await checkoutPost(
          new Request("http://localhost:3000/api/billing/paycell/checkout", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:3000" },
            body: JSON.stringify({ plan: "growth", period: "annual" }),
          }),
        )
      ).status,
    ).toBe(401);

    expect(
      (
        await checkoutPost(
          new Request("http://localhost:3000/api/billing/paycell/checkout", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
            body: JSON.stringify({ plan: "enterprise", period: "annual" }),
          }),
        )
      ).status,
    ).toBe(422);

    const ok = await checkoutPost(
      new Request("http://localhost:3000/api/billing/paycell/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
        body: JSON.stringify({ plan: "growth", period: "annual" }),
      }),
    );
    expect(ok.status).toBe(200);
    const okJson = (await ok.json()) as { ok: boolean; checkout: { amount: number; signature: string; checkoutUrl: string } };
    expect(okJson.ok).toBe(true);
    expect(okJson.checkout.amount).toBe(PAYCELL_PRICES_AZN.growth.annual);
    expect(okJson.checkout.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(okJson.checkout.checkoutUrl).toBe("https://paycell.example/checkout");

    delete process.env.QEYDAI_PAYCELL_CHECKOUT_URL;
    expect(
      (
        await checkoutPost(
          new Request("http://localhost:3000/api/billing/paycell/checkout", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie },
            body: JSON.stringify({ plan: "growth", period: "annual" }),
          }),
        )
      ).status,
    ).toBe(503);
  });

  it("webhook verifies HMAC, rejects mismatched paid amount, stores idempotently, and /api/panel/billing returns it", async () => {
    const { tenantId, cookie } = await createOwnerSession(`billing2-${randomUUID()}@example.com`);

    const before = await billingGet(
      new Request("http://localhost:3000/api/panel/billing", { headers: { cookie } }),
    );
    expect(before.status).toBe(200);
    expect(await before.json()).toEqual({ ok: true, subscription: null });

    const badSig = await webhookPost(
      new Request("http://localhost:3000/api/billing/paycell/webhook", {
        method: "POST",
        headers: { "x-paycell-signature": "0".repeat(64) },
        body: JSON.stringify({
          eventId: "evt_bad_sig",
          tenant: tenantId,
          plan: "growth",
          period: "annual",
          status: "paid",
          amount: 1188,
          currency: "AZN",
        }),
      }),
    );
    expect(badSig.status).toBe(403);

    const wrongAmountRaw = JSON.stringify({
      eventId: "evt_wrong_amt",
      tenant: tenantId,
      plan: "growth",
      period: "annual",
      status: "paid",
      amount: 1,
      currency: "AZN",
    });
    expect(
      (
        await webhookPost(
          new Request("http://localhost:3000/api/billing/paycell/webhook", {
            method: "POST",
            headers: { "x-paycell-signature": sign(wrongAmountRaw) },
            body: wrongAmountRaw,
          }),
        )
      ).status,
    ).toBe(422);

    const unknownTenantRaw = JSON.stringify({
      eventId: "evt_unknown_ws",
      tenant: "ws_does_not_exist",
      plan: "growth",
      period: "annual",
      status: "paid",
      amount: 1188,
      currency: "AZN",
    });
    expect(
      (
        await webhookPost(
          new Request("http://localhost:3000/api/billing/paycell/webhook", {
            method: "POST",
            headers: { "x-paycell-signature": sign(unknownTenantRaw) },
            body: unknownTenantRaw,
          }),
        )
      ).status,
    ).toBe(404);

    const validRaw = JSON.stringify({
      eventId: "evt_paid_1",
      tenant: tenantId,
      plan: "growth",
      period: "annual",
      status: "paid",
      amount: 1188,
      currency: "AZN",
    });
    const first = await webhookPost(
      new Request("http://localhost:3000/api/billing/paycell/webhook", {
        method: "POST",
        headers: { "x-paycell-signature": `sha256=${sign(validRaw)}` },
        body: validRaw,
      }),
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, duplicate: false });

    const dup = await webhookPost(
      new Request("http://localhost:3000/api/billing/paycell/webhook", {
        method: "POST",
        headers: { "x-paycell-signature": sign(validRaw) },
        body: validRaw,
      }),
    );
    expect(dup.status).toBe(200);
    expect(await dup.json()).toEqual({ ok: true, duplicate: true });

    const after = await billingGet(
      new Request("http://localhost:3000/api/panel/billing", { headers: { cookie } }),
    );
    expect(after.status).toBe(200);
    const afterJson = (await after.json()) as { ok: boolean; subscription: { plan: string; status: string; amount: number } | null };
    expect(afterJson.ok).toBe(true);
    expect(afterJson.subscription?.plan).toBe("growth");
    expect(afterJson.subscription?.status).toBe("paid");
    expect(afterJson.subscription?.amount).toBe(1188);
  });
});
