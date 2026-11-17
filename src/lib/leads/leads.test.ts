import { describe, expect, it } from "vitest";
import { validateLead } from "./leads";

describe("validateLead", () => {
  it("accepts valid lead and normalizes phone", () => {
    expect(validateLead({ name: " Aygün ", phone: "050 123 45 67" })).toEqual({
      ok: true, lead: { name: "Aygün", phone: "+994501234567" },
    });
  });
  it.each([
    [{ name: "", phone: "050 123 45 67" }],
    [{ name: "A", phone: "bad" }],
    [{ name: "x".repeat(101), phone: "050 123 45 67" }],
    [null], ["str"], [{}],
  ])("rejects %j", (input) => expect(validateLead(input)).toEqual({ ok: false }));
  it("ignores extra fields", () => {
    const r = validateLead({ name: "Ali", phone: "501234567", admin: true });
    expect(r).toEqual({ ok: true, lead: { name: "Ali", phone: "+994501234567" } });
  });
});
