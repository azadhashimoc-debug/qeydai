# QeydAI n8n Workflows

Importable workflow templates live in `n8n/workflows/` (and mirrored in `D:\tedris-ai\workflows\`).
All templates ship with `"active": false`, `executionOrder: "v1"`, timeouts on external HTTP calls, an `Error Trigger` handler, and **no hardcoded secrets**.

## 1. `01-telegram-ai-enrollment.json`

Telegram message -> fetch real-time open sessions -> Gemini intent extraction -> deterministic QeydAI `/api/v1/enroll` call -> exact status-mapped reply.

- **Required n8n credentials** (create in n8n UI before activating):
  1. **Telegram API**: BotFather token (`QeydAI Telegram Bot`).
  2. **Header Auth (`QeydAI Enrollment API Key`)**: Header `Authorization`, Value `Bearer <24+ char key from QEYDAI_API_KEYS>`.
  3. **Header Auth (`Gemini x-goog-api-key`)**: Header `x-goog-api-key`, Value `<your Gemini API key>`.
- **Required n8n environment variables**:
  - `QEYDAI_API_URL` (defaults to `http://localhost:3000`)
  - `QEYDAI_ADMIN_CHAT_ID` (Telegram chat ID for `Error Trigger` alerts)
- **Safety guarantee**: The Gemini prompt forbids confirming enrollment directly; confirmation text is generated deterministically in `Format Enroll Outcome` only when `POST /api/v1/enroll` returns `201`.

## 2. `02-lead-form-notify.json`

Authenticated webhook (`POST /webhook/qeydai-lead`) -> validates `$json.body` -> notifies center staff on Telegram -> responds `200`/`400`.

- **Required n8n credentials**:
  1. **Header Auth (`QeydAI Webhook Secret`)**: shared header secret for webhook requests.
  2. **Telegram API**: `QeydAI Telegram Bot`.

## Import steps (local n8n at `http://localhost:5678`)

1. Start QeydAI (`npm run build && npm run start`) and n8n (`D:\tedris-ai\start-n8n.ps1`).
2. In n8n UI: **Workflows -> Import from File** -> pick `01-telegram-ai-enrollment.json` or `02-lead-form-notify.json`.
3. Attach the credentials above, test with **Execute Workflow**, and only then toggle **Active**.
