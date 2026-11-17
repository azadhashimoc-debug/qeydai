import { describe, expect, it } from "vitest";
import { EnrollmentService, InMemoryEnrollmentStore, normalizeAzPhone } from "./enrollment";

const NOW = new Date("2026-06-01T08:00:00Z"); // 12:00 in Baku
const person = { name: "Ali", phone: "050 123 45 67" };

function make(startsAt: string, tenantId = "t1", id = "s1") {
  const store = new InMemoryEnrollmentStore();
  store.addSession({ id, tenantId, courseId: "c", startsAt, capacity: 5 });
  return { store, svc: new EnrollmentService(store, () => NOW) };
}

describe("review fixes: session time handling", () => {
  it("rejects a session with an unparsable startsAt (fails closed)", async () => {
    const { svc, store } = make("not-a-date");
    const r = await svc.register("t1", { sessionId: "s1", ...person });
    expect(r.ok).toBe(false);
    expect(await store.countBySession("t1", "s1")).toBe(0);
  });
  it("rejects a startsAt without an explicit offset (timezone-ambiguous)", async () => {
    const { svc } = make("2026-06-01T15:00:00");
    expect((await svc.register("t1", { sessionId: "s1", ...person })).ok).toBe(false);
  });
  it("accepts Z and +04:00 offsets and compares instants correctly", async () => {
    // 11:00 Baku = 07:00Z, already started at 08:00Z. 17:00 Baku = 13:00Z, still ahead.
    expect(await make("2026-06-01T11:00:00+04:00").svc.register("t1", { sessionId: "s1", ...person })).toEqual({
      ok: false,
      reason: "session_started",
    });
    expect((await make("2026-06-01T17:00:00+04:00").svc.register("t1", { sessionId: "s1", ...person })).ok).toBe(true);
    expect((await make("2026-06-01T13:00:01Z").svc.register("t1", { sessionId: "s1", ...person })).ok).toBe(true);
  });
  it("listSessions(onlyAvailable) hides started and invalid sessions", async () => {
    const store = new InMemoryEnrollmentStore();
    store.addSession({ id: "past", tenantId: "t1", courseId: "c", startsAt: "2026-06-01T07:00:00Z", capacity: 5 });
    store.addSession({ id: "bad", tenantId: "t1", courseId: "c", startsAt: "garbage", capacity: 5 });
    store.addSession({ id: "ok", tenantId: "t1", courseId: "c", startsAt: "2026-06-02T07:00:00Z", capacity: 5 });
    const svc = new EnrollmentService(store, () => NOW);
    expect((await svc.listSessions("t1", { onlyAvailable: true })).map((s) => s.id)).toEqual(["ok"]);
  });
  it("createdAt uses the injected clock", async () => {
    const { svc } = make("2026-06-02T07:00:00Z");
    const r = await svc.register("t1", { sessionId: "s1", ...person });
    expect(r.ok && r.enrollment.createdAt).toBe(NOW.toISOString());
  });
});

describe("review fixes: tenant key collisions", () => {
  it("tenant 'a:b' + session 'c' is isolated from tenant 'a' + session 'b:c'", async () => {
    const store = new InMemoryEnrollmentStore();
    store.addSession({ id: "c", tenantId: "a:b", courseId: "x", startsAt: "2026-06-02T07:00:00Z", capacity: 1 });
    const svc = new EnrollmentService(store, () => NOW);
    expect(await svc.register("a", { sessionId: "b:c", ...person })).toEqual({ ok: false, reason: "unknown_session" });
    expect((await svc.register("a:b", { sessionId: "c", ...person })).ok).toBe(true);
  });
});

describe("review fixes: input validation", () => {
  it("register rejects control characters and non-string names without throwing", async () => {
    const { svc } = make("2026-06-02T07:00:00Z");
    const bad = String.fromCharCode(10);
    expect(await svc.register("t1", { sessionId: "s1", name: "Ali" + bad + "x", phone: person.phone })).toEqual({ ok: false, reason: "invalid_input" });
    const untyped = { sessionId: "s1", name: 123, phone: person.phone } as unknown as Parameters<typeof svc.register>[1];
    expect(await svc.register("t1", untyped)).toEqual({ ok: false, reason: "invalid_input" });
  });
  it.each([
    ["994123456", "+994994123456"], // local 99 412 3456 written without leading 0
    ["00994501234567", "+994501234567"],
    ["+994 50 123 45 67", "+994501234567"],
  ])("normalizes %s", (input, out) => expect(normalizeAzPhone(input)).toBe(out));
});
