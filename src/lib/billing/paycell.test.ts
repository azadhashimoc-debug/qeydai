import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPaycellCheckoutPayload, parsePaycellEvent, PAYCELL_PRICES_AZN, verifyPaycellSignature } from "./paycell";

const good = { eventId: "evt_1", tenant: "t1", plan: "growth", period: "annual", status: "paid", amount: 852, currency: "AZN" };
const sign = (raw: string, secret: string) => createHmac("sha256", secret).update(raw).digest("hex");

describe("verifyPaycellSignature", () => {
  const raw = JSON.stringify(good);
  it("accepts a valid signature, with or without prefix", () => {
    expect(verifyPaycellSignature(Buffer.from(raw), sign(raw, "s"), "s")).toBe(true);
    expect(verifyPaycellSignature(Buffer.from(raw), `sha256=${sign(raw, "s")}`, "s")).toBe(true);
  });
  it("rejects wrong secret, tampered body, empty secret and junk", () => {
    expect(verifyPaycellSignature(Buffer.from(raw), sign(raw, "s"), "other")).toBe(false);
    expect(verifyPaycellSignature(Buffer.from(raw + " "), sign(raw, "s"), "s")).toBe(false);
    expect(verifyPaycellSignature(Buffer.from(raw), sign(raw, ""), "")).toBe(false);
    expect(verifyPaycellSignature(Buffer.from(raw), "zz", "s")).toBe(false);
  });
});

describe("parsePaycellEvent", () => {
  it("parses a valid event", () => expect(parsePaycellEvent(good)?.plan).toBe("growth"));
  it("rejects invalid shapes", () => {
    for (const bad of [null, [], {}, { ...good, plan: "gold" }, { ...good, amount: -1 }, { ...good, currency: "USD" }, { ...good, eventId: "a b" }, { ...good, status: "x" }]) {
      expect(parsePaycellEvent(bad)).toBeNull();
    }
  });
});

describe("createPaycellCheckoutPayload", () => {
  it("computes plan price and signs canonical payload", () => {
    const out = createPaycellCheckoutPayload({
      tenant: "ws_abc",
      plan: "growth",
      period: "annual",
      secret: "paycell-secret",
      checkoutUrl: "https://paycell.example/checkout",
      orderId: "ord_fixed",
    });
    expect(out.amount).toBe(PAYCELL_PRICES_AZN.growth.annual);
    expect(out.currency).toBe("AZN");
    expect(out.checkoutUrl).toBe("https://paycell.example/checkout");
    const expected = createHmac("sha256", "paycell-secret")
      .update("ord_fixed|ws_abc|growth|annual|852|AZN", "utf8")
      .digest("hex");
    expect(out.signature).toBe(expected);
  });
});
