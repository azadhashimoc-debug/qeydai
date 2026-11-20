# QeydAI enrollment API (for n8n)

Base URL (local): `http://localhost:3000`. All calls need `Authorization: Bearer <key>`.
The tenant (learning center) is derived from the key, never from the request, so one center can never read or write another's data.

Setup:
1. Generate a key: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
2. Put it in `.env` as `QEYDAI_API_KEYS={"<key>":"center_001"}` (keys shorter than 24 chars are ignored; no key means every call is rejected).
3. Demo sessions (demo data only): `npm run seed:demo -- data/qeydai.sqlite center_001 5`
4. Start: `npm run build && npm run start`

## GET /api/v1/sessions
Upcoming sessions that still have free seats.
```
200 {"ok":true,"sessions":[{"id":"demo-ielts-sat-1100","courseId":"ielts","startsAt":"2026-11-21T07:00:00.000Z","seatsLeft":5}]}
```

## POST /api/v1/enroll
Body (JSON, max 2 KB): `{"sessionId":"...","name":"Aygün","phone":"050 123 45 67"}`
| Status | `error` | Meaning |
|---|---|---|
| 201 | | Enrolled. Body has only `enrollmentId`, no personal data. Send the customer "confirmed" **only after this**. |
| 409 | `full` | No seats. Offer another session from GET /sessions. |
| 409 | `duplicate` | Same phone already enrolled in this session (any number format). |
| 409 | `session_started` | Session time has passed. |
| 404 | `unknown_session` | Id not found for this tenant. |
| 422 | `invalid_input` | Name empty/too long/control chars, or phone is not an Azerbaijani mobile number. |
| 400 / 413 / 415 | `invalid_json` / `payload_too_large` / `unsupported_media_type` | Bad request. |
| 401 | `unauthorized` | Missing or wrong key. |
| 429 | `rate_limited` | More than 120 requests per minute per key. |
| 500 | `server_error` | Storage failure. Do not tell the customer they are enrolled. |

Rules enforced in code (not by the AI): seat check, duplicate check, start-time check, phone normalization. Seat taking is atomic (SQLite `BEGIN IMMEDIATE`), so two simultaneous requests cannot both take the last seat.

## POST /api/v1/sessions (admin key only)
Creates a session for the admin key's tenant. Needs a key from `QEYDAI_ADMIN_KEYS` (same JSON shape as `QEYDAI_API_KEYS`).
Use a separate key, and keep it out of n8n: enrollment keys cannot create sessions, and admin keys cannot list sessions or enroll.
If `QEYDAI_ADMIN_KEYS` is empty, every call is rejected.

Body (JSON, max 2 KB): `{"id":"ielts-sat-1100","courseId":"ielts","startsAt":"2026-11-21T11:00:00+04:00","capacity":12}`
- `id`, `courseId`: 1-64 chars, letters, digits, `_` or `-`, starting with a letter or digit.
- `startsAt`: ISO date-time with an explicit offset (`Z` or `+04:00`), in the future. Stored and returned in UTC.
- `capacity`: integer 1-1000.

| Status | `error` | Meaning |
|---|---|---|
| 201 | | Created. Body: `{"ok":true,"session":{"id","courseId","startsAt","capacity"}}`. |
| 409 | `session_exists` | Id already used for this tenant. The existing session is never changed. |
| 422 | `invalid_input` | Body also has `field` naming the bad field. |
| 400 / 413 / 415 | `invalid_json` / `payload_too_large` / `unsupported_media_type` | Bad request. |
| 401 | `unauthorized` | Missing or unknown key. |
| 403 | `forbidden` | Valid enrollment key, but it has no admin scope. |
| 429 | `rate_limited` | More than 120 requests per minute per key. |
| 500 | `server_error` | Storage failure. |

## n8n usage
HTTP Request node: Method POST, URL above, Authentication "Generic Credential Type" > Header Auth (`Authorization: Bearer <key>`). Store the key in an n8n credential, not in the workflow JSON.

## Limits
- Rate limiter is per process (in memory).
- Local SQLite file: needs a persistent disk. PostgreSQL is the planned production store (same schema).
- Sessions cannot be edited or deleted through the API yet (create only).
