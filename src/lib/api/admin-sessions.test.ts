import { beforeEach, describe, expect, it } from "vitest";
import { SqliteEnrollmentStore } from "../enrollment/sqlite-store";
import { createEnrollApi } from "./enroll-api";

const NOW = new Date("2026-06-01T08:00:00Z");
const KEYS = { "key-t1": "t1", "key-t2": "t2" };
const ADMIN_KEYS = { "admin-t1": "t1", "admin-t2": "t2" };

let store: SqliteEnrollmentStore;
let api: ReturnType<typeof createEnrollApi>;

beforeEach(() => {
  store = new SqliteEnrollmentStore(":memory:");
  api = createEnrollApi({ store, keys: KEYS, adminKeys: ADMIN_KEYS, now: () => NOW, rateMax: 1000 });
});

const valid = { id: "ielts-sat-1100", courseId: "ielts", startsAt: "2026-06-06T11:00:00+04:00", capacity: 8 };
const create = (body: unknown, key: string | null = "admin-t1", contentType = "application/json") =>
  new Request("http://x/api/v1/sessions", {
    method: "POST",
    headers: { "content-type": contentType, ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const list = (key: string) => new Request("http://x/api/v1/sessions", { headers: { authorization: `Bearer ${key}` } });

describe("POST /api/v1/sessions (admin)", () => {
  it("creates a session for the admin key's tenant and normalizes startsAt to UTC", async () => {
    const res = await api.createSession(create(valid));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      session: { id: "ielts-sat-1100", courseId: "ielts", startsAt: "2026-06-06T07:00:00.000Z", capacity: 8 },
    });
    const listed = await (await api.listSessions(list("key-t1"))).json();
    expect(listed.sessions).toEqual([{ id: "ielts-sat-1100", courseId: "ielts", startsAt: "2026-06-06T07:00:00.000Z", seatsLeft: 8 }]);
  });

  it("never lets the body choose the tenant", async () => {
    const res = await api.createSession(create({ ...valid, tenantId: "t2" }));
    expect(res.status).toBe(201);
    expect((await (await api.listSessions(list("key-t2"))).json()).sessions).toEqual([]);
    expect(await store.getSession("t1", valid.id)).not.toBeNull();
  });

  it("rejects missing, wrong and enrollment-scope keys", async () => {
    expect((await api.createSession(create(valid, null))).status).toBe(401);
    expect((await api.createSession(create(valid, "wrong"))).status).toBe(401);
    const scoped = await api.createSession(create(valid, "key-t1"));
    expect(scoped.status).toBe(403);
    expect((await scoped.json()).error).toBe("forbidden");
    expect(await store.getSession("t1", valid.id)).toBeNull();
  });

  it("admin keys cannot enroll or list (least privilege)", async () => {
    expect((await api.listSessions(list("admin-t1"))).status).toBe(401);
  });

  it("fails closed when no admin keys are configured", async () => {
    const closed = createEnrollApi({ store, keys: KEYS, now: () => NOW });
    expect((await closed.createSession(create(valid))).status).toBe(401);
  });

  it("returns 409 session_exists and never overwrites an existing session", async () => {
    expect((await api.createSession(create(valid))).status).toBe(201);
    const again = await api.createSession(create({ ...valid, capacity: 1 }));
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("session_exists");
    expect((await store.getSession("t1", valid.id))?.capacity).toBe(8);
  });

  it("the same id may exist under another tenant", async () => {
    expect((await api.createSession(create(valid, "admin-t1"))).status).toBe(201);
    expect((await api.createSession(create(valid, "admin-t2"))).status).toBe(201);
  });

  it.each([
    ["id", { id: "" }],
    ["id", { id: "has space" }],
    ["id", { id: "a".repeat(65) }],
    ["id", { id: 42 }],
    ["courseId", { courseId: "" }],
    ["courseId", { courseId: "x\u0000y" }],
    ["startsAt", { startsAt: "2026-06-06T11:00:00" }],
    ["startsAt", { startsAt: "tomorrow" }],
    ["startsAt", { startsAt: "2026-05-31T07:00:00Z" }],
    ["capacity", { capacity: 0 }],
    ["capacity", { capacity: 2.5 }],
    ["capacity", { capacity: "8" }],
    ["capacity", { capacity: 1001 }],
  ])("rejects invalid %s with 422", async (field, patch) => {
    const res = await api.createSession(create({ ...valid, ...patch }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_input", field });
  });

  it("rejects bad JSON, wrong content type and oversized bodies", async () => {
    expect((await api.createSession(create("{oops"))).status).toBe(400);
    expect((await api.createSession(create(valid, "admin-t1", "text/plain"))).status).toBe(415);
    expect((await api.createSession(create({ ...valid, pad: "x".repeat(3000) }))).status).toBe(413);
  });

  it("returns 500 without details when the store fails", async () => {
    store.close();
    const res = await api.createSession(create(valid));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_error" });
  });
});
