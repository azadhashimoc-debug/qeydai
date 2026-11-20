import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { EnrollmentService } from "./enrollment";
import { SqliteEnrollmentStore } from "./sqlite-store";

const FUTURE = "2099-12-01T10:00:00+04:00";
const dbFile = () => path.join(mkdtempSync(path.join(tmpdir(), "qeydai-db-")), "t.sqlite");
const seed = (s: SqliteEnrollmentStore, tenantId = "t1", id = "s1", capacity = 2) =>
  s.addSession({ id, tenantId, courseId: "ielts", startsAt: FUTURE, capacity });

describe("SqliteEnrollmentStore", () => {
  it("behaves like the service contract: register, full, duplicate", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    seed(store);
    const svc = new EnrollmentService(store);
    const p = (n: number) => ({ sessionId: "s1", name: `P${n}`, phone: `+99450123456${n}` });
    expect((await svc.register("t1", p(1))).ok).toBe(true);
    expect(await svc.register("t1", { ...p(1), name: "Same phone" })).toEqual({ ok: false, reason: "duplicate" });
    expect((await svc.register("t1", p(2))).ok).toBe(true);
    expect(await svc.register("t1", p(3))).toEqual({ ok: false, reason: "full" });
    expect(await store.countBySession("t1", "s1")).toBe(2);
  });

  it("createSession inserts once, never overwrites, and is tenant-scoped", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    const s = { id: "s1", tenantId: "t1", courseId: "ielts", startsAt: FUTURE, capacity: 4 };
    expect(await store.createSession(s)).toBe("created");
    expect(await store.createSession({ ...s, capacity: 1 })).toBe("exists");
    expect((await store.getSession("t1", "s1"))?.capacity).toBe(4);
    expect(await store.createSession({ ...s, tenantId: "t2" })).toBe("created");
  });

  it("isolates tenants, including ids containing ':'", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    seed(store, "a:b", "c");
    const svc = new EnrollmentService(store);
    const person = { name: "Ali", phone: "050 123 45 67" };
    expect(await svc.register("a", { sessionId: "b:c", ...person })).toEqual({ ok: false, reason: "unknown_session" });
    expect(await svc.listSessions("a")).toHaveLength(0);
    expect((await svc.register("a:b", { sessionId: "c", ...person })).ok).toBe(true);
  });

  it("persists across connections", async () => {
    const f = dbFile();
    const a = new SqliteEnrollmentStore(f);
    seed(a);
    await new EnrollmentService(a).register("t1", { sessionId: "s1", name: "Ali", phone: "050 123 45 67" });
    a.close();
    const b = new SqliteEnrollmentStore(f);
    expect(await b.countBySession("t1", "s1")).toBe(1);
    b.close();
  });

  it("DB-level UNIQUE blocks duplicates even if the service check is bypassed", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    seed(store);
    const e = { id: "1", tenantId: "t1", sessionId: "s1", name: "A", phone: "+994501234567", createdAt: "x" };
    expect(await store.insertIfAvailable(e)).toBe("inserted");
    expect(await store.insertIfAvailable({ ...e, id: "2" })).toBe("duplicate");
  });

  it("separate OS processes cannot exceed capacity (real concurrency)", async () => {
    const f = dbFile();
    const setup = new SqliteEnrollmentStore(f);
    seed(setup, "t1", "s1", 10);
    setup.close();

    const worker = path.join(import.meta.dirname, "worker.mts");
    const run = (id: number) =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, [worker, f, String(id), "25"], { stdio: ["ignore", "pipe", "inherit"] });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`worker ${id} exit ${code}`))));
      });
    const results = await Promise.all([1, 2, 3, 4].map(run)); // 4 processes x 25 attempts = 100 for 10 seats

    const check = new SqliteEnrollmentStore(f);
    expect(await check.countBySession("t1", "s1")).toBe(10);
    check.close();
    const inserted = results.map((r) => Number(r.split(" ")[0])).reduce((a, b) => a + b, 0);
    expect(inserted).toBe(10);
  }, 60_000);

  it("migrates an existing v1 SQLite database cleanly with crm_leads, inbox_messages, and indexes", async () => {
    const f = dbFile();
    const legacy = new DatabaseSync(f);
    legacy.exec(`
      CREATE TABLE sessions (tenant_id TEXT NOT NULL, id TEXT NOT NULL, course_id TEXT NOT NULL, starts_at TEXT NOT NULL, capacity INTEGER NOT NULL CHECK (capacity >= 0), PRIMARY KEY (tenant_id, id));
      CREATE TABLE enrollments (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, session_id TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (tenant_id, session_id, phone), FOREIGN KEY (tenant_id, session_id) REFERENCES sessions (tenant_id, id));
      INSERT INTO sessions VALUES ('t1', 's1', 'ielts', '2026-01-01T10:00:00Z', 5);
      INSERT INTO enrollments VALUES ('e1', 't1', 's1', 'Ali', '+994501234567', '2026-01-01T09:00:00Z');
    `);
    legacy.close();

    const store = new SqliteEnrollmentStore(f);
    expect((await store.listEnrollments("t1")).map((e) => e.id)).toEqual(["e1"]);
    const lead = await store.upsertLead({
      id: "l1",
      tenantId: "t1",
      name: "Ali",
      phone: "+994501234567",
      source: "web",
      nowIso: "2026-11-18T10:00:00Z",
    });
    expect(lead.stage).toBe("new");
    store.close();
  });

  it("listEnrollments & listSessionsWithCounts are tenant-scoped and ordered properly", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    store.addSession({ id: "s2", tenantId: "t1", courseId: "math", startsAt: "2099-12-05T10:00:00Z", capacity: 1 });
    store.addSession({ id: "s1", tenantId: "t1", courseId: "ielts", startsAt: "2020-01-01T10:00:00Z", capacity: 3 });
    store.addSession({ id: "x1", tenantId: "t2", courseId: "ielts", startsAt: "2099-12-01T10:00:00Z", capacity: 5 });

    await store.insertIfAvailable({ id: "e1", tenantId: "t1", sessionId: "s1", name: "A", phone: "+994501111111", createdAt: "2026-11-01T10:00:00Z" });
    await store.insertIfAvailable({ id: "e2", tenantId: "t1", sessionId: "s2", name: "B", phone: "+994502222222", createdAt: "2026-11-03T10:00:00Z" });
    await store.insertIfAvailable({ id: "e3", tenantId: "t1", sessionId: "s1", name: "C", phone: "+994503333333", createdAt: "2026-11-02T10:00:00Z" });
    await store.insertIfAvailable({ id: "e4", tenantId: "t2", sessionId: "x1", name: "D", phone: "+994501111111", createdAt: "2026-11-04T10:00:00Z" });

    expect((await store.listEnrollments("t1")).map((e) => e.id)).toEqual(["e2", "e3", "e1"]);
    expect((await store.listEnrollments("t1", "s1")).map((e) => e.id)).toEqual(["e3", "e1"]);
    expect((await store.listEnrollments("t2")).map((e) => e.id)).toEqual(["e4"]);

    expect(await store.listSessionsWithCounts("t1")).toEqual([
      { session: { id: "s1", tenantId: "t1", courseId: "ielts", startsAt: "2020-01-01T10:00:00Z", capacity: 3 }, taken: 2, seatsLeft: 1 },
      { session: { id: "s2", tenantId: "t1", courseId: "math", startsAt: "2099-12-05T10:00:00Z", capacity: 1 }, taken: 1, seatsLeft: 0 },
    ]);
  });

  it("CRM leads: upsertLead preserves stage & appends notes; updateLead/getLead/listLeads isolate tenants", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    const l1 = await store.upsertLead({
      id: "l1",
      tenantId: "t1",
      name: "Leyla",
      phone: "+994501234567",
      source: "whatsapp",
      nowIso: "2026-11-18T10:00:00Z",
    });
    expect(l1).toEqual({
      id: "l1",
      tenantId: "t1",
      name: "Leyla",
      phone: "+994501234567",
      source: "whatsapp",
      stage: "new",
      note: "",
      createdAt: "2026-11-18T10:00:00Z",
      updatedAt: "2026-11-18T10:00:00Z",
    });

    const moved = await store.updateLead("t1", "l1", { stage: "contacted", note: "Called", updatedAt: "2026-11-18T10:15:00Z" });
    expect(moved?.stage).toBe("contacted");

    // Duplicate inquiry without stage keeps 'contacted' and appends note
    const again = await store.upsertLead({
      id: "l1-new-id",
      tenantId: "t1",
      name: "Leyla M.",
      phone: "+994501234567",
      source: "telegram",
      note: "Asked price",
      nowIso: "2026-11-18T10:30:00Z",
    });
    expect(again).toEqual({
      id: "l1",
      tenantId: "t1",
      name: "Leyla M.",
      phone: "+994501234567",
      source: "telegram",
      stage: "contacted",
      note: "Called\nAsked price",
      createdAt: "2026-11-18T10:00:00Z",
      updatedAt: "2026-11-18T10:30:00Z",
    });

    // Explicit stage on upsertLead overrides stage
    const booked = await store.upsertLead({
      id: "l1-x",
      tenantId: "t1",
      name: "Leyla M.",
      phone: "+994501234567",
      source: "manual",
      stage: "trial_booked",
      nowIso: "2026-11-18T11:00:00Z",
    });
    expect(booked.stage).toBe("trial_booked");
    expect(booked.note).toBe("Called\nAsked price");

    // Tenant 2 isolation
    await store.upsertLead({
      id: "l2",
      tenantId: "t2",
      name: "Leyla T2",
      phone: "+994501234567",
      source: "web",
      nowIso: "2026-11-18T12:00:00Z",
    });
    expect(await store.getLead("t2", "l1")).toBeNull();
    expect(await store.updateLead("t2", "l1", { stage: "paid", updatedAt: "2026-11-18T12:00:00Z" })).toBeNull();
    expect((await store.listLeads("t1")).map((l) => l.id)).toEqual(["l1"]);
    expect((await store.listLeads("t2")).map((l) => l.id)).toEqual(["l2"]);
  });

  it("inbox_messages enforces composite FK across tenants and orders messages ASC", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    await store.upsertLead({ id: "l1", tenantId: "t1", name: "Ali", phone: "+994501234567", source: "instagram", nowIso: "2026-11-18T10:00:00Z" });
    await store.upsertLead({ id: "l2", tenantId: "t2", name: "Veli", phone: "+994501234567", source: "whatsapp", nowIso: "2026-11-18T10:00:00Z" });

    // Cross-tenant leadId rejected (returns null, nothing inserted)
    expect(
      await store.addMessage({
        id: "m-bad",
        tenantId: "t2",
        leadId: "l1",
        channel: "instagram",
        direction: "in",
        sender: "student",
        body: "cross-tenant",
        createdAt: "2026-11-18T10:01:00Z",
      }),
    ).toBeNull();

    await store.addMessage({
      id: "m2",
      tenantId: "t1",
      leadId: "l1",
      channel: "instagram",
      direction: "out",
      sender: "staff",
      body: "Buyurun",
      createdAt: "2026-11-18T10:02:00Z",
    });
    await store.addMessage({
      id: "m1",
      tenantId: "t1",
      leadId: "l1",
      channel: "instagram",
      direction: "in",
      sender: "student",
      body: "Salam",
      createdAt: "2026-11-18T10:01:00Z",
    });
    await store.addMessage({
      id: "m3",
      tenantId: "t2",
      leadId: "l2",
      channel: "whatsapp",
      direction: "in",
      sender: "student",
      body: "Hello T2",
      createdAt: "2026-11-18T10:01:30Z",
    });

    expect((await store.listMessages("t1", "l1")).map((m) => m.id)).toEqual(["m1", "m2"]);
    expect((await store.listMessages("t1")).map((m) => m.id)).toEqual(["m1", "m2"]);
    expect((await store.listMessages("t2")).map((m) => m.id)).toEqual(["m3"]);
  });

  it("sales_* CRM parity: workspace, contacts, atomic deal claim, tasks, notes, custom fields, and phone matching", async () => {
    const store = new SqliteEnrollmentStore(":memory:");
    store.initializeSalesWorkspace("t1");
    store.initializeSalesWorkspace("t2");

    const stages = await store.listSalesStages("t1");
    expect(stages.map((s) => s.id)).toEqual(["new", "contacted", "trial_booked", "paid", "lost"]);

    // Members
    await store.createSalesMember("t1", "op1", "Op One", "operator");
    await store.createSalesMember("t1", "op2", "Op Two", "operator");
    expect((await store.listSalesMembers("t1")).map((m) => m.id)).toEqual(["op1", "op2"]);
    expect(await store.listSalesMembers("t2")).toEqual([]);

    // Contact + tenant isolation
    const contact = await store.createSalesContact("t1", "Aysel", "+994501234567");
    expect(contact?.phone).toBe("+994501234567");
    expect(contact?.phoneVerified).toBe(false);
    expect(await store.listSalesContacts("t2")).toEqual([]);

    // Create deal + atomic claim race
    const deal = await store.createSalesDeal("t1", "deal_1", contact!.id, "new", "IELTS Prep", "whatsapp", 20000, "");
    expect(deal?.assigneeId).toBeNull();

    expect(await store.claimSalesDeal("t1", "deal_1", "op1")).toBe("ok");
    const claimed = await store.getSalesDeal("t1", "deal_1");
    expect(claimed?.assigneeId).toBe("op1");

    expect(await store.claimSalesDeal("t1", "deal_1", "op2")).toBe("already-claimed");
    expect(await store.claimSalesDeal("t2", "deal_1", "op1")).toBe("no-member");
    await store.createSalesMember("t2", "op1", "T2 Op", "operator");
    expect(await store.claimSalesDeal("t2", "deal_1", "op1")).toBe("not-found");

    // Tasks, notes, custom fields, timeline
    const task = await store.createSalesTask("t1", "deal_1", "Call parent", "Check schedule", "op1", null);
    expect(task?.status).toBe("open");
    await store.updateSalesTask("t1", task!.id, { status: "done" });

    const note = await store.createSalesNote("t1", "deal_1", "Interested in weekend group", "op1");
    expect(note?.body).toBe("Interested in weekend group");

    const fDef = await store.createSalesFieldDef("t1", "Target Score", "number", false);
    expect(fDef).not.toBeNull();
    await store.setSalesDealFieldValues("t1", "deal_1", [{ fieldId: fDef!.id, value: "7.5" }]);
    expect(await store.getSalesDealFieldValues("t1", "deal_1")).toEqual([{ fieldId: fDef!.id, value: "7.5" }]);

    const timeline = await store.listSalesTimeline("t1", "deal_1");
    expect(timeline.some((e) => e.kind === "activity" && "activityKind" in e && e.activityKind === "task_created")).toBe(true);
    expect(timeline.some((e) => e.kind === "activity" && "activityKind" in e && e.activityKind === "task_done")).toBe(true);
    expect(timeline.some((e) => e.kind === "activity" && "activityKind" in e && e.activityKind === "note_added")).toBe(true);

    // Stage delete in-use & system stage guards
    expect(await store.deleteSalesStage("t1", "new")).toBe(false);
    expect(await store.deleteSalesStage("t1", "paid")).toBe(false);

    // Inbound message + phone match + 24h reply window enforcement
    const accepted = store.ingestSalesMessage(
      "t1",
      {
        channel: "whatsapp",
        account: "main",
        event: "wa_msg_1",
        sender: "wa_user_1",
        name: "Orxan",
        text: "Salam, menim nomrem 055 987 65 43",
      },
      "+994559876543",
    );
    expect(accepted).toBe(true);

    const deals = await store.listSalesDeals("t1");
    const waDeal = deals.find((d) => d.source === "whatsapp" && d.contactName === "Orxan");
    expect(waDeal).toBeDefined();
    expect(waDeal?.assigneeId).toBeNull();

    const matches = await store.listSalesPhoneMatches("t1");
    expect(matches.length).toBe(1);
    expect(await store.confirmSalesPhoneMatch("t1", matches[0].id)).toBe(true);
    expect(await store.listSalesPhoneMatches("t1")).toEqual([]);
    const matchedContact = (await store.listSalesContacts("t1")).find((c) => c.id === waDeal!.contactId);
    expect(matchedContact?.phoneVerified).toBe(true);

    // Fresh inbound message unlocks 24h window
    const okReply = await store.sendSalesDealReply("t1", waDeal!.id, "Buyurun, yardim edek!");
    expect(okReply.ok).toBe(true);
    if (okReply.ok) {
      expect(okReply.message.direction).toBe("out");
      expect(okReply.message.sender).toBe("staff");
      expect(okReply.message.status).toBe("queued");
    }

    // Expired 24h WhatsApp window fails closed
    const internalDb = (store as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db;
    internalDb
      .prepare("UPDATE sales_threads SET last_inbound_at = ? WHERE tenant_id = ? AND deal_id = ?")
      .run(new Date(Date.now() - 25 * 3600 * 1000).toISOString(), "t1", waDeal!.id);
    const expiredReply = await store.sendSalesDealReply("t1", waDeal!.id, "Salam!");
    expect(expiredReply).toEqual({ ok: false, error: "reply_window_expired" });
  });
});
