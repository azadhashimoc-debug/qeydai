import { describe, expect, it } from "vitest";
import { assignExperimentVariant, formatExperimentToken, getActiveExperimentToken } from "./ab";

function mockStorage(initial: Record<string, string> = {}, fail = false) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      if (fail) throw new Error("storage blocked");
      return map.get(key) ?? null;
    },
    setItem(key: string, val: string) {
      if (fail) throw new Error("storage blocked");
      map.set(key, val);
    },
  };
}

describe("A/B experiment assignment", () => {
  it("supports valid ?ab_hero_cta_v1 override and ignores unknown variants", () => {
    const store = mockStorage();
    expect(assignExperimentVariant("hero_cta_v1", { search: "?ab_hero_cta_v1=benefit", storage: store })).toBe("benefit");
    expect(store.getItem("qeydai_ab_hero_cta_v1")).toBe("benefit");

    const store2 = mockStorage();
    expect(
      assignExperimentVariant("hero_cta_v1", {
        search: "?ab_hero_cta_v1=evil_xss",
        storage: store2,
        random: () => 0.1,
      }),
    ).toBe("control");
  });

  it("keeps sticky assignment in storage across calls and degrades safely if storage throws", () => {
    const store = mockStorage();
    const first = assignExperimentVariant("hero_cta_v1", { storage: store, random: () => 0.8 });
    expect(first).toBe("benefit");
    const second = assignExperimentVariant("hero_cta_v1", { storage: store, random: () => 0.1 });
    expect(second).toBe("benefit");

    const broken = mockStorage({}, true);
    expect(assignExperimentVariant("hero_cta_v1", { storage: broken, random: () => 0.2 })).toBe("control");
    expect(assignExperimentVariant("hero_cta_v1", { storage: broken, random: () => 0.9 })).toBe("benefit");
  });

  it("formats experiment token matching analytics token grammar", () => {
    expect(formatExperimentToken("hero_cta_v1", "control")).toBe("hero_cta_v1:control");
    expect(getActiveExperimentToken({ search: "?ab_hero_cta_v1=benefit", storage: mockStorage() })).toBe(
      "hero_cta_v1:benefit",
    );
  });
});
