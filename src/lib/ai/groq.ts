export type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqReplyResult =
  | {
      ok: true;
      reply: string;
      model: string;
      tokensIn: number;
      tokensOut: number;
    }
  | {
      ok: false;
      skipped?: boolean;
      reason: string;
    };

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export function isGroqConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean((env.GROQ_API_KEY ?? "").trim());
}

export function getDefaultGroqModel(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = (env.GROQ_MODEL ?? "").trim();
  return configured && /^[A-Za-z0-9._/-]{2,100}$/.test(configured)
    ? configured
    : DEFAULT_GROQ_MODEL;
}

/**
 * Calls Groq's OpenAI-compatible Chat Completions REST API without extra npm dependencies.
 * Gracefully returns { ok: false, skipped: true } when GROQ_API_KEY is not set.
 */
export async function generateGroqReply(input: {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<GroqReplyResult> {
  const env = input.env ?? process.env;
  const apiKey = (env.GROQ_API_KEY ?? "").trim();
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "ai_not_configured" };
  }

  const model = (input.model ?? "").trim() || getDefaultGroqModel(env);
  const fetchFn = input.fetchImpl ?? fetch;

  try {
    const res = await fetchFn(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.35,
        max_tokens: input.maxTokens ?? 450,
      }),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });

    if (!res.ok) {
      return { ok: false, reason: `groq_http_${res.status}` };
    }

    const data = (await res.json().catch(() => null)) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    } | null;

    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      return { ok: false, reason: "empty_ai_reply" };
    }

    return {
      ok: true,
      reply: reply.slice(0, 3500),
      model: data?.model || model,
      tokensIn: Math.max(0, Number(data?.usage?.prompt_tokens ?? 0)),
      tokensOut: Math.max(0, Number(data?.usage?.completion_tokens ?? 0)),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.name : "network_error" };
  }
}
