import { beforeEach, describe, expect, it } from "vitest";
import { SqliteEnrollmentStore } from "../enrollment/sqlite-store";
import { createEnrollApi } from "./enroll-api";

const NOW = new Date("2026-06-01T08:00:00Z");
const FUTURE = "2026-06-02T07:00:00Z";
const PAST = "2026-05-31T07:00:00Z";
const KEYS = { "key-t1": "t1", "key-t2": "t2" };

let store: SqliteEnrollmentStore;
let api: ReturnType<typeof createEnrollApi>;

function setup(rateMax = 1000) {
  store = new SqliteEnrollmentStore(":memory:");
  store.addSession({ id: "s1", tenantId: "t1", courseId: "ielts", startsAt: FUTURE, capacity: 2 });
  store.addSession({ id: "past", tenantId: "t1", courseId: "ielts", startsAt: PAST, capacity: 5 });
  store.addSession({ id: "x1", tenantId: "t2", courseId: "math", startsAt: FUTURE, capacity: 5 });
  api = createEnrollApi({ store, keys: KEYS, now: () => NOW, rateMax });
}
beforeEach(() => setup());

const headers = (key?: string, extra: Record<string, string> = {}) => ({
  "content-type": "application/json",
  ...(key ? { authorization: `Bearer ${key}` } : {}),
  ...extra,
});
const post = (body: unknown, key: string | null = "key-t1", extra: Record<string, string> = {}) =>
  new Request("http://x/api/v1/enroll", {
    method: "POST",
    headers: headers(key ?? undefined, extra),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const get = (key?: string | null, qs = "") => new Request(`http://x/api/v1/sessions${qs}`, { headers: headers(key ?? undefined) });
const person = (n = 1) => ({ sessionId: "s1", name: `Ali ${n}`, phone: `050 123 45 6${n}` });

describe("auth", () => {
  it.each([null, "wrong", ""])("rejects key %j with 401", async (k) => {
    expect((await api.enroll(post(person(), k))).status).toBe(401);
    expect((await api.listSessions(get(k))).status).toBe(401);
  });
  it("fails closed when no keys are configured", async () => {
    const closed = createEnrollApi({ store, keys: {}, now: () => NOW });
    expect((await closed.listSessions(get("key-t1"))).status).toBe(401);
  });
  it("does not accept the key in the query string", async () => {
    const res = await api.listSessions(new Request("http://x/api/v1/sessions?key=key-t1"));
    expect(res.status).toBe(401);
  });
});

describe("GET sessions", () => {
  it("lists only this tenant's upcoming sessions with seats left", async () => {
    const res = await api.listSessions(get("key-t1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("vary")).toMatch(/authorization/i);
    const body = await res.json();
    expect(body.sessions).toEqual([{ id: "s1", courseId: "ielts", startsAt: FUTURE, seatsLeft: 2 }]);
  });
  it("hides full sessions and never leaks other tenants", async () => {
    await api.enroll(post(person(1)));
    await api.enroll(post(person(2)));
    expect((await (await api.listSessions(get("key-t1"))).json()).sessions).toEqual([]);
    const t2 = await (await api.listSessions(get("key-t2"))).json();
    expect(t2.sessions.map((s: { id: string }) => s.id)).toEqual(["x1"]);
  });
  it("batches seat counts in GET /api/v1/sessions (no N+1)", async () => {
    store.addSession({ id: "s2", tenantId: "t1", courseId: "math", startsAt: FUTURE, capacity: 4 });
    let singleCalls = 0;
    let batchCalls = 0;
    const origSingle = store.countBySession.bind(store);
    const origBatch = store.countBySessions.bind(store);
    store.countBySession = async (t, id) => {
      singleCalls++;
      return origSingle(t, id);
    };
    store.countBySessions = async (t, ids) => {
      batchCalls++;
      return origBatch(t, ids);
    };
    await api.enroll(post(person(1)));
    const res = await api.listSessions(get("key-t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toHaveLength(2);
    expect(singleCalls).toBe(0);
    expect(batchCalls).toBe(1);
  });
});

describe("POST enroll", () => {
  it("creates an enrollment (201) without echoing personal data", async () => {
    const res = await api.enroll(post(person(1)));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.enrollmentId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(body)).not.toContain("Ali");
    expect(Object.keys(body).sort()).toEqual(["enrollmentId", "ok"]);
  });
  it.each([
    ["duplicate", 409],
    ["full", 409],
  ])("maps %s to %i", async (reason, status) => {
    await api.enroll(post(person(1)));
    if (reason === "full") await api.enroll(post(person(2)));
    const res = await api.enroll(post(reason === "duplicate" ? person(1) : person(3)));
    expect(res.status).toBe(status);
    expect((await res.json()).error).toBe(reason);
  });
  it("404 for unknown session and for another tenant's session", async () => {
    expect((await api.enroll(post({ ...person(), sessionId: "nope" }))).status).toBe(404);
    expect((await api.enroll(post({ ...person(), sessionId: "x1" }))).status).toBe(404);
  });
  it("409 session_started for past sessions", async () => {
    const res = await api.enroll(post({ ...person(), sessionId: "past" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("session_started");
  });
  it("422 for invalid input, 400 for bad JSON", async () => {
    expect((await api.enroll(post({ sessionId: "s1", name: "", phone: "1" }))).status).toBe(422);
    expect((await api.enroll(post("not json"))).status).toBe(400);
  });
  it("415 without a JSON content type, 413 for oversized body", async () => {
    expect((await api.enroll(post(person(), "key-t1", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await api.enroll(post({ ...person(), pad: "x".repeat(5000) }))).status).toBe(413);
  });
  it("20 parallel requests for 2 seats create exactly 2 enrollments", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        api.enroll(post({ sessionId: "s1", name: `P${i}`, phone: `+99450${String(2000000 + i)}` })),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(await store.countBySession("t1", "s1")).toBe(2);
  });
  it("never leaks internals on unexpected errors", async () => {
    store.close();
    const res = await api.enroll(post(person()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_error" });
  });
});

describe("rate limit", () => {
  it("limits per key, not across keys", async () => {
    setup(3);
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await api.listSessions(get("key-t1"))).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect((await api.listSessions(get("key-t2"))).status).toBe(200);
  });
});
