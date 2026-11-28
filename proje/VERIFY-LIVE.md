# Mərhələ 3B — avtomatik canlı yoxlama

Əsas əmr:

```sh
npm run verify:live
```

Fayl yoxdursa əmr `.env.production.local` şablonunu yaradır və dayanır. İçindəki 11 əsas dəyişəni və üç `TEST_WHATSAPP_*` dəyişənini doldurun; `TRUST_PROXY=vercel` saxlanılır. Mövcud faylın üzərinə yazılmır. Fayl `.gitignore` və `.vercelignore` ilə qorunur. Məxfi fayl commit edilmir; yeni checkout-da eyni şablonu skript yaradır.

## Bir dəfə hazırlanacaq girişlər

- Node.js 24, `npm ci`, Chromium (`npx playwright install chromium`). Skript brauzeri hosting-də dəyişiklik etməzdən əvvəl açır.
- Vercel CLI girişi və düzgün mövcud layihə ilə əlaqə (`npx vercel login`, `npx vercel link`). Skript layihə/sahib ID-sini, `azadhashimoc-debug/qeydai` mənbəyini və `main` production branch-ini yoxlayır; yeni layihə yaratmır. CLI 68.0.0 versiyası ilə işləyir.
- Təmiz, commit edilmiş `main`. Skript həmin commit-i deploy metadata-sında saxlayır və faktiki domenin yeni deployment-ə keçdiyini yoxlayır.
- TLS-li PostgreSQL URL-i: tətbiq rolu NOSUPERUSER, NOBYPASSRLS, cədvəllərin sahibi olmadan DML icazələri ilə işləməlidir. Məcburi RLS yoxlanılır. `0016_whatsapp_delivery_receipts.sql` migrasiyası və yeni cədvəl üçün tətbiq roluna SELECT/INSERT/UPDATE/DELETE lazımdır. Migrasiya hazır deyilsə, eyni DB-nin `QEYDAI_MIGRATION_DATABASE_URL` dəyərini lokal faylda doldurmaq migrasiyaları və yeni cədvəlin icazələrini avtomatik tətbiq edir. Bu URL Vercel-ə göndərilmir.
- Resend açarı göndərilən məktubları siyahılamaq və oxumaq icazəsinə malik olmalıdır. Yalnız göndərmə icazəli açarla tam avtomatlaşdırma mümkün deyil. `TEST_EMAIL_RECIPIENT` könüllüdür; boşdursa `QEYDAI_EMAIL_FROM` ünvanından istifadə edilir. Seçilmiş real poçt ünvanı `+live-UUID` aliaslarını qəbul etməlidir. Skript Resend-in `delivered/opened/clicked` təsdiqini gözləyir və göndərilmiş məktubdakı birdəfəlik linki real UI-də açır. Bu, poçt provayderinə çatdırılmanı yoxlayır; poçt qutusunun interfeysinə daxil olmur.
- Ayrıca test WhatsApp Phone Number ID-si istifadə olunmalıdır. Başqa biznesə qoşulu nömrə götürülmür və token dəyişdirilmir. `TEST_WHATSAPP_ACCESS_TOKEN` həmin nömrəyə giriş verməlidir; `TEST_WHATSAPP_RECIPIENT` ölkə kodu ilə yalnız rəqəmlərdən ibarət razılıqlı alıcıdır.
- Meta tətbiqinin callback ünvanı faktiki domenin `/api/channels/whatsapp` yoluna, `messages` abunəsi isə həmin tətbiqə qurulmalıdır. Test alıcısı həmin biznes nömrəsinə son 24 saatda real mesaj göndərmiş olmalıdır. Üç test dəyişəni istifadəçinin şəxsi WhatsApp hesabından mesaj göndərmək səlahiyyəti vermir; skript Meta-nın real xidmət pəncərəsini aça bilmir. Pəncərə bağlıdırsa test uğursuz olur.

## Ardıcıl yoxlamalar

