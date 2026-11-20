import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseInbound, verifyMetaSignature } from "./channels";

describe("CRM channel ingress", () => {
  it("authenticates the exact Meta webhook body", () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyMetaSignature(body, signature, "secret")).toBe(true);
    expect(verifyMetaSignature(Buffer.concat([body, Buffer.from(" ")]), signature, "secret")).toBe(false);
    expect(verifyMetaSignature(body, signature, "")).toBe(false);
  });

  it("keeps separate account and sender identifiers for every channel", () => {
    expect(parseInbound("telegram", {
      update_id: 42, message: { chat: { id: 12, type: "private" }, from: { id: 12, first_name: "Aysel" }, text: "Salam" },
    }, "bot")).toMatchObject([{ account: "bot", event: "42", sender: "12", name: "Aysel", text: "Salam" }]);
    expect(parseInbound("whatsapp", { entry: [{ changes: [{ value: {
      metadata: { phone_number_id: "phone" }, messages: [{ id: "wamid", from: "994501234567", text: { body: "Salam" } }],
    } }] }] })).toMatchObject([{ account: "phone", event: "wamid", sender: "994501234567", text: "Salam" }]);
    expect(parseInbound("instagram", { entry: [{ id: "ig", messaging: [
      { sender: { id: "echo" }, message: { mid: "echo", text: "Salam", is_echo: true } },
      { sender: { id: "customer" }, message: { mid: "mid", text: "Salam" } },
    ] }] })).toMatchObject([{ account: "ig", event: "mid", sender: "customer", text: "Salam" }]);
  });
});
