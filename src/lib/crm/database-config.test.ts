import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseConfigured, workspaceTransaction } from "./store";

type EnvKey = "NEXT_PHASE" | "QEYDAI_DATABASE_URL" | "QEYDAI_E2E_SQLITE" | "VERCEL" | "NODE_ENV";
function setEnv(key: EnvKey, value?: string) {
  vi.stubEnv(key, value);
}

describe("CRM persistent database availability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed without PostgreSQL in production", () => {
    setEnv("NEXT_PHASE");
    setEnv("QEYDAI_DATABASE_URL");
    setEnv("QEYDAI_E2E_SQLITE");
    setEnv("VERCEL");
    setEnv("NODE_ENV", "production");
    expect(databaseConfigured()).toBe(false);
    setEnv("QEYDAI_DATABASE_URL", "postgresql://configured");
    expect(databaseConfigured()).toBe(true);
  });

  it("allows SQLite only for explicit local development or local Playwright", () => {
    setEnv("NEXT_PHASE");
    setEnv("QEYDAI_DATABASE_URL");
    setEnv("VERCEL");
    setEnv("NODE_ENV", "development");
    expect(databaseConfigured()).toBe(true);
    setEnv("NODE_ENV", "production");
    expect(databaseConfigured()).toBe(false);
    setEnv("QEYDAI_E2E_SQLITE", "1");
    expect(databaseConfigured()).toBe(true);
    setEnv("VERCEL", "1");
    expect(databaseConfigured()).toBe(false);
  });

  it("refuses direct worker transactions without PostgreSQL on Vercel", async () => {
    setEnv("NEXT_PHASE");
    setEnv("QEYDAI_DATABASE_URL");
    setEnv("QEYDAI_E2E_SQLITE", "1");
    setEnv("VERCEL", "1");
    setEnv("NODE_ENV", "production");
    await expect(workspaceTransaction("tenant", async () => 1)).rejects.toThrow(
      "database_unavailable",
    );
  });

  it("never initializes a CRM database while Next.js builds", () => {
    setEnv("NEXT_PHASE", "phase-production-build");
    setEnv("QEYDAI_DATABASE_URL", "postgresql://configured");
    expect(databaseConfigured()).toBe(false);
  });
});
