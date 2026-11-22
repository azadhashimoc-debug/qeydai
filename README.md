# panelim.az (QeydAI)

Azərbaycan biznesləri üçün WhatsApp, Instagram və Telegram əsaslı satış CRM-i: vahid mesaj qutusu, satış qıfı (Kanban), rezervasiya/qeydiyyat və n8n inteqrasiyası. AZ/EN marketinq saytı və giriş sonrası panel.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, PostgreSQL (Neon, RLS), Vitest, Playwright.

> Bu Next.js versiyasında API-lər köhnədən fərqlənə bilər. Kod yazmazdan əvvəl `node_modules/next/dist/docs/` oxuyun (bax: `AGENTS.md`).

## Quraşdırma
```bash
npm install
cp .env.example .env.local   # dəyərləri doldurun
npm run dev                  # http://localhost:3000/az
```

## Əmrlər
| Əmr | Təyinat |
|---|---|
| `npm run dev` / `build` / `start` | Development / production build / run |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit testləri |
| `npm run test:pg` | PostgreSQL inteqrasiya testləri (`QEYDAI_DATABASE_URL` lazımdır) |
| `npm run e2e` | Playwright (desktop + mobil) |

## Struktur
- `src/app/[lang]/` — AZ/EN marketinq və panel səhifələri; mətnlər `dictionaries/*.json`-dadır (kodda sərt yazılmır, `i18n-guard` testi yoxlayır).
- `src/app/api/` — `lead`, `analytics`, `channels`, `v1/*` (n8n Bearer API), `panel/*`.
- `src/lib/` — `crm`, `enrollment`, `leads`, `analytics`, `marketing`, `rate-limit`.
- `db/migrations/` — `0001` → `0005`, sırayla tətbiq olunur.
- `n8n/workflows/` — import edilə bilən şablonlar.
- `docs/` — API, release gate, production DB rolu, qiymət və bazar araşdırmaları.

## Production
Production-a çıxmazdan əvvəl `docs/production-release-gate.md` və `docs/production-postgres-role.md` addımlarını izləyin. Mühit dəyişənləri `.env.example`-dadır. Avtomatik Vercel Git deploy `vercel.json`-da söndürülüb.
