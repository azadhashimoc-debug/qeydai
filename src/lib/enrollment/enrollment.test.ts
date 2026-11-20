import { describe, expect, it } from "vitest";
import { EnrollmentService, InMemoryEnrollmentStore, normalizeAzPhone } from "./enrollment";

const T1 = "center_001";
const T2 = "center_002";

function setup(capacity = 2) {
  const store = new InMemoryEnrollmentStore();
  store.addSession({ id: "s1", tenantId: T1, courseId: "ielts", startsAt: "2099-12-01T10:00:00+04:00", capacity });
  store.addSession({ id: "x1", tenantId: T2, courseId: "ielts", startsAt: "2099-12-01T10:00:00+04:00", capacity: 5 });
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
    ["+994 55 123 45 67", "+994551234567"],
    ["0707654321", "+994707654321"],
    ["+994991234567", "+994991234567"],
  ])("normalizes %s", (input, out) => expect(normalizeAzPhone(input)).toBe(out));
  it.each(["", "abc", "12345", "+1555123456", "+99450123", "+994111234567", "+994301234567"])("rejects %s", (x) =>
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
  it("InMemory createSession inserts once and never overwrites", async () => {
    const store = new InMemoryEnrollmentStore();
    const s = { id: "n", tenantId: T1, courseId: "c", startsAt: "2099-01-01T10:00:00Z", capacity: 3 };
    expect(await store.createSession(s)).toBe("created");
    expect(await store.createSession({ ...s, capacity: 1 })).toBe("exists");
    expect((await store.getSession(T1, "n"))?.capacity).toBe(3);
    expect(await store.createSession({ ...s, tenantId: T2 })).toBe("created");
  });
  it("rejects registration for a session that already started", async () => {
    const store = new InMemoryEnrollmentStore();
    store.addSession({ id: "p", tenantId: T1, courseId: "c", startsAt: "2026-01-01T10:00:00+04:00", capacity: 5 });
    const svc = new EnrollmentService(store, () => new Date("2026-06-01T00:00:00Z"));
    expect(await svc.register(T1, { sessionId: "p", ...person(1) })).toEqual({ ok: false, reason: "session_started" });
    expect(await store.countBySession(T1, "p")).toBe(0);
  });
  it("lists only sessions with free seats when asked", async () => {
    const { svc } = setup(1);
    await svc.register(T1, { sessionId: "s1", ...person(1) });
    expect(await svc.listSessions(T1, { onlyAvailable: true })).toHaveLength(0);
  });
  it("batches session seat counts via countBySessions instead of N+1 countBySession", async () => {
    const { store, svc } = setup(3);
    store.addSession({ id: "s2", tenantId: T1, courseId: "math", startsAt: "2099-12-02T10:00:00+04:00", capacity: 4 });
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
    await svc.register(T1, { sessionId: "s1", ...person(1) });
    const available = await svc.listSessionsWithAvailability(T1);
    expect(singleCalls).toBe(0);
    expect(batchCalls).toBe(1);
    expect(available.map((x) => ({ id: x.session.id, seatsLeft: x.seatsLeft }))).toEqual([
      { id: "s1", seatsLeft: 2 },
      { id: "s2", seatsLeft: 4 },
    ]);
  });
});

