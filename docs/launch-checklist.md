# panelim.az — Lansmandan Əvvəl Əməliyyat Təlimatı (Ops Runbook)

Kod tərəfindəki bütün 5 mərhələ hazırdır. Aşağıdakı addımlar yalnız xarici xidmətlərdə (Vercel, Neon, Groq, Resend, Meta, Paycell, DNS) hesab və açarların qoşulmasını əhatə edir.

---

## 1. Bazada yeni miqrasiyaları işə salın (`0010`–`0014`)

Neon `main` (prod) bazasına əvvəlcə ehtiyat snapshot alın, sonra tətbiq edin:

```bash
QEYDAI_DATABASE_URL="postgresql://neondb_owner:...@.../neondb?sslmode=verify-full" npm run migrate
```

Tətbiq olunan yeni miqrasiyalar:
- `0010_workspace_notifications.sql` — iş sahəsi Telegram bildiriş ayarları
- `0011_account_email_tokens.sql` — e-poçt təsdiqi və şifrə sıfırlama tokenləri
- `0012_channel_credentials.sql` — müştərilərin öz kanal tokenləri (AES-256-GCM şifrəli)
- `0013_sales_ai_settings.sql` — Pani AI ayarları və aylıq istifadə sayğacı
- `0014_subscriptions_and_trials.sql` — 14 günlük sınaq və abunə plan limitləri

---

## 2. `panelim.az` domeni və DNS

1. **Vercel → Project Settings → Domains**: `panelim.az` və `www.panelim.az` əlavə edin (`www` → `panelim.az` 308 yönləndirməsi).
2. Registratorda Vercel-in verdiyi `A` (`76.76.21.21`) və `CNAME` (`cname.vercel-dns.com`) qeydlərini əlavə edin.
3. Vercel Production Env-də təyin edin:
   - `NEXT_PUBLIC_SITE_URL=https://panelim.az`
   - `TRUST_PROXY=vercel`
   - `QEYDAI_DATABASE_URL=...&sslmode=verify-full`
4. **Google Cloud Console (OAuth)** → Authorized redirect URI:
   - `https://panelim.az/api/panel/oauth/google/callback`
5. **Meta Developers (Facebook Login)** → Valid OAuth Redirect URI + Data Deletion:
   - OAuth Callback: `https://panelim.az/api/panel/oauth/facebook/callback`
   - Data Deletion Callback URL: `https://panelim.az/api/legal/meta-data-deletion`
   - Data Deletion Instructions URL: `https://panelim.az/az/legal/data-deletion`

---

## 3. Pani AI (Groq)

