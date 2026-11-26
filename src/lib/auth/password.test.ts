import { describe, expect, it } from "vitest";
import { checkPasswordPolicy, hashPassword, normalizeEmail, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same-password-1")).not.toBe(await hashPassword("same-password-1"));
  });

  it("rejects malformed stored values", async () => {
    for (const bad of ["", "x", "scrypt$1$2", "bcrypt$16384$8$1$AA==$AA==", "scrypt$0$8$1$AA==$AA==", "scrypt$99999999999$8$1$AA==$AA=="]) {
      expect(await verifyPassword("whatever-password", bad)).toBe(false);
    }
  });
});

describe("password policy", () => {
  it("enforces length and variety", () => {
    expect(checkPasswordPolicy("short")).toEqual({ ok: false, reason: "too_short" });
    expect(checkPasswordPolicy("a".repeat(129))).toEqual({ ok: false, reason: "too_long" });
    expect(checkPasswordPolicy("aaaaaaaaaaaa")).toEqual({ ok: false, reason: "weak" });
    expect(checkPasswordPolicy(12345)).toEqual({ ok: false, reason: "too_short" });
    expect(checkPasswordPolicy("Sifre-2026-ok")).toEqual({ ok: true });
  });
});

describe("normalizeEmail", () => {
  it("lowercases and validates", () => {
    expect(normalizeEmail("  Ali@Example.COM ")).toBe("ali@example.com");
    for (const bad of ["", "a@b", "a b@c.com", "@x.com", 5, null, `${"a".repeat(70)}@x.com`]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});
