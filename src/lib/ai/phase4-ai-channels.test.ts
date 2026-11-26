import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildPaniSystemPrompt, matchesHandoffKeyword, simulatePaniReply } from "@/lib/ai/auto-reply";
import {
  DEFAULT_GROQ_MODEL,
  generateGroqReply,
  getDefaultGroqModel,
  isGroqConfigured,
} from "@/lib/ai/groq";
import { registerTelegramWebhook } from "@/lib/crm/connections-store";
import { getMetaGraphVersion } from "@/lib/crm/delivery";
import { decryptSecret, encryptSecret, hasChannelEncryptionKey } from "@/lib/crypto/secrets";

describe("Phase 4: AES-256-GCM channel secret encryption", () => {
  const env = { QEYDAI_CHANNELS_ENCRYPTION_KEY: "super-secret-channel-encryption-key-2026" };

  it("encrypts and decrypts secrets and rejects tampered ciphertexts", () => {
    expect(hasChannelEncryptionKey({})).toBe(false);
    expect(hasChannelEncryptionKey(env)).toBe(true);

    const enc1 = encryptSecret("123456:telegram-bot-token", env);
    const enc2 = encryptSecret("123456:telegram-bot-token", env);
    expect(enc1.startsWith("v1:")).toBe(true);
    expect(enc1).not.toBe(enc2); // fresh random IV each time
    expect(decryptSecret(enc1, env)).toBe("123456:telegram-bot-token");
    expect(decryptSecret(enc1, { QEYDAI_CHANNELS_ENCRYPTION_KEY: "wrong-key-of-sufficient-length-000" })).toBeNull();
    expect(decryptSecret(`${enc1}tampered`, env)).toBeNull();
  });

  it("fails closed when encryption key is missing", () => {
    expect(() => encryptSecret("secret", {})).toThrow("channel_encryption_key_missing");
  });
});

describe("Phase 4: Groq LLM client & Pani AI", () => {
  it("skips cleanly when GROQ_API_KEY is unset and resolves default model", async () => {
    expect(isGroqConfigured({})).toBe(false);
    expect(getDefaultGroqModel({})).toBe(DEFAULT_GROQ_MODEL);
    expect(getDefaultGroqModel({ GROQ_MODEL: "llama-3.1-8b-instant" })).toBe("llama-3.1-8b-instant");

    const skipped = await generateGroqReply({
      messages: [{ role: "user", content: "Salam" }],
      env: {},
    });
    expect(skipped).toEqual({ ok: false, skipped: true, reason: "ai_not_configured" });
  });

  it("parses Groq chat completion response and token usage", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: "llama-3.3-70b-versatile",
          choices: [{ message: { content: "Salam! Sizə necə kömək edə bilərəm?" } }],
          usage: { prompt_tokens: 42, completion_tokens: 18 },
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const res = await generateGroqReply({
      messages: [{ role: "user", content: "Salam" }],
      env: { GROQ_API_KEY: "gsk_test_key" },
      fetchImpl: fetchMock,
    });
    expect(res).toEqual({
      ok: true,
      reply: "Salam! Sizə necə kömək edə bilərəm?",
      model: "llama-3.3-70b-versatile",
      tokensIn: 42,
      tokensOut: 18,
    });
  });

  it("detects handoff keywords before calling Groq during simulation", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    expect(matchesHandoffKeyword("Məni menecerlə calaşdırın", ["operator", "menecer"])).toBe("menecer");
    expect(matchesHandoffKeyword("Qiymət nə qədərdir?", ["operator", "menecer"])).toBeNull();

    const sim = await simulatePaniReply({
      businessName: "Test Studio",
      locale: "az",
      settings: {
        model: DEFAULT_GROQ_MODEL,
        tone: "friendly",
        businessContext: "Konsultasiya 30 AZN",
        systemPrompt: "",
        handoffKeywords: ["operator", "menecer"],
      },
      sampleMessage: "Zəhmət olmasa operator ilə əlaqə yaradın",
      fetchImpl: fetchMock,
    });
    expect(sim).toEqual({
      ok: true,
      reply: "",
      model: DEFAULT_GROQ_MODEL,
      handoffTriggered: true,
      matchedKeyword: "operator",
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const sysPrompt = buildPaniSystemPrompt({
      businessName: "Test Studio",
      locale: "az",
      settings: {
        tone: "concise",
        businessContext: "Open 09:00-18:00",
        systemPrompt: "Ask for phone number.",
      },
    });
    expect(sysPrompt).toContain("Test Studio");
    expect(sysPrompt).toContain("Open 09:00-18:00");
    expect(sysPrompt).toContain("Ask for phone number.");
  });
});

describe("Phase 4: self-serve channels & cron outbox delivery", () => {
  it("defaults Meta Graph API version to v22.0", () => {
    expect(getMetaGraphVersion({})).toBe("v22.0");
    expect(getMetaGraphVersion({ QEYDAI_META_GRAPH_VERSION: "v21.0" })).toBe("v21.0");
    expect(getMetaGraphVersion({ QEYDAI_META_GRAPH_VERSION: "invalid" })).toBe("v22.0");
  });

  it("registers Telegram webhook with secret_token", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }),
    ) as unknown as typeof fetch;

    const res = await registerTelegramWebhook({
      token: "123456:abc",
      webhookUrl: "https://panelim.az/api/channels/telegram?account=123456",
      secretToken: "sec_xyz",
      fetchImpl: fetchMock,
    });
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.telegram.org/bot123456:abc/setWebhook");
    expect(JSON.parse(String(init.body))).toEqual({
      url: "https://panelim.az/api/channels/telegram?account=123456",
      secret_token: "sec_xyz",
      allowed_updates: ["message"],
    });
  });

  it("configures Vercel Cron for /api/channels/deliver in vercel.json", () => {
    const raw = readFileSync(path.join(process.cwd(), "vercel.json"), "utf8");
    const parsed = JSON.parse(raw) as { crons?: Array<{ path: string; schedule: string }> };
    expect(parsed.crons?.some((c) => c.path === "/api/channels/deliver")).toBe(true);
  });
});
