import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SqliteEnrollmentStore } from "../enrollment/sqlite-store";
import { createPanelApi } from "./panel-api";
import {
  adminKeyFingerprint,
  derivePanelSecret,
  PANEL_COOKIE_NAME,
  PANEL_HINT_COOKIE_NAME,
  setPanelJtiStore,
} from "./panel-auth";

const ADMIN_KEY = "admin_key_p0_audit_1234567890abcdef";
const KEYS = { [ADMIN_KEY]: "tenant_p0" };

function config() {
  return {
    adminKeys: KEYS,
    allowedTenants: new Set(Object.values(KEYS)),
    allowedKeysByTenant: new Map([["tenant_p0", new Set([adminKeyFingerprint(ADMIN_KEY)])]]),
    secret: derivePanelSecret(KEYS),
  };
}

function login(key: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/panel/auth", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ key }),
  });
}

function sessionCookie(res: Response): string {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${PANEL_COOKIE_NAME}=`)) ?? "";
  return raw.split(";")[0];
}

let store: SqliteEnrollmentStore;
let prevTrustProxy: string | undefined;

beforeEach(() => {
  store = new SqliteEnrollmentStore(":memory:");
  setPanelJtiStore(store);
  prevTrustProxy = process.env.TRUST_PROXY;
  delete process.env.TRUST_PROXY;
});

afterEach(() => {
  setPanelJtiStore(null);
  store.close();
  if (prevTrustProxy === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = prevTrustProxy;
  vi.restoreAllMocks();
});

describe("panel auth P0 fixes", () => {
  it("caps anonymous login attempts process-wide without a shared per-client bucket", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = createPanelApi({ store, getAuthConfig: config, authRateMax: 5, authAnonRateMax: 3 });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await api.authPost(login(`bad-${i}`))).status);
    expect(statuses).toEqual([401, 401, 401, 429]);
  });

  it("sets a non-HttpOnly session hint on login and clears both cookies on logout", async () => {
    const api = createPanelApi({ store, getAuthConfig: config });
    const res = await api.authPost(login(ADMIN_KEY));
    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie();
    const hint = cookies.find((c) => c.startsWith(`${PANEL_HINT_COOKIE_NAME}=1`));
    expect(hint).toBeDefined();
    expect(hint).not.toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith(`${PANEL_COOKIE_NAME}=`))).toMatch(/HttpOnly/);

    const out = await api.authDelete(
      new Request("http://localhost:3000/api/panel/auth", { method: "DELETE", headers: { cookie: sessionCookie(res) } }),
    );
    expect(out.status).toBe(200);
    const cleared = out.headers.getSetCookie();
    expect(cleared.some((c) => c.startsWith(`${PANEL_COOKIE_NAME}=;`) && c.includes("Max-Age=0"))).toBe(true);
    expect(cleared.some((c) => c.startsWith(`${PANEL_HINT_COOKIE_NAME}=;`) && c.includes("Max-Age=0"))).toBe(true);

    // The revoked token is rejected and the 401 also clears the stale hint.
    const probe = await api.authGet(
      new Request("http://localhost:3000/api/panel/auth", { headers: { cookie: sessionCookie(res) } }),
    );
    expect(probe.status).toBe(401);
    expect(probe.headers.getSetCookie().some((c) => c.startsWith(`${PANEL_HINT_COOKIE_NAME}=;`))).toBe(true);
  });

  it("still clears cookies but reports 503 when logout revocation cannot be stored", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const api = createPanelApi({ store, getAuthConfig: config });
    const res = await api.authPost(login(ADMIN_KEY));
    setPanelJtiStore({
      revokePanelJti: async () => {
        throw new Error("db down");
      },
      isPanelJtiRevoked: async () => false,
    });
    const out = await api.authDelete(
      new Request("http://localhost:3000/api/panel/auth", { method: "DELETE", headers: { cookie: sessionCookie(res) } }),
    );
    expect(out.status).toBe(503);
    expect(await out.json()).toEqual({ ok: false, error: "revocation_unavailable" });
    expect(out.headers.getSetCookie().some((c) => c.startsWith(`${PANEL_COOKIE_NAME}=;`))).toBe(true);
  });
});
