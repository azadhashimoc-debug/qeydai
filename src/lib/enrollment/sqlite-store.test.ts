import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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
});
