# panelim.az — CRM intake core contract

This is a **staff-authenticated CRM write endpoint**, not a Pani AI reply engine.
It does not send messages to WhatsApp, Telegram or Instagram.

## POST /api/panel/intake

Requires the existing `qeydai_panel` session cookie, a same-origin request,
`Content-Type: application/json`, and a caller-generated `Idempotency-Key`
header (8–128 characters, ASCII letters/numbers/`_`/`-`).

Example payload (AZ salon example):

```json
{
  "name": "Aysel",
  "phone": "050 123 45 67",
  "title": "Saç kəsimi",
  "message": "Sabah boş vaxt var?",
  "source": "manual",
  "dueAt": "2026-12-01T12:00:00+04:00"
}
```

`phone` is optional and normalized to +994 if supplied. `source` may be
`manual` or `web`. `dueAt` is optional but, when supplied, MUST include a
timezone/UTC offset and be in the next 365 days. Without a `dueAt`, the follow-up
task is due **24 hours after intake**. Scheduling the task does **not** schedule
an email, notification, or automatic message.

- `201`: contact, deal and follow-up task created atomically (`replayed: false`).
- `200`: same key + same validated business payload, original objects returned (`replayed: true`).
- `409 idempotency_conflict`: key reused with different validated payload.
- `409 intake_replay_unavailable`: original task/contact no longer available; request must be reviewed.
- `401/403`: session or permission/origin rejected.
- `415`: not application/json.
- `422`: missing/invalid key or invalid input.
- `503 database_unavailable`: durable PostgreSQL is not configured for production.

The **client must generate one fresh idempotency key per user action** and reuse
exactly that key for network retries. Do not generate a new key for retrying the
same request; that deliberately creates a separate deal.

Idempotency is backed by a deterministic tenant-scoped deal identifier plus a
SHA-256 digest stored in the deal's `fields.panelimIntake` metadata. PostgreSQL
advisory transaction locks serialize same-key requests; the unique
`(tenant_id, phone)` constraint plus UPSERT serializes same-phone contacts.
The SQLite fallback serializes transactional savepoints. Conflicts must never
result in a partially committed deal or task.

## Production gate

For the intake endpoint, use a durable PostgreSQL database and apply the
existing SQL migrations `0001`, `0002`, `0003` before enabling traffic.
All CRM writes set `app.tenant_id` in the transaction; PostgreSQL row-level
security must be enabled. SQLite is a local-development fallback, not production
persistence. `QEYDAI_E2E_SQLITE=1` exists **only** for local Playwright tests and
is rejected on Vercel.

**Known limitation:** the existing legacy panel login/session implementation
still depends on the SQLite-backed enrollment store in other routes. The intake
endpoint's PostgreSQL transaction and persistence do not, by themselves,
complete production-grade authentication or a SaaS registration system. Verify
the deployed authentication/session infrastructure separately before shipping.

## Verification

GitHub Actions runs `npm run typecheck`, `npm run lint`, `npm test`,
prepares a temporary PostgreSQL 16 service using the real migrations,
runs `npm run test:pg` with a **non-superuser app role**, then runs
`npm run build` and desktop/mobile `npm run e2e`.

SQLite tests inject deal/task failures and verify savepoint rollback.
PostgreSQL tests verify real FK rollback, concurrent phone upserts, idempotency,
role checks and forced RLS isolation. A Vercel deployment alone is never
evidence that these checks passed.
