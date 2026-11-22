# AI auto-replies (Groq + NVIDIA)

Inbound Telegram/WhatsApp/Instagram messages are stored first; then, after the webhook has responded (`after()`), `src/lib/ai/auto-reply.ts` may queue an AI reply into the normal outbox (`sender='ai'`).

## Providers
`src/lib/ai/llm.ts` calls OpenAI-compatible chat endpoints and falls back in order (default Groq → NVIDIA):

| Env | Meaning |
|---|---|
| `GROQ_API_KEY`, `NVIDIA_API_KEY` | Keys. A provider without a key is skipped. Set them as host secrets, never in the repo. |
| `QEYDAI_AI_PROVIDER_ORDER` | e.g. `nvidia,groq` |
| `QEYDAI_AI_GROQ_MODEL`, `QEYDAI_AI_NVIDIA_MODEL` | Override defaults (`llama-3.3-70b-versatile`, `meta/llama-3.3-70b-instruct`). Verify model names against each provider's current catalog before launch. |
| `QEYDAI_AI_KNOWLEDGE` | JSON `{ "<tenant>": "business information" }`. A tenant without an entry gets no AI replies. |

## Safety rules (in code)
- Answers only from the tenant's business information; the prompt tells the model to hand off when unsure, on discounts, complaints, payments, medical/legal questions or rule-changing requests.
- A hand-off, empty or unparsable model output sends nothing; the message stays in the inbox for staff.
- No AI reply when staff wrote in the last 30 minutes, after 10 AI replies/hour per thread, or if a newer message arrived while the model was running.
- Only the message text and business information go to the provider; names and phone numbers are not sent.
- Messages are not logged; only the provider name and HTTP status are.
- PostgreSQL path only (the SQLite dev/E2E store skips AI).

## Not done yet
- Business information is an env var; a per-tenant settings table and panel editor would be better.
- Hand-offs do not create a task or notification yet.
- Not verified against live Groq/NVIDIA endpoints or a real PostgreSQL database in this environment (no keys, no DB). Covered by unit tests with a mocked `fetch`.