1. [console.groq.com](https://console.groq.com) hesabından API açarı yaradın və aylıq büdcə həddi təyin edin.
2. Vercel Production Env-ə əlavə edin:
   - `GROQ_API_KEY=gsk_...`
   - `GROQ_MODEL=llama-3.3-70b-versatile` (istəyə bağlı)
3. Paneldə **AI** bölməsinə daxil olub biznes kontekstini yazın və «Pani-ni yoxla» ilə canlı test edin.

---

## 4. Tranzaksiya E-poçtu (Resend)

1. [resend.com](https://resend.com) hesabında `panelim.az` domenini əlavə edin.
2. Resend-in verdiyi **SPF**, **DKIM** və **DMARC** DNS qeydlərini domen registratoruna əlavə edib təsdiqləyin.
3. Vercel Production Env-ə əlavə edin:
   - `RESEND_API_KEY=re_...`
   - `QEYDAI_EMAIL_FROM="panelim.az <noreply@panelim.az>"`

---

## 5. Kanallar (WhatsApp / Instagram / Telegram) və Outbox Cron

1. Vercel Production Env-ə əlavə edin:
   - `QEYDAI_CHANNELS_ENCRYPTION_KEY` (`openssl rand -hex 32`)
   - `CRON_SECRET` (`openssl rand -hex 24`) — `vercel.json`-dakı `/api/channels/deliver` cron-u üçün
   - `QEYDAI_CRM_WORKER_KEY` (istəyə bağlı, manual worker çağırışı üçün)
   - `QEYDAI_META_APP_SECRET` (Meta App Dashboard → Basic Settings)
   - `QEYDAI_META_VERIFY_TOKEN` (özünüz yaratdığınız təsadüfi açar; Meta Webhook yoxlamasında eyni dəyəri yazın)
   - `QEYDAI_META_GRAPH_VERSION=v22.0`
2. **Meta Webhook URL-ləri**:
   - WhatsApp: `https://panelim.az/api/channels/whatsapp`
   - Instagram: `https://panelim.az/api/channels/instagram`
3. **Telegram**: Müştərilər `@BotFather` tokenini birbaşa paneldəki **Kanallar** bölməsindən daxil edir — webhook avtomatik quraşdırılır.

---

## 6. Demo Sorğuları və Operativ Xəta Bildirişləri (Telegram)

1. Öz iş sahənizin `tenantId`-sini (məs. `biz_...`) Vercel Env-ə yazın:
   - `QEYDAI_PUBLIC_LEAD_TENANT=biz_...`
2. Operativ bildirişlər üçün `@BotFather`-dan bot yaradıb öz Telegram Chat ID-nizi əlavə edin:
   - `QEYDAI_OPS_TELEGRAM_BOT_TOKEN=...`
   - `QEYDAI_OPS_TELEGRAM_CHAT_ID=...`
3. Bundan sonra saytdan gələn bütün demo sorğuları həm CRM-inizə düşəcək, həm də Telegram-a gələcək; 5xx xətaları da Telegram-a bildiriləcək.

---

## 7. Ödəniş (Paycell)

Paycell müqaviləsi təsdiqləndikdən sonra Vercel Production Env-ə əlavə edin:
- `QEYDAI_PAYCELL_CHECKOUT_URL=https://...`
- `QEYDAI_PAYCELL_WEBHOOK_SECRET=...`

Paycell tərəfdə Webhook URL olaraq təyin edin:
- `https://panelim.az/api/billing/paycell/webhook`

---

## 8. Real Əlaqə, Sosial Hesablar, Hüquqi Rekvizitlər və Analitika

Vercel Production Env-də təyin edin (boş olanlar saytda saxta məlumat kimi göstərilmir):
- `NEXT_PUBLIC_WHATSAPP_NUMBER=994XXXXXXXXX` (yalnız rəqəmlər)
- `NEXT_PUBLIC_CONTACT_PHONE=+994 XX XXX XX XX`
- `NEXT_PUBLIC_CONTACT_EMAIL=info@panelim.az`
- `NEXT_PUBLIC_TELEGRAM_URL=https://t.me/...`
- `NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/...`
- `NEXT_PUBLIC_MESSENGER_URL=https://m.me/...`
- `NEXT_PUBLIC_LEGAL_ENTITY_NAME="Şirkət Adı MMC"`
- `NEXT_PUBLIC_LEGAL_ENTITY_VOEN="1234567890"`
- `NEXT_PUBLIC_LEGAL_ENTITY_ADDRESS="Bakı şəh., ..."`
- `NEXT_PUBLIC_GA_ID=G-...` (istəyə bağlı)
- `NEXT_PUBLIC_META_PIXEL_ID=...` (istəyə bağlı)

> **Hüquqi qeyd:** Məxfilik siyasəti (`/[lang]/legal/privacy`) və İstifadə şərtləri (`/[lang]/legal/terms`) artıq tam qaralama şəklindədir; kommersiya satışından əvvəl hüquqşünasla yekun baxış tövsiyə olunur.

---

## 9. Neon Verilənlər Bazası Təhlükəsizliyi və Ehtiyat Nüsxələr

1. **Neon Console → Branches → `main` → Protect branch** aktiv edin (təsadüfi silinmə və reset-ə qarşı).
2. **History retention / Snapshots**: pulsuz planda tarix saxlama 6 saatdır; lansman üçün Neon Launch/Scale planına keçib gündəlik avtomatik snapshot cədvəli və ən azı 7 günlük PITR aktiv edin.
3. **Köhnə sınaq budaqları**: artıq ehtiyac qalmayan 8 sınaq/staging budağını silin, staging üçün ayrıca Neon layihəsi istifadə edin.
4. **Region qərarı (ABŞ vs Avropa)**: hazırda Neon `us-east-1` və Vercel `iad1` bölgəsindədir (məxfilik siyasətində transsərhəd məlumat saxlama qeyd olunub). Daha aşağı gecikmə (~40-50 ms fərq) üçün gələcəkdə `eu-central-1` (Frankfurt) bölgəsinə köçürülmə nəzərdə tutula bilər.
