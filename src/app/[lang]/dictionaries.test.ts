import { describe, expect, it } from "vitest";
import az from "./dictionaries/az.json";
import en from "./dictionaries/en.json";

function flat(o: unknown, p = ""): Record<string, string> {
  if (typeof o === "string") return { [p]: o };
  return Object.entries(o as object).reduce((a, [k, v]) => ({ ...a, ...flat(v, p ? `${p}.${k}` : k) }), {});
}
const A = flat(az), E = flat(en);
// Sample messages written by the customer stay in Azerbaijani on both pages on purpose.
const CUSTOMER_MESSAGES = ["features.sample.u", "board.chat.u2"];

describe("dictionaries", () => {
  it("AZ and EN have identical keys", () => expect(Object.keys(A).sort()).toEqual(Object.keys(E).sort()));
  it("no empty or placeholder values", () => {
    for (const [k, v] of [...Object.entries(A), ...Object.entries(E)]) {
      expect(v.trim(), k).not.toBe("");
      expect(v, k).not.toMatch(/lorem|todo|tbd|xxx|\.\.\.\.|<.*>/i);
    }
  });
  it("AZ copy is not just the English copy", () => {
    const same = Object.keys(A).filter((k) => A[k] === E[k] && !/^(brand|meta\.brand)/.test(k) && A[k].length > 12 && !CUSTOMER_MESSAGES.includes(k));
    expect(same).toEqual([]);
  });
  it("AZ uses Azerbaijani letters", () => expect(Object.values(A).join(" ")).toMatch(/[əğıöüçş]/i));
});
