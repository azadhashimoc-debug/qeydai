# AI auto-replies (Groq + NVIDIA)

Inbound Telegram/WhatsApp/Instagram messages are stored first; then, after the webhook has responded (`after()`), `src/lib/ai/auto-reply.ts` may queue an AI reply into the normal outbox (`sender='ai'`).

## Providers
`src/lib/ai/llm.ts` calls OpenAI-compatible chat endpoints and falls back in order (default Groq → NVIDIA):

| Env | Meaning |
|---|---|
| `GROQ_API_KEY`, `NVIDIA_API_KEY` | Keys. A provider without a key is skipped. Set them as host secrets, never in the repo. |
| `QEYDAI_AI_PROVIDER_ORDER` | e.g. `nvidia,groq` |
| `QEYDAI_AI_GROQ_MODEL`, `QEYDAI_AI_NVIDIA_MODEL` | Override defaults (`llama-3.3-70b-versatile`, `nvidia/nemotron-3.5-lightning-30b-a3b`; the NVIDIA default was verified live (the earlier `meta/llama-3.3-70b-instruct` returns HTTP 410, retired), the Groq default is still unverified). Verify model names against each provider's current catalog before launch. |
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

## Guards beyond the prompt (verified live against NVIDIA)
A live 8-question Azerbaijani evaluation (`scripts/ai-eval.mts`) showed the model inventing a price for a service missing from the business information. Prompts alone are not trusted, so two deterministic guards run in code:
- **Grounding check** (`isGrounded`): every number in a reply must appear in the business information or in the customer's messages, otherwise the reply is dropped and a handoff task is opened.
- **Sensitive input** (`looksSensitive`): messages that look like card numbers or credentials are never sent to a model provider; a handoff task is opened instead. Such a message stays in the recent history window, so replies in that conversation hand off until it scrolls out.
Result after the guards: 7/8 on the evaluation (the remaining case was the card-number message, which the sensitive-input guard now handles).
Limits: the evaluation is small and covers one tenant; wording quality (for example a closing-time question answered with the opening time) is not caught by these guards.
