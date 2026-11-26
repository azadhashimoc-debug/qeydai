import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buttonClass } from "./button";

const css = readFileSync(path.resolve(import.meta.dirname, "../../app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing block ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const light = block(":root");

function lum(hex: string) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("design tokens", () => {
  it("site is always light: no dark token overrides by OS preference or attribute", () => {
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
    expect(css).not.toContain('data-theme="dark"');
  });

  for (const [name, t] of [["light", light]] as const) {
    it(`${name}: body text, muted text, stamp, margin, pen and danger meet WCAG AA 4.5:1`, () => {
      for (const fg of ["ink", "muted", "stamp", "danger", "margin", "pen"]) {
        for (const bg of ["bg", "surface"]) {
          expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${name}: focus ring meets 3:1 non-text contrast on page, card and notebook cover`, () => {
      expect(contrast(t.focus, t.bg), "focus on bg").toBeGreaterThanOrEqual(3);
      expect(contrast(t.focus, t.surface), "focus on surface").toBeGreaterThanOrEqual(3);
      expect(contrast(t["focus-on-dark"], t.cover), "focus on cover").toBeGreaterThanOrEqual(3);
    });
  }

  it("white button text on brand blue meets 4.5:1", () => {
    expect(contrast("#ffffff", light.blue)).toBeGreaterThanOrEqual(4.5);
  });

  it("buttonClass composes variant, size and caller classes", () => {
    expect(buttonClass()).toContain("bg-brand");
    expect(buttonClass()).toContain("px-5 py-3 text-sm");
    expect(buttonClass({ variant: "secondary", size: "lg" })).toMatch(/border-line.*px-6 py-3\.5/);
    expect(buttonClass({ className: "mt-6 inline-block" }).endsWith("mt-6 inline-block")).toBe(true);
    expect(buttonClass()).toContain("disabled:opacity-60");
  });
});
