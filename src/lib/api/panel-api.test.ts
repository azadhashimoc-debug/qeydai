import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteEnrollmentStore } from "../enrollment/sqlite-store";
import { createEnrollApi } from "./enroll-api";
import { getEnrollApi, getPanelApi } from "./instance";
import { createPanelApi, isSecureRequest } from "./panel-api";
import { adminKeyFingerprint, derivePanelSecret, PANEL_COOKIE_NAME } from "./panel-auth";

const NOW = new Date("2026-06-01T08:00:00Z");
const FUTURE = "2026-06-02T07:00:00.000Z";
const PAST = "2026-05-31T07:00:00.000Z";

const ADMIN_KEY_A = "admin_key_alpha_1234567890abcdef";
const ADMIN_KEY_B = "admin_key_bravo_1234567890abcdef";
const ADMIN_KEYS = {
  [ADMIN_KEY_A]: "tenant_alpha",
  [ADMIN_KEY_B]: "tenant_bravo",
};
const M2M_KEYS = {
  "enroll_key_alpha_1234567890abcd": "tenant_alpha",
  "enroll_key_bravo_1234567890abcd": "tenant_bravo",
};

function makeAuthConfig(keys: Record<string, string> = ADMIN_KEYS, explicitSecret?: string) {
  const allowedKeysByTenant = new Map<string, Set<string>>();
  for (const [k, tenant] of Object.entries(keys)) {
    let set = allowedKeysByTenant.get(tenant);
    if (!set) {
      set = new Set();
      allowedKeysByTenant.set(tenant, set);
    }
    set.add(adminKeyFingerprint(k));
  }
  return {
    adminKeys: keys,
    allowedTenants: new Set(Object.values(keys)),
    allowedKeysByTenant,
    secret: derivePanelSecret(keys, explicitSecret),
  };
}

let store: SqliteEnrollmentStore;
let nowMs: number;
let authConfig: ReturnType<typeof makeAuthConfig>;
let analyticsDir: string;
let analyticsFile: string;
let panelApi: ReturnType<typeof createPanelApi>;
let enrollApi: ReturnType<typeof createEnrollApi>;

function setup(opts: { authRateMax?: number; authMaxKeys?: number; apiRateMax?: number; rateMax?: number } = {}) {
  store = new SqliteEnrollmentStore(":memory:");
  nowMs = NOW.getTime();
  authConfig = makeAuthConfig();
  analyticsDir = mkdtempSync(path.join(tmpdir(), "qeydai-panel-test-"));
  analyticsFile = path.join(analyticsDir, "analytics.jsonl");
  panelApi = createPanelApi({
    store,
    getAuthConfig: () => authConfig,
    analyticsPath: analyticsFile,
    now: () => new Date(nowMs),
    authRateMax: opts.authRateMax ?? 30,
    authMaxKeys: opts.authMaxKeys,
    apiRateMax: opts.apiRateMax ?? 120,
  });
  enrollApi = createEnrollApi({
    store,
    keys: M2M_KEYS,
    adminKeys: ADMIN_KEYS,
    now: () => new Date(nowMs),
    rateMax: opts.rateMax ?? 120,
  });
}

beforeEach(() => setup());

afterEach(() => {
  try {
    store.close();
  } catch {
    // already closed in error tests
  }
  rmSync(analyticsDir, { recursive: true, force: true });
});

function extractCookiePair(setCookieHeader: string | null): string {
  expect(setCookieHeader).toBeTruthy();
  return setCookieHeader!.split(";")[0];
}

async function loginCookie(key: string = ADMIN_KEY_A, url = "http://localhost:3000/api/panel/auth"): Promise<string> {
  const res = await panelApi.authPost(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(url).origin,
      },
      body: JSON.stringify({ key }),
    }),
  );
  expect(res.status).toBe(200);
  return extractCookiePair(res.headers.get("set-cookie"));
}

