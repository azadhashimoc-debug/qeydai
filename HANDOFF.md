# Teslim: QeydAI

Tarih: 2026-11-18 · Klasör: C:/Users/adem/projects/qeydai · Brief: brief.md (onay: 2026-11-18)

## Ne yapıldı
- **Çekirdek qeydiyyat mantığı** (boş yer, təkrar qeydiyyat, eşzamanlı son yer, kiracı izolasyonu, başlamış dərsə kayıt reddi, AZ mobil numara doğrulama) → `src/lib/enrollment/enrollment.ts` (+ `enrollment.test.ts`, `enrollment.review.test.ts`).
- **AZ/EN landing sayfası** (`/az`, `/en`, dil yönlendirme, koyu/açık tema, mobil uyumlu, SSS, merkez/hakkımızda bölümü, özel 404/hata sınırları, JSON-LD, `robots.txt` + `sitemap.xml`) → `src/app/[lang]/`, `src/app/global-not-found.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/proxy.ts`.
- **Kalıcı SQLite & PostgreSQL depoları**:
  - `src/lib/enrollment/sqlite-store.ts` (Node 24 `node:sqlite`): atomik yer ayırma, `UNIQUE(tenant_id, session_id, phone)`, kiracı kapsamlı sorgular, yarış testi.
  - `db/migrations/0001_init.sql` + `src/lib/enrollment/postgres-store.ts`: PostgreSQL 15+ şeması ve `PostgresEnrollmentStore` (mock kontrat testleri yeşil).
- **n8n kimlik doğrulamalı kayıt & admin oturum API'leri** (`GET /api/v1/sessions`, `POST /api/v1/enroll`, `POST /api/v1/sessions`): Bearer anahtarı, N+1 giderimi, `cache-control: no-store`, doğrulanmış admin oturum açma, `docs/api.md`, `.env.example`.
- **Lead formu API & Güvenlik** (`POST /api/lead`): akış tabanlı bayt limitli okuyucu, `sec-fetch-site` reddi, hız sınırı, COOP/CORP/CSP/HSTS başlıkları.
- **Analitik, A/B testi & Scroll/React performansı**: sıfır PII analitik, statik PPR uyumlu `hero_cta_v1` A/B deneyi, throttled scroll derinliği dinleyicisi.
- **n8n import edilebilir workflow şablonları** (`n8n/workflows/`, `D:\tedris-ai\workflows\`, `docs/n8n-workflows.md`): `01-telegram-ai-enrollment.json`, `02-lead-form-notify.json`.
- **Lansman, SEO ve CI hazırlığı**: `.github/workflows/ci.yml`, `playwright.config.ts`, `docs/launch-playbook.md`, `docs/programmatic-seo-plan.md`.
- **Defter / Yoklama Defteri site yeniden tasarımı**: `globals.css`, `layout.tsx`, `page.tsx`, `LeadForm.tsx`, `SeatBoard.tsx`, `Tick.tsx` — `Literata` + `Caveat` yazı tipleri, kareli defter kılavuzu, tükenmez kalem onaylı yoklama kutusu, WCAG AA uyumlu açık/koyu tema token testleri.
- **İçerik** (AZ + EN): 4 blog yazısı, Meta ve Google reklam varyantları, 3 e-posta/mesaj şablonu, 30 günlük takvim ve 30 Flow görseli (`content/month-1/`, `assets/month-1/`).
- **Rakip & Strateji Dokümanları**: `docs/competitor-research.md`, `docs/ux-research.md`, `docs/pricing-strategy.md`, `docs/competitor-alternatives.md`.
- 18 ajan `.claude/agents/` altına kuruldu (`install_plan.py --run`).

## Nasıl çalıştırılır
```
cd C:/Users/adem/projects/qeydai
npm install
npm run dev            # geliştirme: http://localhost:3000/az
npm run build && npm run start   # üretim modu
npm test               # birim testleri (vitest)
npm run e2e            # Playwright E2E testleri
python C:/Users/adem/studio/tools/content/check_pack.py content/month-1 --assets assets
```

## Test kanıtı
```
Son tam doğrulama (2026-11-18 09:06:45):
$ npm run lint -> exit 0
$ npx tsc --noEmit -> exit 0
$ npm test -> Test Files 19 passed (19), Tests 166 passed (166)
$ npm audit --omit=dev -> found 0 vulnerabilities

Production build & E2E:
$ npm run build -> exit 0
$ npm run e2e -> 48 passed (1.7m, desktop + mobile)
```

## İçerik paketi
- Yer: content/month-1/ (30 gün, AZ + EN) · Görseller: assets/month-1/
- Blog: 4 yazı · Reklam: 2 kanal x 3 varyant · E-posta/mesaj: 3 şablon
- Doğrulama: `check_pack.py` → OK (2026-11-18)

## Yapılan ücretli / dış işlemler
- yok

## Açık kalanlar
- Canlı sunucuya (Vercel/Docker) dağıtım, gerçek WhatsApp/Telegram bot token'ları ve PostgreSQL veritabanı bağlantısı.

## Panelim KOBİ güncellemesi (2026-11-23)
- Sektör sayfaları: src/app/[lang]/dictionaries/industries.ts (AZ+EN içerik), route src/app/[lang]/industries/**
- Kanal durumu: GET /api/panel/channels (QEYDAI_CRM_CHANNELS env'inden, token yok)
- Paycell webhook: POST /api/billing/paycell/webhook, env QEYDAI_PAYCELL_WEBHOOK_SECRET, header x-paycell-signature. Payload sözleşmesi (eventId, tenant, plan, period, status, amount, currency=AZN) VARSAYIMDIR; gerçek Paycell formatı doğrulanmadı.
- E2E notu: .env.local içindeki QEYDAI_DATABASE_URL e2e'yi bozar; `QEYDAI_DATABASE_URL= npx playwright test` ile çalıştır.
- Eksik: case/integrations/partners/ai alt sayfaları, TikTok kanalı, plan state'i billing_events'ten okuma, görsellerin sayfalara bağlanması (hazır: public/images/*).

### Giris sistemi (2026-11-23)
- Hesap: POST /api/auth/register ve /api/auth/login (email + parola >= 10 karakter). Gereken env: QEYDAI_PANEL_SECRET (>= 24 karakter), QEYDAI_DATABASE_URL (veya yerel SQLite).
- Eksik: parola sifirlama (e-posta gonderimi yok), e-posta dogrulama, Google/Facebook girisi, ekip uyesi daveti (uyeler hala admin anahtari/uye anahtariyla), hesap silme.
- Veritabani: npm run migrate (bos Postgres 17 uzerinde dogrulandi, RLS non-superuser rolle test edildi). Uygulama rolu SUPERUSER/BYPASSRLS olmamali.
