import { describe, expect, it, vi } from "vitest";
import { tenantKnowledge } from "./auto-reply";
import { chatComplete, configuredProviders } from "./llm";
import { buildMessages, parseModelReply } from "./prompt";

const ok = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });

describe("configuredProviders", () => {
  it("returns only providers with keys, Groq first by default", () => {
    expect(configuredProviders({}).length).toBe(0);
    expect(configuredProviders({ NVIDIA_API_KEY: "n" }).map((p) => p.name)).toEqual(["nvidia"]);
    expect(configuredProviders({ GROQ_API_KEY: "g", NVIDIA_API_KEY: "n" }).map((p) => p.name)).toEqual(["groq", "nvidia"]);
  });
  it("honors order and model overrides", () => {
    const list = configuredProviders({
      GROQ_API_KEY: "g", NVIDIA_API_KEY: "n",
      QEYDAI_AI_PROVIDER_ORDER: "nvidia,groq", QEYDAI_AI_NVIDIA_MODEL: "custom/model",
    });
    expect(list.map((p) => p.name)).toEqual(["nvidia", "groq"]);
    expect(list[0].model).toBe("custom/model");
  });
});

describe("chatComplete", () => {
  const env = { GROQ_API_KEY: "g", NVIDIA_API_KEY: "n" };
  it("uses the first provider when it works", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("salam"));
    const result = await chatComplete([{ role: "user", content: "hi" }], { env, fetchImpl });
    expect(result).toEqual({ text: "salam", provider: "groq" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain("api.groq.com");
  });
  it("falls back to NVIDIA on error or empty output", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(ok("ehtiyat"));
    const result = await chatComplete([{ role: "user", content: "hi" }], { env, fetchImpl });
    expect(result).toEqual({ text: "ehtiyat", provider: "nvidia" });
    expect(fetchImpl.mock.calls[1][0]).toContain("integrate.api.nvidia.com");
  });
  it("returns null when everything fails or nothing is configured", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("network"));
    expect(await chatComplete([], { env, fetchImpl: failing })).toBeNull();
    expect(await chatComplete([], { env: {}, fetchImpl: failing })).toBeNull();
  });
  it("sends the key only in the Authorization header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("x"));
    await chatComplete([{ role: "user", content: "hi" }], { env, fetchImpl });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer g");
    expect(String(init.body)).not.toContain("Bearer");
  });
});

describe("parseModelReply", () => {
  it("accepts a normal reply, even inside code fences", () => {
    expect(parseModelReply('```json\n{"reply":"Bəli, var.","handoff":false}\n```')).toEqual({ reply: "Bəli, var.", handoff: false });
  });
  it("turns handoff, empty or unparseable output into no reply", () => {
    expect(parseModelReply('{"reply":"x","handoff":true}').handoff).toBe(true);
    expect(parseModelReply('{"reply":"","handoff":false}').handoff).toBe(true);
    expect(parseModelReply("plain text").handoff).toBe(true);
    expect(parseModelReply("{broken").handoff).toBe(true);
  });
  it("caps reply length", () => {
    const long = "a".repeat(5000);
    expect(parseModelReply(JSON.stringify({ reply: long, handoff: false })).reply.length).toBe(1000);
  });
});

describe("buildMessages", () => {
  it("puts knowledge in the system prompt and maps history roles", () => {
    const messages = buildMessages("Salon", "Manikür 20 AZN", [
      { direction: "in", body: "Qiymət?" },
      { direction: "out", body: "20 AZN" },
      { direction: "in", body: "Ok" },
    ]);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Manikür 20 AZN");
    expect(messages.slice(1).map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("tenantKnowledge", () => {
  it("reads per-tenant knowledge and ignores bad config", () => {
    expect(tenantKnowledge("t1", { QEYDAI_AI_KNOWLEDGE: '{"t1":" info "}' })).toBe("info");
    expect(tenantKnowledge("t2", { QEYDAI_AI_KNOWLEDGE: '{"t1":"info"}' })).toBeNull();
    expect(tenantKnowledge("t1", { QEYDAI_AI_KNOWLEDGE: "not json" })).toBeNull();
    expect(tenantKnowledge("t1", {})).toBeNull();
  });
});

describe("NVIDIA reasoning control", () => {
  const bodyOf = (fetchImpl: ReturnType<typeof vi.fn>) => JSON.parse(fetchImpl.mock.calls[0][1].body as string) as Record<string, unknown>;

  it("disables thinking for Nemotron models only", async () => {
    const nemotron = vi.fn().mockResolvedValue(ok("x"));
    await chatComplete([{ role: "user", content: "hi" }], { env: { NVIDIA_API_KEY: "n" }, fetchImpl: nemotron });
    expect(bodyOf(nemotron).chat_template_kwargs).toEqual({ enable_thinking: false });

    const other = vi.fn().mockResolvedValue(ok("x"));
    await chatComplete([{ role: "user", content: "hi" }], {
      env: { NVIDIA_API_KEY: "n", QEYDAI_AI_NVIDIA_MODEL: "google/gemma-4-31b-it" },
      fetchImpl: other,
    });
    expect(bodyOf(other).chat_template_kwargs).toBeUndefined();

    const groq = vi.fn().mockResolvedValue(ok("x"));
    await chatComplete([{ role: "user", content: "hi" }], { env: { GROQ_API_KEY: "g" }, fetchImpl: groq });
    expect(bodyOf(groq).chat_template_kwargs).toBeUndefined();
  });
});

import { isGrounded } from "./prompt";

describe("isGrounded", () => {
  const knowledge = "Haircut 20 AZN. Open 10:00-19:00.";
  it("accepts numbers present in the information or the customer message", () => {
    expect(isGrounded("Haircut is 20 AZN.", knowledge, [])).toBe(true);
    expect(isGrounded("We open at 10:00.", knowledge, [])).toBe(true);
    expect(isGrounded("Booked for 15:30.", knowledge, [{ direction: "in", body: "Book me at 15:30" }])).toBe(true);
    expect(isGrounded("Hello, how can I help?", knowledge, [])).toBe(true);
  });
  it("rejects invented numbers", () => {
    expect(isGrounded("Pedicure is 25 AZN.", knowledge, [])).toBe(false);
    expect(isGrounded("We close at 21:00.", knowledge, [])).toBe(false);
    expect(isGrounded("Haircut is 25 AZN.", knowledge, [{ direction: "out", body: "25" }])).toBe(false);
  });
});

import { looksSensitive } from "./prompt";

describe("looksSensitive", () => {
  it("flags card numbers and credentials, not ordinary messages", () => {
    expect(looksSensitive("my card 4169 7388 1234 5678")).toBe(true);
    expect(looksSensitive("4169-7388-1234-5678")).toBe(true);
    expect(looksSensitive("cvv 123")).toBe(true);
    expect(looksSensitive("PIN is 1234")).toBe(true);
    expect(looksSensitive("Haircut at 15:30 for 20 AZN, phone 050 123 45 67")).toBe(false);
  });
});
