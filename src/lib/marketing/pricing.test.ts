import { describe, expect, it } from "vitest";
import { PAYCELL_PRICES_AZN } from "@/lib/billing/paycell";
import { BILLING_PERIODS, PLAN_IDS, PLAN_MONTHLY_AZN, planSavingPercent, planTermTotalAzn } from "./pricing";

describe("public pricing", () => {
  it("keeps the published monthly prices", () => {
    expect(PLAN_MONTHLY_AZN.starter.monthly).toBe(49);
    expect(PLAN_MONTHLY_AZN.growth.monthly).toBe(89);
    expect(PLAN_MONTHLY_AZN.pro.monthly).toBe(149);
  });

  it("charges Paycell exactly the per-month price times the term", () => {
    for (const plan of PLAN_IDS) {
      for (const period of BILLING_PERIODS) {
        expect(PAYCELL_PRICES_AZN[plan][period]).toBe(planTermTotalAzn(plan, period));
      }
    }
  });

  it("never makes a prepaid term dearer than monthly", () => {
    for (const plan of PLAN_IDS) {
      expect(planSavingPercent(plan, "halfYear")).toBeGreaterThan(0);
      expect(planSavingPercent(plan, "annual")).toBeGreaterThanOrEqual(planSavingPercent(plan, "halfYear"));
    }
  });
});
