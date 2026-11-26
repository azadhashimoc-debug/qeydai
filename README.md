# panelim.az (QeydAI)

Messaging-first AI sales CRM and trial-session booking platform built with Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript, Tailwind CSS v4, and PostgreSQL 15+ (with SQLite fallback via Node 24 `node:sqlite` for local development and tests).

## Requirements

- **Node.js 24.x** (uses built-in `node:sqlite`)
- **PostgreSQL 15+** for production deployments (with Row-Level Security enabled across tenant tables)

## Environment Setup

Copy `.env.example` to `.env.local` and configure required variables:

```bash
cp .env.example .env.local
```

### Required in Production

- `NEXT_PUBLIC_SITE_URL` — Canonical public URL (e.g. `https://panelim.az`), used for `sitemap.xml`, `robots.txt`, and metadata.
- `QEYDAI_DATABASE_URL` — PostgreSQL connection string. Use a **non-superuser** application role without `BYPASSRLS` so row-level tenant isolation (`app.tenant_id`) is enforced.
- `QEYDAI_PANEL_SECRET` — Session signing secret (minimum 24 characters). Required for email/password login and registration (`/api/auth/login`, `/api/auth/register`).
- `TRUST_PROXY` — Set to `x-forwarded-for` or `x-real-ip` when running behind a reverse proxy so IP rate limiting uses the real client IP. Leave unset when exposed directly.

### Optional Integrations

- `QEYDAI_API_KEYS` — JSON map `{"<24+ char key>": "<tenant_id>"}` for `/api/v1/*` server-to-server calls (e.g. n8n).
- `QEYDAI_ADMIN_KEYS` — JSON map `{"<24+ char key>": "<tenant_id>"}` for key-only staff panel login and `/api/v1/sessions` creation.
- `QEYDAI_PUBLIC_LEAD_TENANT` — Workspace ID receiving public landing/demo form leads.
- `QEYDAI_CRM_CHANNELS`, `QEYDAI_CRM_WORKER_KEY`, `QEYDAI_META_VERIFY_TOKEN`, `QEYDAI_META_APP_SECRET`, `QEYDAI_META_GRAPH_VERSION` — Messaging channel connections and Meta webhook signature verification.
- `QEYDAI_PAYCELL_WEBHOOK_SECRET` — HMAC secret for `POST /api/billing/paycell/webhook`.

### Public company details (shown on the site; anything unset is hidden)

- `NEXT_PUBLIC_COMPANY_LEGAL_NAME`, `NEXT_PUBLIC_COMPANY_TAX_ID` (VÖEN), `NEXT_PUBLIC_COMPANY_ADDRESS` — filled into the privacy policy, terms and data-deletion pages. Until set, those pages show a yellow "to be filled" marker.
- `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_PRIVACY_EMAIL` — contact page and legal pages.
- `NEXT_PUBLIC_CONTACT_WHATSAPP` — real WhatsApp number (digits); becomes the wa.me link in the chat launcher.
- `NEXT_PUBLIC_SOCIAL_TELEGRAM`, `NEXT_PUBLIC_SOCIAL_INSTAGRAM`, `NEXT_PUBLIC_SOCIAL_MESSENGER` — full https links to official accounts.

Prices live in `src/lib/marketing/pricing.ts` and feed the pricing page, the panel, JSON-LD, `llms.txt` and Paycell checkout.

## Database Migrations

Apply SQL migrations under `db/migrations/` to `QEYDAI_DATABASE_URL`:

```bash
npm run migrate              # apply pending migrations
npm run migrate -- --status  # inspect applied/pending migrations
npm run migrate -- --baseline # mark existing schema as applied
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Run Vitest unit & integration tests
npm run e2e      # Run Playwright E2E tests (desktop + mobile)
npx tsc --noEmit # TypeScript type check
```

## Production Deployment

### Option A — Ubuntu VPS (Systemd + Nginx + Certbot SSL)

1. Copy `.env.example` to `/etc/panelim/panelim.env` and fill required production values (`NEXT_PUBLIC_SITE_URL`, `QEYDAI_DATABASE_URL`, `QEYDAI_PANEL_SECRET`, `TRUST_PROXY=x-forwarded-for`).
2. Install the Systemd unit (`deploy/systemd/panelim.service`):
   ```bash
   sudo cp deploy/systemd/panelim.service /etc/systemd/system/panelim.service
   sudo systemctl daemon-reload
   sudo systemctl enable panelim
   ```
3. Configure Nginx + HTTPS SSL:
   ```bash
   CERTBOT_EMAIL=admin@panelim.az bash deploy/scripts/setup-ssl.sh
   ```
4. Deploy and verify health (`check:env` -> `npm ci` -> `npm run migrate` -> `npm run build` -> restart -> `/api/health`):
   ```bash
   bash deploy/scripts/deploy-vps.sh
   ```

### Option B — Docker Compose (`Dockerfile` + `docker-compose.prod.yml`)

```bash
cp .env.example .env.prod
# Fill POSTGRES_PASSWORD, QEYDAI_DATABASE_URL, QEYDAI_PANEL_SECRET, NEXT_PUBLIC_SITE_URL
docker compose -f docker-compose.prod.yml up -d --build
```

### Production Readiness Endpoints & Checklist

- `npm run check:env` — Validates production environment variables without printing secrets.
- `GET /api/health` — Readiness probe (`cache-control: no-store`). Verifies PostgreSQL (`SELECT 1`) or SQLite store availability and returns `200` (`status: "ok"`) or `503` (`status: "degraded"`).
- `GET /robots.txt` — Allows public marketing pages and disallows `/api/`, panel routes, and account-selection screens.
- `GET /sitemap.xml` — Localized `az` / `en` URLs with `x-default` alternates.

Before deploying to production:
1. Run `npm run check:env` against the production environment file.
2. Run `npm run migrate` against the production PostgreSQL database.
3. Run `npx tsc --noEmit && npm run lint && npm test && npm run build && npm run e2e`.
4. Confirm `/api/health` returns `200` with `"storage": "postgres"` after deployment.