describe("InMemoryEnrollmentStore CRM & Inbox (F4/F2)", () => {
  it("listEnrollments is tenant-scoped, optionally filtered by sessionId, ordered newest created_at DESC", async () => {
    const store = new InMemoryEnrollmentStore();
    store.addSession({ id: "s1", tenantId: T1, courseId: "ielts", startsAt: "2099-12-01T10:00:00Z", capacity: 5 });
    store.addSession({ id: "s2", tenantId: T1, courseId: "math", startsAt: "2099-12-02T10:00:00Z", capacity: 5 });
    store.addSession({ id: "s1", tenantId: T2, courseId: "ielts", startsAt: "2099-12-01T10:00:00Z", capacity: 5 });

    await store.insertIfAvailable({ id: "e1", tenantId: T1, sessionId: "s1", name: "A", phone: "+994501111111", createdAt: "2026-11-01T10:00:00Z" });
    await store.insertIfAvailable({ id: "e2", tenantId: T1, sessionId: "s2", name: "B", phone: "+994502222222", createdAt: "2026-11-03T10:00:00Z" });
    await store.insertIfAvailable({ id: "e3", tenantId: T1, sessionId: "s1", name: "C", phone: "+994503333333", createdAt: "2026-11-02T10:00:00Z" });
    await store.insertIfAvailable({ id: "e4", tenantId: T2, sessionId: "s1", name: "D", phone: "+994501111111", createdAt: "2026-11-04T10:00:00Z" });

    expect((await store.listEnrollments(T1)).map((e) => e.id)).toEqual(["e2", "e3", "e1"]);
    expect((await store.listEnrollments(T1, "s1")).map((e) => e.id)).toEqual(["e3", "e1"]);
    expect((await store.listEnrollments(T2)).map((e) => e.id)).toEqual(["e4"]);
  });

  it("listSessionsWithCounts returns all sessions (including past & full) ordered by startsAt ASC", async () => {
    const store = new InMemoryEnrollmentStore();
    store.addSession({ id: "late", tenantId: T1, courseId: "math", startsAt: "2099-12-05T10:00:00Z", capacity: 1 });
    store.addSession({ id: "past", tenantId: T1, courseId: "ielts", startsAt: "2020-01-01T10:00:00Z", capacity: 2 });
    store.addSession({ id: "other", tenantId: T2, courseId: "sat", startsAt: "2099-12-01T10:00:00Z", capacity: 5 });

    await store.insertIfAvailable({ id: "e1", tenantId: T1, sessionId: "late", name: "A", phone: "+994501111111", createdAt: "2026-11-01T10:00:00Z" });
    await store.insertIfAvailable({ id: "e2", tenantId: T1, sessionId: "past", name: "B", phone: "+994502222222", createdAt: "2026-11-01T10:00:00Z" });

    const summaries = await store.listSessionsWithCounts(T1);
    expect(summaries).toEqual([
      { session: { id: "past", tenantId: T1, courseId: "ielts", startsAt: "2020-01-01T10:00:00Z", capacity: 2 }, taken: 1, seatsLeft: 1 },
      { session: { id: "late", tenantId: T1, courseId: "math", startsAt: "2099-12-05T10:00:00Z", capacity: 1 }, taken: 1, seatsLeft: 0 },
    ]);
  });

  it("upsertLead, getLead, listLeads, and updateLead preserve stage, append notes, and isolate tenants", async () => {
    const store = new InMemoryEnrollmentStore();
    const l1 = await store.upsertLead({
      id: "l1",
      tenantId: T1,
      name: "Nigar",
      phone: "+994501234567",
      source: "instagram",
      nowIso: "2026-11-18T10:00:00Z",
    });
    expect(l1).toMatchObject({ id: "l1", stage: "new", note: "" });

    await store.updateLead(T1, "l1", { stage: "trial_booked", note: "Called", updatedAt: "2026-11-18T10:30:00Z" });

    // Duplicate inquiry without stage does not overwrite stage; appends note if provided
    const updated = await store.upsertLead({
      id: "l1-dup",
      tenantId: T1,
      name: "Nigar A.",
      phone: "+994501234567",
      source: "whatsapp",
      note: "Asked for Saturday",
      nowIso: "2026-11-18T11:00:00Z",
    });
    expect(updated).toEqual({
      id: "l1",
      tenantId: T1,
      name: "Nigar A.",
      phone: "+994501234567",
      source: "whatsapp",
      stage: "trial_booked",
      note: "Called\nAsked for Saturday",
      createdAt: "2026-11-18T10:00:00Z",
      updatedAt: "2026-11-18T11:00:00Z",
    });

    // Same phone in another tenant is a separate lead
    const l2 = await store.upsertLead({
      id: "l2",
      tenantId: T2,
      name: "Nigar T2",
      phone: "+994501234567",
      source: "telegram",
      nowIso: "2026-11-18T12:00:00Z",
    });
    expect(l2.id).toBe("l2");
    expect(await store.getLead(T2, "l1")).toBeNull();
    expect(await store.updateLead(T2, "l1", { stage: "paid", updatedAt: "2026-11-18T12:00:00Z" })).toBeNull();
    expect((await store.listLeads(T1)).map((l) => l.id)).toEqual(["l1"]);
  });

  it("addMessage enforces tenant ownership and listMessages orders chronologically", async () => {
    const store = new InMemoryEnrollmentStore();
    await store.upsertLead({ id: "l1", tenantId: T1, name: "Ali", phone: "+994501234567", source: "telegram", nowIso: "2026-11-18T10:00:00Z" });

    // Cross-tenant or unknown lead returns null
    expect(
      await store.addMessage({
        id: "m0",
        tenantId: T2,
        leadId: "l1",
        channel: "telegram",
        direction: "in",
        sender: "student",
        body: "hi",
        createdAt: "2026-11-18T10:01:00Z",
      }),
    ).toBeNull();

    await store.addMessage({
      id: "m2",
      tenantId: T1,
      leadId: "l1",
      channel: "telegram",
      direction: "out",
      sender: "ai",
      body: "Salam!",
      createdAt: "2026-11-18T10:02:00Z",
    });
    await store.addMessage({
      id: "m1",
      tenantId: T1,
      leadId: "l1",
      channel: "telegram",
      direction: "in",
      sender: "student",
      body: "Qiymət?",
      createdAt: "2026-11-18T10:01:00Z",
    });

    expect((await store.listMessages(T1, "l1")).map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(await store.listMessages(T2)).toEqual([]);
  });
});
