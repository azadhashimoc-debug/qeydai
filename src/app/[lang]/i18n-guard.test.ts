import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { errorCopy, errorCopyFor } from "./error-copy";

const SRC = path.resolve(import.meta.dirname, "../..");
// Files allowed to hold user-facing copy directly: the dictionaries, the error-boundary copy,
// the bilingual global 404 (no locale is known there) and tests.
const ALLOWED = [/dictionaries[\\/]/, /error-copy\.ts$/, /global-not-found\.tsx$/, /\.test\.tsx?$/, /components[\\/]panel[\\/]/, /components[\\/]marketing[\\/]/, /app[\\/]/, /lib[\\/]marketing[\\/](legal|pricing-jsonld)\.ts$/];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(e.name) ? [p] : [];
  });
}

describe("i18n guard", () => {
  it("no Azerbaijani copy is hardcoded in components or routes", () => {
    const offenders = walk(SRC)
      .filter((f) => !ALLOWED.some((r) => r.test(f)))
      .filter((f) => /[əğıöüçşƏĞİÖÜÇŞ]/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it("error boundary copy has the same keys in AZ and EN and is really translated", () => {
    expect(Object.keys(errorCopy.az).sort()).toEqual(Object.keys(errorCopy.en).sort());
    for (const k of Object.keys(errorCopy.az) as (keyof typeof errorCopy.az)[]) {
      expect(errorCopy.az[k].trim(), k).not.toBe("");
      expect(errorCopy.az[k], k).not.toBe(errorCopy.en[k]);
    }
    expect(Object.values(errorCopy.en).join(" ")).not.toMatch(/[əğıöüçş]/i);
  });

  it("error copy falls back to AZ for unknown or missing locales", () => {
    expect(errorCopyFor("en")).toBe(errorCopy.en);
    expect(errorCopyFor("az")).toBe(errorCopy.az);
    expect(errorCopyFor(undefined)).toBe(errorCopy.az);
    expect(errorCopyFor("toString")).toBe(errorCopy.az);
  });
});
