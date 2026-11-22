// Chat completion with provider fallback. Groq and NVIDIA NIM both expose
// OpenAI-compatible /chat/completions endpoints.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type Provider = { name: "groq" | "nvidia"; url: string; key: string; model: string };

type Env = Record<string, string | undefined>;

const DEFAULTS = {
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  nvidia: { url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "meta/llama-3.3-70b-instruct" },
} as const;

/** Providers that have an API key, in preferred order (QEYDAI_AI_PROVIDER_ORDER, default "groq,nvidia"). */
export function configuredProviders(env: Env = process.env): Provider[] {
  const order = (env.QEYDAI_AI_PROVIDER_ORDER ?? "groq,nvidia").split(",").map((item) => item.trim().toLowerCase());
  const providers: Provider[] = [];
  for (const name of order) {
    if (name === "groq" && env.GROQ_API_KEY) {
      providers.push({ name, url: DEFAULTS.groq.url, key: env.GROQ_API_KEY, model: env.QEYDAI_AI_GROQ_MODEL || DEFAULTS.groq.model });
    } else if (name === "nvidia" && env.NVIDIA_API_KEY) {
      providers.push({ name, url: DEFAULTS.nvidia.url, key: env.NVIDIA_API_KEY, model: env.QEYDAI_AI_NVIDIA_MODEL || DEFAULTS.nvidia.model });
    }
  }
  return providers;
}

export type ChatResult = { text: string; provider: Provider["name"] };

/**
 * Tries each configured provider until one returns text. Returns null when none is configured or all fail.
 * Never logs keys or message content.
 */
export async function chatComplete(
  messages: ChatMessage[],
  options: { env?: Env; fetchImpl?: typeof fetch; timeoutMs?: number; maxTokens?: number } = {},
): Promise<ChatResult | null> {
  const doFetch = options.fetchImpl ?? fetch;
  for (const provider of configuredProviders(options.env)) {
    try {
      const response = await doFetch(provider.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.2,
          max_tokens: options.maxTokens ?? 400,
          stream: false,
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
      });
      if (!response.ok) {
        console.warn(`ai: ${provider.name} responded ${response.status}`);
        continue;
      }
      const data: unknown = await response.json();
      const text = extractText(data);
      if (text) return { text, provider: provider.name };
      console.warn(`ai: ${provider.name} returned no text`);
    } catch {
      console.warn(`ai: ${provider.name} request failed`);
    }
  }
  return null;
}

function extractText(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message;
  return typeof message?.content === "string" ? message.content.trim() : "";
}