function panelReq(
  urlPath: string,
  opts: {
    method?: string;
    cookie?: string | null;
    body?: unknown;
    contentType?: string | null;
    headers?: Record<string, string>;
  } = {},
) {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.contentType !== null && opts.body !== undefined) {
    headers["content-type"] = opts.contentType ?? "application/json";
  }
  if (opts.headers) Object.assign(headers, opts.headers);
  return new Request(`http://localhost:3000${urlPath}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
}

describe("isSecureRequest", () => {
  it("returns false for local http://localhost:3000 and :3100 and true for https or x-forwarded-proto https", () => {
    expect(isSecureRequest(new Request("http://localhost:3000/api/panel/auth"))).toBe(false);
    expect(isSecureRequest(new Request("http://localhost:3100/api/panel/auth"))).toBe(false);
    expect(isSecureRequest(new Request("https://qeydai.az/api/panel/auth"))).toBe(true);
    expect(
      isSecureRequest(
        new Request("http://internal:3000/api/panel/auth", {
          headers: { "x-forwarded-proto": "https, http" },
        }),
      ),
    ).toBe(true);
  });
});

describe("Panel auth (/api/panel/auth)", () => {
  it("POST logs in with valid admin key, sets HttpOnly SameSite=Lax cookie (no Secure on localhost), GET verifies, DELETE clears", async () => {
    const loginRes = await panelApi.authPost(
      panelReq("/api/panel/auth", {
        method: "POST",
        body: { key: ADMIN_KEY_A },
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers.get("cache-control")).toBe("no-store");
    expect(await loginRes.json()).toEqual({ ok: true, tenantId: "tenant_alpha" });

    const setCookie = loginRes.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${PANEL_COOKIE_NAME}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Secure");

    const cookiePair = extractCookiePair(setCookie);
    const getRes = await panelApi.authGet(panelReq("/api/panel/auth", { cookie: cookiePair }));
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("cache-control")).toBe("no-store");
    expect(await getRes.json()).toEqual({ ok: true, tenantId: "tenant_alpha" });

    const delRes = await panelApi.authDelete(
      panelReq("/api/panel/auth", {
        method: "DELETE",
        cookie: cookiePair,
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(delRes.status).toBe(200);
    expect(delRes.headers.get("cache-control")).toBe("no-store");
    const delCookie = delRes.headers.get("set-cookie")!;
    expect(delCookie).toContain(`${PANEL_COOKIE_NAME}=;`);
    expect(delCookie).toContain("Max-Age=0");
    expect(delCookie).not.toContain("Secure");

    // Replaying the signed-out cookie is rejected server-side via jti revocation
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: cookiePair }))).status).toBe(401);
    expect((await panelApi.overview(panelReq("/api/panel/overview", { cookie: cookiePair }))).status).toBe(401);
  });

  it("invalidates existing cookie when same-tenant admin key rotates even with fixed explicit secret", async () => {
    const fixedSecret = "fixed_explicit_panel_secret_32_chars!";
    const rotatedKey = "admin_key_alpha_rotated_9876543210";
    authConfig = makeAuthConfig(ADMIN_KEYS, fixedSecret);
    const oldCookie = await loginCookie(ADMIN_KEY_A);
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: oldCookie }))).status).toBe(200);

    // Rotate tenant_alpha's key while keeping same tenant & same QEYDAI_PANEL_SECRET
    authConfig = makeAuthConfig({ [rotatedKey]: "tenant_alpha", [ADMIN_KEY_B]: "tenant_bravo" }, fixedSecret);
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: oldCookie }))).status).toBe(401);

    const newCookie = await loginCookie(rotatedKey);
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: newCookie }))).status).toBe(200);
  });

  it("sets Secure flag when request is HTTPS or x-forwarded-proto=https", async () => {
    const res = await panelApi.authPost(
      new Request("http://app.internal/api/panel/auth", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-proto": "https",
          origin: "http://app.internal",
        },
        body: JSON.stringify({ key: ADMIN_KEY_A }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("; Secure");

    const del = await panelApi.authDelete(
      new Request("https://qeydai.az/api/panel/auth", {
        method: "DELETE",
        headers: { origin: "https://qeydai.az" },
      }),
    );
    expect(del.headers.get("set-cookie")).toContain("; Secure");
  });

  it("rejects invalid key, non-string key, empty config, expired/tampered/revoked cookie with 401", async () => {
    expect((await panelApi.authGet(panelReq("/api/panel/auth"))).status).toBe(401);
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: `${PANEL_COOKIE_NAME}=bad.token` }))).status).toBe(
      401,
    );

    expect(
      (await panelApi.authPost(panelReq("/api/panel/auth", { method: "POST", body: { key: "wrong-key" } }))).status,
    ).toBe(401);
    expect(
      (await panelApi.authPost(panelReq("/api/panel/auth", { method: "POST", body: { key: 12345 } }))).status,
    ).toBe(401);

    const cookie = await loginCookie(ADMIN_KEY_A);
    // Advance past 8h TTL
    nowMs += 8 * 3600 * 1000 + 1;
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie }))).status).toBe(401);

    // Revoked tenant / empty adminKeys fails closed
    nowMs = NOW.getTime();
    const validCookie = await loginCookie(ADMIN_KEY_A);
    authConfig = makeAuthConfig({ [ADMIN_KEY_B]: "tenant_bravo" });
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: validCookie }))).status).toBe(401);

    authConfig = makeAuthConfig({});
    expect((await panelApi.authGet(panelReq("/api/panel/auth", { cookie: validCookie }))).status).toBe(401);
    expect(
      (await panelApi.authPost(panelReq("/api/panel/auth", { method: "POST", body: { key: ADMIN_KEY_A } }))).status,
    ).toBe(503);
  });

  it("enforces sameOrigin CSRF on POST and DELETE auth, and rate-limits authPost by client IP", async () => {
    setup({ authRateMax: 2 });
    expect(
      (
        await panelApi.authPost(
          panelReq("/api/panel/auth", {
            method: "POST",
            body: { key: ADMIN_KEY_A },
            headers: { origin: "https://evil.example" },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await panelApi.authDelete(
          panelReq("/api/panel/auth", {
            method: "DELETE",
            headers: { "sec-fetch-site": "cross-site" },
          }),
        )
      ).status,
    ).toBe(403);

    const prevTrustProxy = process.env.TRUST_PROXY;
    try {
      // Untrusted proxy default: spoofed x-real-ip headers share a single bucket and cannot bypass rate limit
      delete process.env.TRUST_PROXY;
      const u1 = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: "bad1" }, headers: { "x-real-ip": "10.0.0.1" } }),
      );
      const u2 = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: "bad2" }, headers: { "x-real-ip": "10.0.0.2" } }),
      );
      const u3 = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: ADMIN_KEY_A }, headers: { "x-real-ip": "10.0.0.3" } }),
      );
      expect([u1.status, u2.status, u3.status]).toEqual([401, 401, 429]);

      // Behind TRUST_PROXY=x-real-ip: distinct IPs have separate buckets
      setup({ authRateMax: 2 });
      process.env.TRUST_PROXY = "x-real-ip";
      const r1 = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: "bad1" }, headers: { "x-real-ip": "1.2.3.4" } }),
      );
      const r2 = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: "bad2" }, headers: { "x-real-ip": "1.2.3.4" } }),
      );
      const r3 = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: ADMIN_KEY_A }, headers: { "x-real-ip": "1.2.3.4" } }),
      );
      expect([r1.status, r2.status, r3.status]).toEqual([401, 401, 429]);

      const otherIp = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: ADMIN_KEY_A }, headers: { "x-real-ip": "5.6.7.8" } }),
      );
      expect(otherIp.status).toBe(200);

      // Evicts oldest key instead of global lockout when authMaxKeys is reached
      setup({ authRateMax: 1, authMaxKeys: 2 });
      process.env.TRUST_PROXY = "x-real-ip";
      await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: "bad" }, headers: { "x-real-ip": "9.9.9.1" } }),
      );
      await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: "bad" }, headers: { "x-real-ip": "9.9.9.2" } }),
      );
      const legitAfterFlood = await panelApi.authPost(
        panelReq("/api/panel/auth", { method: "POST", body: { key: ADMIN_KEY_A }, headers: { "x-real-ip": "9.9.9.3" } }),
      );
      expect(legitAfterFlood.status).toBe(200);
    } finally {
      if (prevTrustProxy === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = prevTrustProxy;
    }
  });

  it("enforces content-type 415, payload_too_large 413, and invalid_json 400 (including arrays/primitives)", async () => {
    expect(
      (
        await panelApi.authPost(
          panelReq("/api/panel/auth", { method: "POST", body: "{}", contentType: "text/plain" }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await panelApi.authPost(
          panelReq("/api/panel/auth", { method: "POST", body: { key: "x".repeat(3000) } }),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await panelApi.authPost(
          panelReq("/api/panel/auth", { method: "POST", body: "not-json" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await panelApi.authPost(
          panelReq("/api/panel/auth", { method: "POST", body: "[]" }),
        )
      ).status,
    ).toBe(400);
  });
});

describe("Panel sessions (/api/panel/sessions)", () => {
  it("lists sessions with grouped enrollments and creates sessions with tenant from cookie", async () => {
    const cookieA = await loginCookie(ADMIN_KEY_A);
    const cookieB = await loginCookie(ADMIN_KEY_B);

    const createRes = await panelApi.createSession(
      panelReq("/api/panel/sessions", {
        method: "POST",
        cookie: cookieA,
        body: {
          id: "ielts-sat-1100",
          courseId: "ielts",
          startsAt: "2026-06-06T11:00:00+04:00",
          capacity: 5,
          tenantId: "tenant_bravo", // must be ignored
        },
      }),
    );
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    expect(createdBody).toEqual({
      ok: true,
      session: {
        id: "ielts-sat-1100",
        courseId: "ielts",
        startsAt: "2026-06-06T07:00:00.000Z",
        capacity: 5,
        taken: 0,
        seatsLeft: 5,
        enrollments: [],
      },
    });

    // Duplicate session returns 409
    const dupRes = await panelApi.createSession(
      panelReq("/api/panel/sessions", {
        method: "POST",
        cookie: cookieA,
        body: { id: "ielts-sat-1100", courseId: "ielts", startsAt: FUTURE, capacity: 5 },
      }),
    );
    expect(dupRes.status).toBe(409);
    expect((await dupRes.json()).error).toBe("session_exists");

    // Enroll a student via M2M API
    await enrollApi.enroll(
      new Request("http://x/api/v1/enroll", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer enroll_key_alpha_1234567890abcd",
        },
        body: JSON.stringify({ sessionId: "ielts-sat-1100", name: "Leyla", phone: "0501234567" }),
      }),
    );

    const listA = await panelApi.listSessions(panelReq("/api/panel/sessions", { cookie: cookieA }));
    expect(listA.status).toBe(200);
    const bodyA = await listA.json();
    expect(bodyA.sessions).toHaveLength(1);
    expect(bodyA.sessions[0].taken).toBe(1);
    expect(bodyA.sessions[0].seatsLeft).toBe(4);
    expect(bodyA.sessions[0].enrollments).toHaveLength(1);
    expect(bodyA.sessions[0].enrollments[0]).toMatchObject({
      sessionId: "ielts-sat-1100",
      name: "Leyla",
      phone: "+994501234567",
    });

    // Tenant B sees zero sessions
    const listB = await panelApi.listSessions(panelReq("/api/panel/sessions", { cookie: cookieB }));
    expect(await listB.json()).toEqual({ ok: true, sessions: [] });
  });

  it("validates session fields and enforces auth + CSRF", async () => {
    expect((await panelApi.listSessions(panelReq("/api/panel/sessions"))).status).toBe(401);
    const cookieA = await loginCookie(ADMIN_KEY_A);

    expect(
      (
        await panelApi.createSession(
          panelReq("/api/panel/sessions", {
            method: "POST",
            cookie: cookieA,
            body: { id: "s1", courseId: "ielts", startsAt: FUTURE, capacity: 5 },
            headers: { origin: "https://evil.example" },
          }),
        )
      ).status,
    ).toBe(403);

    const badCases: Array<[string, Record<string, unknown>]> = [
      ["id", { id: "bad space", courseId: "ielts", startsAt: FUTURE, capacity: 5 }],
      ["courseId", { id: "s1", courseId: "", startsAt: FUTURE, capacity: 5 }],
      ["startsAt", { id: "s1", courseId: "ielts", startsAt: PAST, capacity: 5 }],
      ["startsAt", { id: "s1", courseId: "ielts", startsAt: "2026-06-02T07:00:00", capacity: 5 }],
      ["capacity", { id: "s1", courseId: "ielts", startsAt: FUTURE, capacity: 0 }],
      ["capacity", { id: "s1", courseId: "ielts", startsAt: FUTURE, capacity: 1001 }],
    ];
    for (const [field, body] of badCases) {
      const res = await panelApi.createSession(panelReq("/api/panel/sessions", { method: "POST", cookie: cookieA, body }));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ ok: false, error: "invalid_input", field });
    }
  });
});

describe("Panel CRM leads & PATCH /api/panel/leads/[id]", () => {
  it("creates, filters, searches, updates, and isolates leads per tenant", async () => {
    const cookieA = await loginCookie(ADMIN_KEY_A);
    const cookieB = await loginCookie(ADMIN_KEY_B);

    const c1 = await panelApi.createLead(
      panelReq("/api/panel/leads", {
        method: "POST",
        cookie: cookieA,
        body: { name: "Nigar M", phone: "050 222 33 44", note: "Line 1\nLine 2\tinfo" },
      }),
    );
    expect(c1.status).toBe(201);
    const lead1 = (await c1.json()).lead;
    expect(lead1).toMatchObject({
      tenantId: "tenant_alpha",
      name: "Nigar M",
      phone: "+994502223344",
      source: "manual",
      stage: "new",
      note: "Line 1\nLine 2\tinfo",
    });

    nowMs += 1000;
    const c2 = await panelApi.createLead(
      panelReq("/api/panel/leads", {
        method: "POST",
        cookie: cookieA,
        body: { name: "Kamran", phone: "+994559998877", source: "instagram", stage: "contacted", note: "IELTS B2" },
      }),
    );
    expect(c2.status).toBe(201);

    // Filter by stage, source, q
    const byStage = await (await panelApi.listLeads(panelReq("/api/panel/leads?stage=contacted", { cookie: cookieA }))).json();
    expect(byStage.leads).toHaveLength(1);
    expect(byStage.leads[0].name).toBe("Kamran");

    const bySource = await (await panelApi.listLeads(panelReq("/api/panel/leads?source=manual", { cookie: cookieA }))).json();
    expect(bySource.leads).toHaveLength(1);
    expect(bySource.leads[0].name).toBe("Nigar M");

    const byQ = await (await panelApi.listLeads(panelReq("/api/panel/leads?q=b2", { cookie: cookieA }))).json();
    expect(byQ.leads).toHaveLength(1);
    expect(byQ.leads[0].name).toBe("Kamran");

    // Invalid query params return 422
    expect((await panelApi.listLeads(panelReq("/api/panel/leads?stage=bogus", { cookie: cookieA }))).status).toBe(422);
    expect((await panelApi.listLeads(panelReq("/api/panel/leads?source=fax", { cookie: cookieA }))).status).toBe(422);

    // Tenant B cannot see or patch Tenant A's lead
    expect((await (await panelApi.listLeads(panelReq("/api/panel/leads", { cookie: cookieB }))).json()).leads).toEqual([]);
    const crossPatch = await panelApi.updateLead(
      panelReq(`/api/panel/leads/${lead1.id}`, {
        method: "PATCH",
        cookie: cookieB,
        body: { stage: "paid" },
      }),
      lead1.id,
    );
    expect(crossPatch.status).toBe(404);

    // Tenant A patches stage and clears note
    nowMs += 1000;
    const patched = await panelApi.updateLead(
      panelReq(`/api/panel/leads/${lead1.id}`, {
        method: "PATCH",
        cookie: cookieA,
        body: { stage: "trial_booked", note: "" },
      }),
      lead1.id,
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).lead).toMatchObject({
      id: lead1.id,
      stage: "trial_booked",
      note: "",
    });
  });

  it("validates createLead and updateLead payloads and rejects CSRF", async () => {
    const cookieA = await loginCookie(ADMIN_KEY_A);

    expect(
      (
        await panelApi.createLead(
          panelReq("/api/panel/leads", {
            method: "POST",
            cookie: cookieA,
            body: { name: "Ali", phone: "0501234567" },
            headers: { origin: "https://evil.example" },
          }),
        )
      ).status,
    ).toBe(403);

    expect(
      await (
        await panelApi.createLead(
          panelReq("/api/panel/leads", { method: "POST", cookie: cookieA, body: { name: "Ali", phone: "123" } }),
        )
      ).json(),
    ).toEqual({ ok: false, error: "invalid_input", field: "phone" });

    expect(
      await (
        await panelApi.createLead(
          panelReq("/api/panel/leads", {
            method: "POST",
            cookie: cookieA,
            body: { name: "Ali", phone: "0501234567", note: "bad\u0007bell" },
          }),
        )
      ).json(),
    ).toEqual({ ok: false, error: "invalid_input", field: "note" });

    // PATCH with neither stage nor note
    const missingPatch = await panelApi.updateLead(
      panelReq("/api/panel/leads/some-id", { method: "PATCH", cookie: cookieA, body: {} }),
      "some-id",
    );
    expect(missingPatch.status).toBe(422);

    // PATCH with empty id
    const badId = await panelApi.updateLead(
      panelReq("/api/panel/leads/%20", { method: "PATCH", cookie: cookieA, body: { stage: "paid" } }),
      "   ",
    );
    expect(badId.status).toBe(422);
  });
});

describe("Panel Inbox messages (/api/panel/messages)", () => {
  it("lists and sends messages, bumps lead.updatedAt, enforces polarity and tenant isolation", async () => {
    const cookieA = await loginCookie(ADMIN_KEY_A);
    const cookieB = await loginCookie(ADMIN_KEY_B);

    const leadRes1 = await panelApi.createLead(
      panelReq("/api/panel/leads", {
        method: "POST",
        cookie: cookieA,
        body: { name: "Aysel", phone: "0501112233", source: "whatsapp" },
      }),
    );
    const lead1 = (await leadRes1.json()).lead;

    nowMs += 1000;
    const leadRes2 = await panelApi.createLead(
      panelReq("/api/panel/leads", {
        method: "POST",
        cookie: cookieA,
        body: { name: "Murad", phone: "0504445566", source: "telegram" },
      }),
    );
    const lead2 = (await leadRes2.json()).lead;

    // Staff reply defaults sender=staff, direction=out, channel=lead.source
    nowMs += 5000;
    const msgRes = await panelApi.createMessage(
      panelReq("/api/panel/messages", {
        method: "POST",
        cookie: cookieA,
        body: { leadId: lead1.id, body: "Salam! Sabah saat 11:00 uyğundur?" },
      }),
    );
    expect(msgRes.status).toBe(201);
    const createdMsg = (await msgRes.json()).message;
    expect(createdMsg).toMatchObject({
      leadId: lead1.id,
      channel: "whatsapp",
      direction: "out",
      sender: "staff",
      body: "Salam! Sabah saat 11:00 uyğundur?",
    });

    // lead1 floated above lead2 because updatedAt bumped
    const leadsList = await (await panelApi.listLeads(panelReq("/api/panel/leads", { cookie: cookieA }))).json();
    expect(leadsList.leads.map((l: { id: string }) => l.id)).toEqual([lead1.id, lead2.id]);

    // Filter messages by leadId
    const byLead = await panelApi.listMessages(
      panelReq(`/api/panel/messages?leadId=${lead1.id}`, { cookie: cookieA }),
    );
    expect(byLead.status).toBe(200);
    expect((await byLead.json()).messages).toHaveLength(1);

    // Unknown or cross-tenant leadId returns 404 on GET and POST
    expect(
      (await panelApi.listMessages(panelReq(`/api/panel/messages?leadId=${lead1.id}`, { cookie: cookieB }))).status,
    ).toBe(404);
    expect(
      (
        await panelApi.createMessage(
          panelReq("/api/panel/messages", {
            method: "POST",
            cookie: cookieB,
            body: { leadId: lead1.id, body: "Hijack" },
          }),
        )
      ).status,
    ).toBe(404);

    // Direction mismatch rejected
    const badDir = await panelApi.createMessage(
      panelReq("/api/panel/messages", {
        method: "POST",
        cookie: cookieA,
        body: { leadId: lead1.id, body: "Hello", sender: "staff", direction: "in" },
      }),
    );
    expect(badDir.status).toBe(422);
    expect(await badDir.json()).toEqual({ ok: false, error: "invalid_input", field: "direction" });

    // Student message with direction="in" succeeds
    const studentMsg = await panelApi.createMessage(
      panelReq("/api/panel/messages", {
        method: "POST",
        cookie: cookieA,
        body: { leadId: lead1.id, body: "Bəli, gələcəyəm", sender: "student" },
      }),
    );
    expect(studentMsg.status).toBe(201);
    expect((await studentMsg.json()).message.direction).toBe("in");
  });
});

describe("Panel overview (/api/panel/overview) & rate limit & 500", () => {
  it("aggregates sessions, leadsByStage, enrollments, messages, and analytics summary", async () => {
    const cookieA = await loginCookie(ADMIN_KEY_A);

    writeFileSync(
      analyticsFile,
      [
        JSON.stringify({ event: "page_viewed", props: { locale: "az", utm_source: "instagram" } }),
        JSON.stringify({ event: "cta_clicked", props: { locale: "az", location: "hero" } }),
        JSON.stringify({ event: "lead_form_submitted", props: { locale: "az" } }),
      ].join("\n") + "\n",
      "utf8",
    );

    await panelApi.createSession(
      panelReq("/api/panel/sessions", {
        method: "POST",
        cookie: cookieA,
        body: { id: "s1", courseId: "ielts", startsAt: FUTURE, capacity: 10 },
      }),
    );
    await enrollApi.enroll(
      new Request("http://x/api/v1/enroll", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer enroll_key_alpha_1234567890abcd",
        },
        body: JSON.stringify({ sessionId: "s1", name: "Tural", phone: "0507778899" }),
      }),
    );
    const l1 = (
      await (
        await panelApi.createLead(
          panelReq("/api/panel/leads", {
            method: "POST",
            cookie: cookieA,
            body: { name: "A", phone: "0501111111", stage: "new" },
          }),
        )
      ).json()
    ).lead;
    await panelApi.createLead(
      panelReq("/api/panel/leads", {
        method: "POST",
        cookie: cookieA,
        body: { name: "B", phone: "0502222222", stage: "paid" },
      }),
    );
    await panelApi.createMessage(
      panelReq("/api/panel/messages", {
        method: "POST",
        cookie: cookieA,
        body: { leadId: l1.id, body: "Hi" },
      }),
    );

    const ov = await panelApi.overview(panelReq("/api/panel/overview", { cookie: cookieA }));
    expect(ov.status).toBe(200);
    const data = await ov.json();
    expect(data).toMatchObject({
      ok: true,
      tenantId: "tenant_alpha",
      totalLeads: 2,
      totalEnrollments: 1,
      totalMessages: 1,
      leadsByStage: { new: 1, contacted: 0, trial_booked: 0, paid: 1, lost: 0 },
      sessions: [{ id: "s1", courseId: "ielts", startsAt: FUTURE, capacity: 10, taken: 1, seatsLeft: 9 }],
    });
    expect(data.analytics.pageViews).toBe(1);
    expect(data.analytics.ctaClicks).toBe(1);
    expect(data.analytics.leadFormSubmitted).toBe(1);
    expect(data.analytics.byUtmSource).toEqual({ instagram: 1 });
  });

  it("rate-limits authenticated endpoints per tenant and returns 500 without details on store failure", async () => {
    setup({ apiRateMax: 2 });
    const cookieA = await loginCookie(ADMIN_KEY_A);
    const cookieB = await loginCookie(ADMIN_KEY_B);

    expect((await panelApi.overview(panelReq("/api/panel/overview", { cookie: cookieA }))).status).toBe(200);
    expect((await panelApi.listLeads(panelReq("/api/panel/leads", { cookie: cookieA }))).status).toBe(200);
    expect((await panelApi.listMessages(panelReq("/api/panel/messages", { cookie: cookieA }))).status).toBe(429);
    // Tenant B has its own quota
    expect((await panelApi.overview(panelReq("/api/panel/overview", { cookie: cookieB }))).status).toBe(200);

    store.close();
    const errRes = await panelApi.overview(panelReq("/api/panel/overview", { cookie: cookieB }));
    expect(errRes.status).toBe(500);
    expect(await errRes.json()).toEqual({ ok: false, error: "server_error" });
  });
});

describe("M2M /api/v1/leads & /api/v1/messages", () => {
  const m2mReq = (urlPath: string, body: unknown, key: string | null = "enroll_key_alpha_1234567890abcd", ct = "application/json") =>
    new Request(`http://x${urlPath}`, {
      method: "POST",
      headers: {
        ...(ct ? { "content-type": ct } : {}),
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  it("upserts leads (default source telegram), merges notes on duplicate phone, and logs messages", async () => {
    const r1 = await enrollApi.upsertLead(
      m2mReq("/api/v1/leads", { name: "Sabina", phone: "050 333 44 55", note: "Asked price", tenantId: "tenant_bravo" }),
    );
    expect(r1.status).toBe(201);
    expect(r1.headers.get("cache-control")).toBe("no-store");
    const b1 = await r1.json();
    expect(b1.ok).toBe(true);
    expect(b1.stage).toBe("new");

    // Upsert same phone updates & appends note, keeps same id
    nowMs += 1000;
    const r2 = await enrollApi.upsertLead(
      m2mReq("/api/v1/leads", { name: "Sabina Aliyeva", phone: "+994503334455", stage: "contacted", note: "Wants Saturday" }),
    );
    expect(r2.status).toBe(201);
    const b2 = await r2.json();
    expect(b2.leadId).toBe(b1.leadId);
    expect(b2.stage).toBe("contacted");

    const storedLead = await store.getLead("tenant_alpha", b1.leadId);
    expect(storedLead?.source).toBe("telegram");
    expect(storedLead?.note).toBe("Asked price\nWants Saturday");
    // Never leaked into tenant_bravo
    expect(await store.listLeads("tenant_bravo")).toEqual([]);

    // Log student inbound message (default sender=student, direction=in, channel=lead.source)
    nowMs += 2000;
    const m1 = await enrollApi.addMessage(
      m2mReq("/api/v1/messages", { leadId: b1.leadId, body: "IELTS kursu neçəyədir?" }),
    );
    expect(m1.status).toBe(201);
    const mb1 = await m1.json();
    expect(mb1.ok).toBe(true);
    expect(mb1.messageId).toMatch(/^[0-9a-f-]{36}$/);

    // Log AI reply
    nowMs += 1000;
    const m2 = await enrollApi.addMessage(
      m2mReq("/api/v1/messages", { leadId: b1.leadId, body: "Aylıq 120 AZN-dir.", sender: "ai" }),
    );
    expect(m2.status).toBe(201);

    const msgs = await store.listMessages("tenant_alpha", b1.leadId);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ channel: "telegram", direction: "in", sender: "student" });
    expect(msgs[1]).toMatchObject({ channel: "telegram", direction: "out", sender: "ai" });

    // lead.updatedAt was bumped by addMessage
    const updatedLead = await store.getLead("tenant_alpha", b1.leadId);
    expect(updatedLead?.updatedAt).toBe(new Date(nowMs).toISOString());
  });

  it("enforces auth, tenant isolation, 16KB limit, validation, and rate limits on M2M CRM endpoints", async () => {
    expect((await enrollApi.upsertLead(m2mReq("/api/v1/leads", { name: "A", phone: "0501234567" }, null))).status).toBe(401);
    expect((await enrollApi.upsertLead(m2mReq("/api/v1/leads", { name: "A", phone: "0501234567" }, ADMIN_KEY_A))).status).toBe(
      401,
    );
    expect((await enrollApi.addMessage(m2mReq("/api/v1/messages", { leadId: "x", body: "hi" }, "wrong"))).status).toBe(401);

    // Allows bodies between 2KB and 16KB, rejects > 16KB
    const mediumNote = "a".repeat(1900);
    const okMed = await enrollApi.upsertLead(
      m2mReq("/api/v1/leads", { name: "Ali", phone: "0501234567", note: mediumNote, pad: "p".repeat(2500) }),
    );
    expect(okMed.status).toBe(201);

    const tooBig = await enrollApi.upsertLead(
      m2mReq("/api/v1/leads", { name: "Ali", phone: "0501234567", pad: "p".repeat(17000) }),
    );
    expect(tooBig.status).toBe(413);

    // Cross-tenant message returns 404
    const alphaLeadId = (await okMed.json()).leadId;
    const crossMsg = await enrollApi.addMessage(
      m2mReq("/api/v1/messages", { leadId: alphaLeadId, body: "hi" }, "enroll_key_bravo_1234567890abcd"),
    );
    expect(crossMsg.status).toBe(404);

    // Validation failures
    expect(
      (await enrollApi.upsertLead(m2mReq("/api/v1/leads", { name: "Ali", phone: "0501234567", source: "sms" }))).status,
    ).toBe(422);
    expect(
      (await enrollApi.addMessage(m2mReq("/api/v1/messages", { leadId: alphaLeadId, body: "hi", sender: "ai", direction: "in" })))
        .status,
    ).toBe(422);

    // Rate limit
    setup({ rateMax: 1 });
    expect((await enrollApi.upsertLead(m2mReq("/api/v1/leads", { name: "Ali", phone: "0501234567" }))).status).toBe(201);
    expect((await enrollApi.upsertLead(m2mReq("/api/v1/leads", { name: "Ali", phone: "0501234567" }))).status).toBe(429);
  });
});

describe("Build-phase guard (instance.ts)", () => {
  it("returns 503 unavailable_during_build for all handlers during NEXT_PHASE=phase-production-build", async () => {
    const prev = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = "phase-production-build";
    try {
      const eApi = getEnrollApi();
      const pApi = getPanelApi();
      const req = new Request("http://localhost:3000/api/panel/overview");

      for (const res of await Promise.all([
        eApi.listSessions(req),
        eApi.upsertLead(req),
        eApi.addMessage(req),
        pApi.authGet(req),
        pApi.authPost(req),
        pApi.authDelete(req),
        pApi.overview(req),
        pApi.listSessions(req),
        pApi.createSession(req),
        pApi.listLeads(req),
        pApi.createLead(req),
        pApi.updateLead(req, "id1"),
        pApi.listMessages(req),
        pApi.createMessage(req),
      ])) {
        expect(res.status).toBe(503);
        expect(await res.json()).toEqual({ ok: false, error: "unavailable_during_build" });
      }
    } finally {
      if (prev === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = prev;
    }
  });
});