1. Lokal fayldakı 11 əsas dəyişən və `TRUST_PROXY` production mühitinə `npx vercel env add --force` ilə stdin-dən ötürülür. Sonra `npx vercel --prod` işləyir. `TEST_*` və migrasiya URL-i hosting dəyişənlərinə əlavə edilmir. Test WhatsApp tokeni yalnız ayrıca biznesin kanal API-si ilə şifrələnərək saxlanır.
2. HTTPS/TLS, HTTP-dən eyni HTTPS domeninə yönləndirmə, canonical, production deployment və commit uyğunluğu yoxlanır.
3. Müvəqqəti biznes real qeydiyyat/e-poçt təsdiqi ilə yaradılır. Sessiyalı `/api/panel/ai/test` cavabının boş olmaması, 25 AZN ssenarisinə uyğunluğu və Azərbaycan dili əlavə Groq qiymətləndirməsi ilə yoxlanır. Dil/məna qiymətləndirməsi model əsaslıdır. Operator açar sözü və yanlış girişə 422 davranışı da yoxlanır.
4. Webhook GET challenge-i, yanlış token/imzanın rəddi, düzgün HMAC ilə sintetik gələn mesaj, ardıcıl/paralel dublikatlar və operatorun real cavabı yoxlanır. Sintetik gələn hadisə Meta-dan gələn real istifadəçi mesajı kimi təqdim edilmir. Çıxan Pani və operator mesajları həqiqətən Meta-ya göndərilir; uğur üçün onların `wamid` ID-lərinə bağlı real, imzası yoxlanmış `delivered/read` webhook-ları gözlənilir. Təkcə `200` və ya `sent` kifayət etmir. Operator sonrası yeni gələn hadisədə 25 saniyə ərzində əlavə AI cavabı yaranmamalıdır. Test söhbətinin tətbiqdəki pəncərəsi 25 saat əvvələ çəkilir; API rəddi və paneldə 24 saatlıq xəta bildirişi yoxlanır.
5. 1440×1000 və 390×844 ölçülərində ayrıca hesablarla qeydiyyat, e-poçt təsdiqi, şifrə ilə giriş, salon quraşdırma addımları, rezervasiya vaxtının UI-də yaradılması, API-də və səhifə yeniləndikdən sonra paneldə görünməsi yoxlanır.

## Təmizləmə və nəticə

`finally` həm uğurda, həm xətada brauzeri bağlayır və yalnız həmin sınağın UUID ilə yaradılmış e-poçt/biznes adı ilə təsdiqlənmiş tenant məlumatlarını silir. Kanal və AI söndürülür, aktiv çatdırılma işi bitənədək gözlənilir, FK ardıcıllığı qorunur və qalıq məlumat yoxlanılır. Başqa biznesin məlumatlarına toxunulmur. DB advisory lock paralel sınaqların qarşısını alır.

Jurnal `.vercel/verify-live-state.json`, nəticə `.vercel/verify-live-result.json` faylındadır. Jurnalda parol/token saxlanmır. Proses qəfil kəsilərsə növbəti işəsalmada əvvəlki hesablar təmizlənir. Yalnız təmizləmə üçün:

```sh
npm run verify:live -- --cleanup-only
```

Yalnız beş yoxlama **və təmizləmə** uğurlu olduqda `proje/YAYIM-YOXLAMASI.md` faylındakı beş əsas xana `[x]` olur və yoxlanmış commit/vaxt qeyd edilir. Səhv olduqda çıxış kodu 1 olur, xanalar dəyişdirilmir. Skript özü Git commit/push etmir; nəticə ayrıca commit edilə bilər. Hosting dəyişiklikləri və artıq çatdırılmış mesajlar sınaq uğursuz olsa da geri qaytarılmır. Təmizləmə tətbiqdəki test məlumatlarına aiddir; Meta/Resend tarixçəsi və müddəti bitəcək ümumi təhlükəsizlik sayğacları saxlanır.

## Hazırlanma zamanı lokal yoxlama

2026-11-28: TypeScript və production build keçib; lint-də 0 xəta və əvvəlki 4 xəbərdarlıq var. 347 unit testi və 35 PostgreSQL testi keçib. Real PostgreSQL-də erkən çatdırılma bildirişi, təkrar/sırası dəyişmiş statuslar, RLS təcridi, köhnə sxemə uyğunluq və yalnız öz test hesabının təmizlənməsi yoxlanıb. Skriptin quraşdırma və rezervasiya köməkçiləri 1440×1000 və 390×844 ölçülərində lokal tətbiqdə keçib. Canlı Groq/Meta/Resend sınağı aparılmayıb: məcburi 14 dəyər boşdur və runner deploy-dan əvvəl çıxış kodu 1 ilə dayanır.
