import { expect, test } from "@playwright/test";
import { SqliteEnrollmentStore } from "../../src/lib/enrollment/sqlite-store";
import { E2E_DB, E2E_KEYS } from "../../playwright.config";

// Each Playwright project gets its own tenant (derived from its API key), so desktop and mobile never collide.
const FUTURE = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

test.beforeAll(({}, info) => {
  const tenant = `e2e-${info.project.name}`;
  const store = new SqliteEnrollmentStore(E2E_DB);
  store.addSession({ id: "s-small", tenantId: tenant, courseId: "ielts", startsAt: FUTURE, capacity: 2 });
  store.addSession({ id: "s-race", tenantId: tenant, courseId: "math", startsAt: FUTURE, capacity: 3 });
  store.addSession({ id: `s-only-${info.project.name}`, tenantId: tenant, courseId: "art", startsAt: FUTURE, capacity: 5 });
  store.close();
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
  const res = await request.get("/api/v1/sessions", { headers: auth(info.project.name) });
  expect(res.status()).toBe(200);
  const ids = (await res.json()).sessions.map((s: { id: string }) => s.id).sort();
  expect(ids).toEqual(["s-only-" + info.project.name, "s-race", "s-small"].sort());
});

test("enroll: success, duplicate, full, unknown, invalid over real HTTP", async ({ request }, info) => {
  const h = auth(info.project.name);
  const enroll = (data: unknown) => request.post("/api/v1/enroll", { headers: h, data });

  const ok = await enroll({ sessionId: "s-small", name: "Aygün", phone: "050 123 45 67" });
  expect(ok.status()).toBe(201);
  expect(JSON.stringify(await ok.json())).not.toContain("Aygün");

  expect((await enroll({ sessionId: "s-small", name: "Aygün", phone: "+994501234567" })).status()).toBe(409);
  expect((await enroll({ sessionId: "s-small", name: "Ali", phone: "055 111 22 33" })).status()).toBe(201);
  const full = await enroll({ sessionId: "s-small", name: "Vəli", phone: "070 111 22 33" });
  expect(full.status()).toBe(409);
  expect((await full.json()).error).toBe("full");
  expect((await enroll({ sessionId: "nope", name: "X", phone: "050 123 45 67" })).status()).toBe(404);
  expect((await enroll({ sessionId: "s-small", name: "", phone: "1" })).status()).toBe(422);

  const list = await (await request.get("/api/v1/sessions", { headers: h })).json();
  expect(list.sessions.map((s: { id: string }) => s.id)).not.toContain("s-small");
});

test("10 parallel enrollments for 3 seats: exactly 3 succeed", async ({ request }, info) => {
  const h = auth(info.project.name);
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      request.post("/api/v1/enroll", {
        headers: h,
        data: { sessionId: "s-race", name: `P${i}`, phone: `+99450${String(3000000 + i)}` },
      }),
    ),
  );
  const codes = results.map((r) => r.status());
  expect(codes.filter((c) => c === 201)).toHaveLength(3);
  expect(codes.filter((c) => c === 409)).toHaveLength(7);
});

test("another tenant's key cannot enroll into this tenant's session", async ({ request }, info) => {
  const other = info.project.name === "desktop" ? "mobile" : "desktop";
  const res = await request.post("/api/v1/enroll", {
    headers: auth(other),
    data: { sessionId: `s-only-${info.project.name}`, name: "Ali", phone: "050 999 88 77" },
  });
  expect(res.status()).toBe(404); // the id exists only under this project's tenant
});
