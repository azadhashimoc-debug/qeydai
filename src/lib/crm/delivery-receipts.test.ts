import { describe, expect, it } from "vitest";
import { parseWhatsAppReceipts } from "./delivery-receipts";

const payload = (status: unknown = "delivered", account = "123456") => ({ entry: [{ changes: [{
  field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: account },
    statuses: [{ id: "wamid.real", recipient_id: "994505551234", timestamp: "1795870000", status }] },
}] }] });

describe("WhatsApp receipt parsing", () => {
  it("extracts provider delivery evidence with its account and recipient", () => {
    expect(parseWhatsAppReceipts(payload())).toEqual([{
      account: "123456", id: "wamid.real", recipient: "994505551234", status: "delivered", timestamp: 1795870000,
    }]);
  });
  it("ignores inbound-only, malformed and unrelated events", () => {
    expect(parseWhatsAppReceipts({})).toEqual([]);
    expect(parseWhatsAppReceipts(payload("invented"))).toEqual([]);
    expect(parseWhatsAppReceipts(payload("delivered", "bad-id"))).toEqual([]);
    expect(parseWhatsAppReceipts(null)).toEqual([]);
  });
});
