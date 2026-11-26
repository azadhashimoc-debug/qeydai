import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SqliteEnrollmentStore } from "@/lib/enrollment/sqlite-store";

let activeStore: SqliteEnrollmentStore;

vi.mock("@/lib/api/instance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/instance")>("@/lib/api/instance");
  return { ...actual, getSharedStore: () => activeStore };
});

import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as passwordPost } from "@/app/api/auth/password/route";
import { DELETE as accountDelete } from "@/app/api/auth/account/route";
import { POST as panelAuthPost } from "@/app/api/panel/auth/route";
import { GET as workspaceGet } from "@/app/api/panel/workspace/route";
import { GET as dealsGet } from "@/app/api/panel/deals/route";
import { PANEL_COOKIE_NAME } from "@/lib/api/panel-auth";

const SECRET = "test-account-secret-0123456789abcdef";

function post(path: string, body: unknown, ip = "10.0.0.1"): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function cookieOf(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${PANEL_COOKIE_NAME}=[^;]+`).exec(raw);
  return match ? match[0] : "";
}

const get = (path: string, cookie: string) =>
  new Request(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });

describe("email/password accounts", () => {
  let prev: Record<string, string | undefined>;

  beforeEach(() => {
    prev = {
      QEYDAI_PANEL_SECRET: process.env.QEYDAI_PANEL_SECRET,
      QEYDAI_ADMIN_KEYS: process.env.QEYDAI_ADMIN_KEYS,
      QEYDAI_DATABASE_URL: process.env.QEYDAI_DATABASE_URL,
      TRUST_PROXY: process.env.TRUST_PROXY,
    };
    process.env.TRUST_PROXY = "x-forwarded-for";
    process.env.QEYDAI_PANEL_SECRET = SECRET;
    delete process.env.QEYDAI_ADMIN_KEYS;
    delete process.env.QEYDAI_DATABASE_URL;
    activeStore = new SqliteEnrollmentStore(":memory:");
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("registers, opens a session and reaches the panel API with no admin keys configured", async () => {
    const res = await registerPost(post("/api/auth/register", { email: "Owner@Example.com", password: "Sifre-2026-ok", name: "Baki Salon" }, "10.1.0.1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; tenantId: string };
    expect(body.tenantId).toMatch(/^ws_[0-9a-f]{16}$/);
    const cookie = cookieOf(res);
    expect(cookie).not.toBe("");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");

    const ws = await workspaceGet(get("/api/panel/workspace", cookie));
    expect(ws.status).toBe(200);
    const wsBody = (await ws.json()) as { workspace: { name: string }; actor: { role: string } };
    expect(wsBody.workspace.name).toBe("Baki Salon");
    expect(wsBody.actor.role).toBe("owner");
    expect((await dealsGet(get("/api/panel/deals", cookie))).status).toBe(200);
    expect((await dealsGet(get("/api/panel/deals", ""))).status).toBe(401);
  });

  it("logs in with the right password only, case-insensitive email", async () => {
    await registerPost(post("/api/auth/register", { email: "a@example.com", password: "Sifre-2026-ok", name: "A Shop" }, "10.2.0.1"));
    const ok = await loginPost(post("/api/auth/login", { email: "A@EXAMPLE.com", password: "Sifre-2026-ok" }, "10.2.0.2"));
    expect(ok.status).toBe(200);
    expect(cookieOf(ok)).not.toBe("");
    const bad = await loginPost(post("/api/auth/login", { email: "a@example.com", password: "wrong-password-1" }, "10.2.0.3"));
    expect(bad.status).toBe(401);
    expect(cookieOf(bad)).toBe("");
    const unknown = await loginPost(post("/api/auth/login", { email: "nobody@example.com", password: "Sifre-2026-ok" }, "10.2.0.4"));
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual(await bad.json());
  });

  it("rejects duplicate email and invalid input", async () => {
    const first = await registerPost(post("/api/auth/register", { email: "dup@example.com", password: "Sifre-2026-ok", name: "One" }, "10.3.0.1"));
    expect(first.status).toBe(200);
    const dup = await registerPost(post("/api/auth/register", { email: "DUP@example.com", password: "Sifre-2026-ok", name: "Two" }, "10.3.0.2"));
    expect(dup.status).toBe(409);
    expect((await registerPost(post("/api/auth/register", { email: "bad", password: "Sifre-2026-ok", name: "X Y" }, "10.3.0.3"))).status).toBe(422);
    expect((await registerPost(post("/api/auth/register", { email: "ok@example.com", password: "short", name: "X Y" }, "10.3.0.4"))).status).toBe(422);
    expect((await registerPost(post("/api/auth/register", { email: "ok@example.com", password: "Sifre-2026-ok", name: "" }, "10.3.0.5"))).status).toBe(422);
    expect((await registerPost(post("/api/auth/register", "{not json", "10.3.0.6"))).status).toBe(400);
  });

  it("blocks cross-origin requests and is unavailable without a panel secret", async () => {
    const cross = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ email: "a@example.com", password: "Sifre-2026-ok" }),
    });
    expect((await loginPost(cross)).status).toBe(403);
    delete process.env.QEYDAI_PANEL_SECRET;
    expect((await registerPost(post("/api/auth/register", { email: "n@example.com", password: "Sifre-2026-ok", name: "No Secret" }, "10.4.0.1"))).status).toBe(503);
  });

  it("keeps workspaces isolated between accounts", async () => {
    const a = await registerPost(post("/api/auth/register", { email: "a1@example.com", password: "Sifre-2026-ok", name: "Alpha" }, "10.5.0.1"));
    const b = await registerPost(post("/api/auth/register", { email: "b1@example.com", password: "Sifre-2026-ok", name: "Bravo" }, "10.5.0.2"));
    const wa = (await (await workspaceGet(get("/api/panel/workspace", cookieOf(a)))).json()) as { workspace: { name: string } };
    const wb = (await (await workspaceGet(get("/api/panel/workspace", cookieOf(b)))).json()) as { workspace: { name: string } };
    expect([wa.workspace.name, wb.workspace.name]).toEqual(["Alpha", "Bravo"]);
  });

  it("rejects a forged or tampered account token", async () => {
    const res = await registerPost(post("/api/auth/register", { email: "t@example.com", password: "Sifre-2026-ok", name: "Tamper" }, "10.6.0.1"));
    const cookie = cookieOf(res);
    const [payload, sig] = cookie.split("=")[1].split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), t: "ws_other" })).toString("base64url");
    expect((await workspaceGet(get("/api/panel/workspace", `${PANEL_COOKIE_NAME}=${forged}.${sig}`))).status).toBe(401);
  });

  it("changes password, revokes previous session cookie, rotates cookie, and rejects old password", async () => {
    const reg = await registerPost(post("/api/auth/register", { email: "pw@example.com", password: "Sifre-2026-ok", name: "PW Co" }, "10.7.0.1"));
    const oldCookie = cookieOf(reg);

    const wrongCur = await passwordPost(
      new Request("http://localhost:3000/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: oldCookie, "x-forwarded-for": "10.7.0.2" },
        body: JSON.stringify({ currentPassword: "Wrong-password-1", newPassword: "New-Sifre-2026-ok" }),
      }),
    );
    expect(wrongCur.status).toBe(401);

    const weakNew = await passwordPost(
      new Request("http://localhost:3000/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: oldCookie, "x-forwarded-for": "10.7.0.2" },
        body: JSON.stringify({ currentPassword: "Sifre-2026-ok", newPassword: "short" }),
      }),
    );
    expect(weakNew.status).toBe(422);

    const crossOrigin = await passwordPost(
      new Request("http://localhost:3000/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example", cookie: oldCookie, "x-forwarded-for": "10.7.0.2" },
        body: JSON.stringify({ currentPassword: "Sifre-2026-ok", newPassword: "New-Sifre-2026-ok" }),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const changed = await passwordPost(
      new Request("http://localhost:3000/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: oldCookie, "x-forwarded-for": "10.7.0.3" },
        body: JSON.stringify({ currentPassword: "Sifre-2026-ok", newPassword: "New-Sifre-2026-ok" }),
      }),
    );
    expect(changed.status).toBe(200);
    const newCookie = cookieOf(changed);
    expect(newCookie).not.toBe("");
    expect(newCookie).not.toBe(oldCookie);

    expect((await workspaceGet(get("/api/panel/workspace", oldCookie))).status).toBe(401);
    expect((await workspaceGet(get("/api/panel/workspace", newCookie))).status).toBe(200);
    expect((await loginPost(post("/api/auth/login", { email: "pw@example.com", password: "Sifre-2026-ok" }, "10.7.0.4"))).status).toBe(401);
    expect((await loginPost(post("/api/auth/login", { email: "pw@example.com", password: "New-Sifre-2026-ok" }, "10.7.0.5"))).status).toBe(200);
  });

  it("rejects legacy admin-key sessions on account password/delete routes", async () => {
    process.env.QEYDAI_ADMIN_KEYS = JSON.stringify({ "admin-key-0123456789abcdef0123": "ws_admin" });
    const adminLogin = await panelAuthPost(post("/api/panel/auth", { key: "admin-key-0123456789abcdef0123" }, "10.9.0.1"));
    expect(adminLogin.status).toBe(200);
    const adminCookie = cookieOf(adminLogin);

    expect(
      (
        await passwordPost(
          new Request("http://localhost:3000/api/auth/password", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: adminCookie, "x-forwarded-for": "10.9.0.2" },
            body: JSON.stringify({ currentPassword: "Sifre-2026-ok", newPassword: "New-Sifre-2026-ok" }),
          }),
        )
      ).status,
    ).toBe(401);
  });

  it("deletes account after password verification, revokes session, and blocks login", async () => {
    const reg = await registerPost(post("/api/auth/register", { email: "del@example.com", password: "Sifre-2026-ok", name: "Del Co" }, "10.8.0.1"));
    const cookie = cookieOf(reg);

    const badPw = await accountDelete(
      new Request("http://localhost:3000/api/auth/account", {
        method: "DELETE",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie, "x-forwarded-for": "10.8.0.2" },
        body: JSON.stringify({ password: "Wrong-password-1" }),
      }),
    );
    expect(badPw.status).toBe(401);

    const del = await accountDelete(
      new Request("http://localhost:3000/api/auth/account", {
        method: "DELETE",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie, "x-forwarded-for": "10.8.0.3" },
        body: JSON.stringify({ password: "Sifre-2026-ok" }),
      }),
    );
    expect(del.status).toBe(200);
    expect(del.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await workspaceGet(get("/api/panel/workspace", cookie))).status).toBe(401);
    expect((await loginPost(post("/api/auth/login", { email: "del@example.com", password: "Sifre-2026-ok" }, "10.8.0.4"))).status).toBe(401);
  });
});
