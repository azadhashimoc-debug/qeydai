import { describe, expect, it } from "vitest";
import { EnrollmentService, InMemoryEnrollmentStore, normalizeAzPhone } from "./enrollment";

const T1 = "center_001";
const T2 = "center_002";

function setup(capacity = 2) {
  const store = new InMemoryEnrollmentStore();
  store.addSession({ id: "s1", tenantId: T1, courseId: "ielts", startsAt: "2026-12-01T10:00:00+04:00", capacity });
  store.addSession({ id: "x1", tenantId: T2, courseId: "ielts", startsAt: "2026-12-01T10:00:00+04:00", capacity: 5 });
  return { store, svc: new EnrollmentService(store) };
}
const person = (n: number) => ({ name: `Test ${n}`, phone: `+99450123456${n}` });

describe("normalizeAzPhone", () => {
  it.each([
    ["+994501234567", "+994501234567"],
    ["050 123 45 67", "+994501234567"],
    ["994501234567", "+994501234567"],
    ["(050) 123-45-67", "+994501234567"],
    ["501234567", "+994501234567"],
  ])("normalizes %s", (input, out) => expect(normalizeAzPhone(input)).toBe(out));
  it.each(["", "abc", "12345", "+1555123456", "+99450123"])("rejects %s", (x) =>
    expect(normalizeAzPhone(x)).toBeNull(),
  );
});

describe("EnrollmentService", () => {
  it("registers a valid enrollment", async () => {
    const { svc } = setup();
    const r = await svc.register(T1, { sessionId: "s1", ...person(1) });
    expect(r.ok).toBe(true);
  });
  it("rejects unknown session", async () => {
    const { svc } = setup();
    expect(await svc.register(T1, { sessionId: "nope", ...person(1) })).toEqual({ ok: false, reason: "unknown_session" });
  });
  it("rejects invalid name or phone", async () => {
    const { svc } = setup();
    expect(await svc.register(T1, { sessionId: "s1", name: "", phone: "+994501234567" })).toEqual({ ok: false, reason: "invalid_input" });
    expect(await svc.register(T1, { sessionId: "s1", name: "Ali", phone: "123" })).toEqual({ ok: false, reason: "invalid_input" });
  });
  it("rejects when full", async () => {
    const { svc } = setup(1);
    await svc.register(T1, { sessionId: "s1", ...person(1) });
    expect(await svc.register(T1, { sessionId: "s1", ...person(2) })).toEqual({ ok: false, reason: "full" });
  });
  it("rejects duplicate (same phone format variants)", async () => {
    const { svc } = setup();
    await svc.register(T1, { sessionId: "s1", name: "Ali", phone: "+994501234567" });
    expect(await svc.register(T1, { sessionId: "s1", name: "Ali", phone: "050 123 45 67" })).toEqual({ ok: false, reason: "duplicate" });
  });
  it("only one of two concurrent registrations gets the last seat", async () => {
    const { svc } = setup(1);
    const [a, b] = await Promise.all([
      svc.register(T1, { sessionId: "s1", ...person(1) }),
      svc.register(T1, { sessionId: "s1", ...person(2) }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const loser = a.ok ? b : a;
    expect(loser).toEqual({ ok: false, reason: "full" });
  });
  it("50 concurrent registrations never exceed capacity", async () => {
    const { svc, store } = setup(10);
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        svc.register(T1, { sessionId: "s1", name: `P${i}`, phone: `+99450${String(1000000 + i)}` }),
      ),
    );
    expect(await store.countBySession(T1, "s1")).toBe(10);
  });
  it("does not leak sessions across tenants", async () => {
    const { svc } = setup();
    expect(await svc.register(T1, { sessionId: "x1", ...person(1) })).toEqual({ ok: false, reason: "unknown_session" });
    expect(await svc.listSessions(T1)).toHaveLength(1);
    expect((await svc.listSessions(T2))[0].id).toBe("x1");
  });
  it("same phone may enroll in different tenants", async () => {
    const { svc } = setup();
    const a = await svc.register(T1, { sessionId: "s1", name: "Ali", phone: "+994501234567" });
    const b = await svc.register(T2, { sessionId: "x1", name: "Ali", phone: "+994501234567" });
    expect(a.ok && b.ok).toBe(true);
  });
  it("lists only sessions with free seats when asked", async () => {
    const { svc } = setup(1);
    await svc.register(T1, { sessionId: "s1", ...person(1) });
    expect(await svc.listSessions(T1, { onlyAvailable: true })).toHaveLength(0);
  });
});
