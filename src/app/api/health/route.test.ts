import { afterEach, describe, expect, it, vi } from "vitest";
import * as instance from "@/lib/api/instance";
import * as store from "@/lib/crm/store";
import { GET } from "./route";

describe("GET /api/health", () => {
  const prevForceSqlite = process.env.QEYDAI_FORCE_SQLITE;
  const prevDbFile = process.env.ENROLL_DB_FILE;
  const prevDbUrl = process.env.QEYDAI_DATABASE_URL;

  afterEach(() => {
    vi.restoreAllMocks();
    if (prevForceSqlite === undefined) delete process.env.QEYDAI_FORCE_SQLITE;
    else process.env.QEYDAI_FORCE_SQLITE = prevForceSqlite;
    if (prevDbFile === undefined) delete process.env.ENROLL_DB_FILE;
    else process.env.ENROLL_DB_FILE = prevDbFile;
    if (prevDbUrl === undefined) delete process.env.QEYDAI_DATABASE_URL;
    else process.env.QEYDAI_DATABASE_URL = prevDbUrl;
  });

  it("returns 200 ok with no-store header when sqlite storage is active", async () => {
    process.env.QEYDAI_FORCE_SQLITE = "1";
    process.env.ENROLL_DB_FILE = ":memory:";

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, status: "ok", storage: "sqlite" });
  });

  it("returns 503 degraded when sqlite store initialization fails", async () => {
    process.env.QEYDAI_FORCE_SQLITE = "1";
    vi.spyOn(instance, "getStore").mockReturnValueOnce(null);

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, status: "degraded", storage: "sqlite" });
  });

  it("returns 200 ok when postgres is configured and ping succeeds", async () => {
    delete process.env.QEYDAI_FORCE_SQLITE;
    process.env.QEYDAI_DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    vi.spyOn(store, "pingPostgres").mockResolvedValueOnce(true);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "ok", storage: "postgres" });
  });

  it("returns 503 degraded when postgres ping returns false or throws", async () => {
    delete process.env.QEYDAI_FORCE_SQLITE;
    process.env.QEYDAI_DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    vi.spyOn(store, "pingPostgres").mockResolvedValueOnce(false);
    expect((await GET()).status).toBe(503);

    vi.spyOn(store, "pingPostgres").mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, status: "degraded", storage: "postgres" });
  });
});
