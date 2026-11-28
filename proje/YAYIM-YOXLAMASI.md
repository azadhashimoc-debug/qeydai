# Panelim.az — Yayım yoxlaması

Tarix: 2026-11-28. Mənbə: `feat/panelim-subpages`, yoxlanmış kod commit-i `45ebd4e8c8abcb8fda08aaacff903c8b55fe5a9d`.
Bu beş bənd canlı mühitdə nəticə ilə təsdiqlənənədək açıq qalır. Lokal build canlı inteqrasiyaların işlədiyini təsdiqləmir.

## Canlıya çıxış üçün 5 yoxlama

- [ ] **Hosting panelində 11 əsas mühit dəyişəni doldurulsun.** Aşağıdakı adlar `.env.example`-da mövcuddur. Dəyərlər yalnız hosting-in məxfi dəyişənlər bölməsinə yazılsın; sənədlərə, loglara və Git-ə köçürülməsin. Dəyişiklikdən sonra yeni deployment tələb olunur.

  | Dəyişən | Yoxlama meyarı |
  | --- | --- |
  | `NEXT_PUBLIC_SITE_URL` | Faktiki HTTPS domeni |
  | `QEYDAI_DATABASE_URL` | PostgreSQL bağlantısı; tətbiq rolu, RLS və TLS təsdiqi |
  | `QEYDAI_PANEL_SECRET` | Güclü, təsadüfi sessiya imzalama açarı |
  | `QEYDAI_CHANNELS_ENCRYPTION_KEY` | Güclü, sabit kanal şifrələmə açarı; dəyişməsi saxlanmış tokenlərə təsir edir |
  | `RESEND_API_KEY` | Təsdiqlənmiş göndərən domeni üçün işlək açar |
  | `QEYDAI_EMAIL_FROM` | Resend-də təsdiqlənmiş göndərən ünvanı |
  | `GROQ_API_KEY` | Pani AI üçün işlək server açarı |
  | `CRON_SECRET` | `/api/channels/deliver` planlı sorğularının autentifikasiyası |
  | `QEYDAI_META_APP_SECRET` | Meta webhook imzasını yoxlayan tətbiq sirri |
  | `QEYDAI_META_VERIFY_TOKEN` | Meta panelindəki ilə eyni webhook təsdiq tokeni |
  | `QEYDAI_META_GRAPH_VERSION` | İstifadə edilən Meta tətbiqinin dəstəklədiyi Graph API versiyası |

  Qeyd: `.env.example` cəmi 44 dəyişən saxlayır; yuxarıdakı 11 dəyişən bu buraxılışın əsas siyahısıdır. Hosting-ə uyğun `TRUST_PROXY` ayrıca yoxlanmalıdır (Vercel üçün nümunədə `vercel`). WhatsApp Phone Number ID və access token müvafiq biznesin panelində qoşulur; bu cədvəl həmin qoşulmanı əvəz etmir. Migrasiya URL-i yalnız ayrıca migrasiya əməliyyatı üçündür. Hosting-də `npm run check:env` də icra edilsin; bu komanda canlı Groq/Meta sınağını əvəz etmir.

- [ ] **`NEXT_PUBLIC_SITE_URL` və SSL təsdiqlənsin.** `https://panelim.az` və ya faktiki domen sertifikat xətası olmadan açılsın, HTTP HTTPS-ə yönlənsin, canonical və giriş keçidləri düzgün domenə getsin. Hosting-in production branch-i `main` seçilsin və deployment-in commit-i yoxlanılsın. GitHub-da branch yaratmaq hosting-in bu ayarını avtomatik dəyişmir.

- [ ] **Groq ilə `/api/panel/ai/test` canlı sınağı keçsin.** Giriş edilmiş biznes hesabında Pani AI sınağından `POST /api/panel/ai/test` sorğusu göndərilsin; nümunə gövdə: `{"message":"Salam, sabah üçün rezervasiya etmək istəyirəm."}`. `200`, `ok: true` və məntiqli Azərbaycan dilində cavab alınsın. Açar brauzerə göndərilməsin. Xəta və operatora keçid davranışı da yoxlanılsın.

- [ ] **Meta WhatsApp webhook-u təsdiqlənsin.** Callback URL `https://panelim.az/api/channels/whatsapp` (və ya faktiki domen) olsun; Meta panelində təsdiq eyni `QEYDAI_META_VERIFY_TOKEN` ilə keçsin və `messages` hadisələrinə abunə olunsun. Real nömrədən imzalı mesaj göndərilib düzgün biznesin inbox-una bir dəfə düşdüyü yoxlanılsın. Təkcə URL-in açılması yoxlama sayılmır.

- [ ] **Mobil və kompüterdə tam axın keçsin.** Qeydiyyat, e-poçt təsdiqi, giriş, rezervasiya yaradılması və paneldə görünməsi yoxlanılsın. WhatsApp üçün Standart/Premium hesabında bir kanal qoşulsun: gələn mesaj → Pani AI cavabı → WhatsApp-da çatdırılma təsdiqlənsin. Operatora keçid, təkrar webhook-un ikinci cavab yaratmaması və 24 saatlıq pəncərə bitdikdə panel bildirişi yoxlanılsın. Sınaq məlumatları ayrıca biznesdə saxlanılsın və sınaqdan sonra təmizlənsin.

## Pre-push nəticəsi

- Node.js 24 ilə `npm ci`, `npm run build` və build daxilində TypeScript yoxlaması uğurludur.
- `npm run lint`: 0 xəta, mövcud 4 xəbərdarlıq.
- `npm test`: 341 uğurlu, PostgreSQL bağlantısı olmadığı üçün 29 buraxılmış test (8 fayl).
- 564 mətn faylı və mənbə branch-inin tarixçəsindəki 1267 mətn blob-u üzrə açar formatları, məxfi dəyər təyinatları, bağlantı sətirləri və şəxsi açar başlıqları skan edildi. Yoxlanmış uyğunluqlar test/nümunə dəyərləri, paket integrity sətri və köhnə Google URL parametri idi; real API açarı aşkarlanmadı. Nümunə üzrə skan bütün mümkün sirr formatlarına zəmanət vermir.
- `.env`, `.env.local`, `.env.production`, `.env.production.local` və alt qovluqdakı `.env` ignore olunur; `.env.example` istisnadır. Git-də yalnız nümunə mühit faylı izlənir.
- Lokal PostgreSQL inteqrasiya və Playwright testləri bu yoxlamada icra edilməyib. Kod commit-i `45ebd4e8` üçün [GitHub CI #242](https://github.com/azadhashimoc-debug/qeydai/actions/runs/46123962728) uğurludur: PostgreSQL, masaüstü/mobil Playwright və PostgreSQL qeydiyyat/CRM sınaqları keçib. Sənəd commit-i üçün yeni CI ayrıca izlənilir.
- Canlı hosting dəyişənləri, SSL, Meta/Groq mesajlaşması və production deployment bu tapşırıqda icra edilməyib.
