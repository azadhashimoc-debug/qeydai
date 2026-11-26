import { describe, expect, it } from "vitest";
import { validateProductionEnv } from "./check-env";

describe("validateProductionEnv", () => {
  it("passes with valid production settings", () => {
    const report = validateProductionEnv({
      NEXT_PUBLIC_SITE_URL: "https://panelim.az",
      QEYDAI_DATABASE_URL: "postgresql://panelim:strongpass@db.internal:5432/panelim?sslmode=require",
      QEYDAI_PANEL_SECRET: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      TRUST_PROXY: "x-forwarded-for",
      NEXT_PUBLIC_GTM_ID: "GTM-ABC1234",
    });
    expect(report.ok).toBe(true);
    expect(report.items.every((i) => i.severity === "ok")).toBe(true);
  });

  it("fails when required variables are missing or placeholders", () => {
    const report = validateProductionEnv({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      QEYDAI_DATABASE_URL: "",
      QEYDAI_PANEL_SECRET: "REPLACE_WITH_GENERATED_SECRET",
      TRUST_PROXY: "invalid-header",
      QEYDAI_ADMIN_KEYS: "not-json",
    });
    expect(report.ok).toBe(false);
    const failedKeys = report.items.filter((i) => i.severity === "fail").map((i) => i.key);
    expect(failedKeys).toEqual(
      expect.arrayContaining([
        "QEYDAI_DATABASE_URL",
        "QEYDAI_PANEL_SECRET",
        "TRUST_PROXY",
        "QEYDAI_ADMIN_KEYS",
      ])
    );
  });
});
