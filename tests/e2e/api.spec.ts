import { expect, test } from "@playwright/test";
import { E2E_ADMIN_KEYS, E2E_BASE_URL, E2E_KEYS } from "../../playwright.config";

// Each Playwright project gets its own tenant (derived from its API key), so desktop and mobile never collide.
// A per-load tag makes seeded session IDs unique per worker, so parallel workers never fight over the same
// session seats. The tag is stable for the worker process: beforeAll and every test on that worker reuse it.
const SESSION_TAG = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const FUTURE = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

const sSmall = () => `s-small-${SESSION_TAG}`;
const sRace = () => `s-race-${SESSION_TAG}`;
const sOnly = (project: string) => `s-only-${project}-${SESSION_TAG}`;
const sAdmin = (project: string) => `s-admin-${project}-${SESSION_TAG}`;

// Seed through the admin API (never open the server's SQLite file from a test process).
// Several workers run this hook, each with its own tag, so no worker collides on session_exists.
test.beforeAll(async ({ playwright }, info) => {
  const project = info.project.name as "desktop" | "mobile";
  const admin = await playwright.request.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: { authorization: `Bearer ${E2E_ADMIN_KEYS[project]}` },
  });
  const seed = [
    { id: sSmall(), courseId: "ielts", startsAt: FUTURE, capacity: 2 },
    { id: sRace(), courseId: "math", startsAt: FUTURE, capacity: 3 },
    { id: sOnly(project), courseId: "art", startsAt: FUTURE, capacity: 5 },
  ];
  for (const data of seed) {
    expect([201, 409]).toContain((await admin.post("/api/v1/sessions", { data })).status());
  }
  await admin.dispose();
});

const keyFor = (project: string) => E2E_KEYS[project as "desktop" | "mobile"];
const auth = (project: string) => ({ authorization: `Bearer ${keyFor(project)}`, "content-type": "application/json" });

test("API rejects missing and wrong keys", async ({ request }) => {
  expect((await request.get("/api/v1/sessions")).status()).toBe(401);
  const wrong = await request.get("/api/v1/sessions", { headers: { authorization: "Bearer nope-nope-nope-nope-nope-nope" } });
  expect(wrong.status()).toBe(401);
  expect((await request.post("/api/v1/enroll", { data: {} })).status()).toBe(401);
});

test("sessions are scoped to the key's tenant", async ({ request }, info) => {
  const project = info.project.name as "desktop" | "mobile";
  const other = project === "desktop" ? "mobile" : "desktop";
  const res = await request.get("/api/v1/sessions", { headers: auth(project) });
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toBe("no-store");
  expect(res.headers()["vary"]).toMatch(/authorization/i);
  // Tests run in parallel: other workers' seeded sessions share this tenant. Isolation is what matters:
  // this worker's own session is listed, the other project's never is.
  const ids: string[] = (await res.json()).sessions.map((s: { id: string }) => s.id);
  expect(ids).toContain(sOnly(project));
  expect(ids).not.toContain(sOnly(other));
  expect(ids).not.toContain(sAdmin(other));
  const okPrefix = new RegExp(
    `^(s-small|s-race|s-only-${project}|s-admin-${project}|s-ui-${project}|s-ov-${project})(-|$)`,
  );
  for (const id of ids) expect(okPrefix.test(id)).toBe(true);
});

test("enroll: success, duplicate, full, unknown, invalid over real HTTP", async ({ request }, info) => {
  const project = info.project.name as "desktop" | "mobile";
  const h = auth(project);
  const enroll = (data: unknown) => request.post("/api/v1/enroll", { headers: h, data });
  const session = sSmall();

  const ok = await enroll({ sessionId: session, name: "Aygün", phone: "050 123 45 67" });
  expect(ok.status()).toBe(201);
  expect(JSON.stringify(await ok.json())).not.toContain("Aygün");

  expect((await enroll({ sessionId: session, name: "Aygün", phone: "+994501234567" })).status()).toBe(409);
  expect((await enroll({ sessionId: session, name: "Ali", phone: "055 111 22 33" })).status()).toBe(201);
  const full = await enroll({ sessionId: session, name: "Vəli", phone: "070 111 22 33" });
  expect(full.status()).toBe(409);
  expect((await full.json()).error).toBe("full");
  expect((await enroll({ sessionId: "nope", name: "X", phone: "050 123 45 67" })).status()).toBe(404);
  expect((await enroll({ sessionId: session, name: "", phone: "1" })).status()).toBe(422);

  const list = await (await request.get("/api/v1/sessions", { headers: h })).json();
  expect(list.sessions.map((s: { id: string }) => s.id)).not.toContain(session);
});

test("10 parallel enrollments for 3 seats: exactly 3 succeed", async ({ request }, info) => {
  const project = info.project.name as "desktop" | "mobile";
  const h = auth(project);
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      request.post("/api/v1/enroll", {
        headers: h,
        data: { sessionId: sRace(), name: `P${i}`, phone: `+99450${String(3000000 + i)}` },
      }),
    ),
  );
  const codes = results.map((r) => r.status());
  expect(codes.filter((c) => c === 201)).toHaveLength(3);
  expect(codes.filter((c) => c === 409)).toHaveLength(7);
});

test("admin key creates a session that the enrollment key can then book", async ({ request }, info) => {
  const project = info.project.name as "desktop" | "mobile";
  const admin = { authorization: `Bearer ${E2E_ADMIN_KEYS[project]}`, "content-type": "application/json" };
  const session = { id: sAdmin(project), courseId: "ielts", startsAt: FUTURE, capacity: 1 };

  // The enrollment key lacks the admin scope; the admin key has no enrollment scope.
  expect((await request.post("/api/v1/sessions", { headers: auth(project), data: session })).status()).toBe(403);
  expect((await request.get("/api/v1/sessions", { headers: admin })).status()).toBe(401);

  const created = await request.post("/api/v1/sessions", { headers: admin, data: session });
  expect(created.status()).toBe(201);
  expect(created.headers()["cache-control"]).toBe("no-store");
  expect((await created.json()).session).toEqual(session);

  const again = await request.post("/api/v1/sessions", { headers: admin, data: { ...session, capacity: 9 } });
  expect(again.status()).toBe(409);
  const bad = await request.post("/api/v1/sessions", { headers: admin, data: { ...session, id: "bad id" } });
  expect(await bad.json()).toEqual({ ok: false, error: "invalid_input", field: "id" });

  const listed = await (await request.get("/api/v1/sessions", { headers: auth(project) })).json();
  expect(listed.sessions).toContainEqual({ id: session.id, courseId: "ielts", startsAt: FUTURE, seatsLeft: 1 });
  const enroll = (phone: string) =>
    request.post("/api/v1/enroll", { headers: auth(project), data: { sessionId: session.id, name: "Aygün", phone } });
  expect((await enroll("050 765 43 21")).status()).toBe(201);
  expect((await enroll("055 765 43 21")).status()).toBe(409);
});

test("another tenant's key cannot enroll into this tenant's session", async ({ request }, info) => {
  const project = info.project.name as "desktop" | "mobile";
  const other = project === "desktop" ? "mobile" : "desktop";
  const res = await request.post("/api/v1/enroll", {
    headers: auth(other),
    data: { sessionId: sOnly(project), name: "Ali", phone: "050 999 88 77" },
  });
  expect(res.status()).toBe(404); // the id exists only under this project's tenant
});
