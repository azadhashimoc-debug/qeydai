# Go-live runbook (QeydAI / panelim.az)

Hər addımı yalnız uyğun təsdiq alındıqdan sonra icra edin. Bu sənəd `production-release-gate.md`-ni əvəz etmir, onu tamamlayır.

## 0. Əvvəlcədən (kodda hazırdır)
- Migrasiyalar 0001 → 0005 lokal PostgreSQL-də məhdud rolla sınaqdan keçib (`npm run test:pg`).
- Kod: typecheck, lint, 284 unit test, 20 PG testi keçir.

## 1. Neon staging (disposable branch)
1. Production main-dən yeni branch yaradın (release gate, bənd 2).
2. Migrasiyaları 0001 → 0005 ardıcıllıqla, xətada dayanmaqla tətbiq edin (migrasiya sahibi rolla).
3. Məhdud tətbiq rolunu release gate-dəki SQL ilə yaradın, parolu konsolda təyin edin.
4. `QEYDAI_DATABASE_URL=<staging məhdud rol, pooled> npm run test:pg` işlədin.

## 2. Vercel mühit dəyişənləri (Production)
Sirlər yalnız Vercel-də, repoda yox. Siyahı `.env.example`-dadır. Mütləq:
`QEYDAI_DATABASE_URL`, `QEYDAI_ADMIN_KEYS`, `QEYDAI_PANEL_SECRET`, `QEYDAI_CRM_CHANNELS`, `QEYDAI_CRM_WORKER_KEY`, `QEYDAI_META_APP_SECRET`, `QEYDAI_META_VERIFY_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `TRUST_PROXY=x-forwarded-for` (Vercel arxasında).
AI üçün: `GROQ_API_KEY` və/və ya `NVIDIA_API_KEY`, `QEYDAI_AI_KNOWLEDGE`.
`QEYDAI_E2E_SQLITE` təyin ETMƏYİN.

## 3. Kanallar
- Telegram: `setWebhook` ünvanı `https://<domen>/api/channels/telegram?account=<hesab>`, `secret_token` = `QEYDAI_CRM_CHANNELS`-dəki `secret`.
- WhatsApp/Instagram: Meta App-də callback `https://<domen>/api/channels/whatsapp` (və `/instagram`), verify token = `QEYDAI_META_VERIFY_TOKEN`; App Secret = `QEYDAI_META_APP_SECRET`.

## 4. Outbox cron
Hər 1 dəqiqə: `POST https://<domen>/api/channels/deliver` başlıq `Authorization: Bearer <QEYDAI_CRM_WORKER_KEY>` (n8n və ya Vercel Cron).

## 5. Deploy-dan sonra
```
node scripts/smoke.mjs https://<domen>
```
Qeyd: bazası qoşulmayan lokal mühitdə "panel API requires auth" 503 qaytarır və uğursuz sayılır; production-da 401/403 gözlənilir (503 = baza konfiqurasiyası səhvdir).
Sonra: panelə daxil olun, AI tabında vəziyyətin "Aktiv" olduğunu və provayderlərin göründüyünü yoxlayın; test kanalına mesaj yazıb AI cavabının və ötürmə tapşırığının yarandığını təsdiqləyin.

## 6. Geri qayıtma
Release gate-in rollback bölməsinə baxın: migrasiyalar additivdir, kor-koranə geri qaytarılmır; problem olduqda köhnə tətbiqi canlı saxlayın.
