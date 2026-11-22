# Production üçün sizin əl ilə etməli olduğunuz işlər

Tarix: 22 Noyabr 2026. Kod, migrasiyalar (0001–0006 Neon production-da), CI və sənədlər hazırdır. Aşağıdakılar hesab, açar və ya hüquqi qərar tələb etdiyi üçün yalnız siz edə bilərsiniz.

## Hazırkı vəziyyət
- Neon (`neon-bisque-marble`, branch `main`): migrasiyalar 0001–0006 tətbiq olunub, hələ iş sahəsi yoxdur.
- Vercel layihəsi `qeydai`: bazaya aid dəyişənlər, `QEYDAI_DATABASE_URL`, `QEYDAI_PANEL_SECRET`, `QEYDAI_API_KEYS`, `QEYDAI_ADMIN_KEYS` var. Canlı sayt köhnə kodla işləyir (yeni səhifələr, AI və sağlamlıq endpoint-i yoxdur).
- Çatışan: aşağıdakı addımlar.

## A. Mütləq (bunlarsız deploy etmək olmaz)
1. **Yeni kodu deploy edin.** `vercel.json` Git-dən avtomatik deploy-u söndürüb.
   - Branch `ccr-d596bea7-6g9kkk`-u əsas branch-a PR ilə birləşdirin (GitHub → Pull requests).
   - Vercel → `qeydai` → Deployments → ən son commit üçün "Redeploy", ya da lokal: `npx vercel --prod`.
2. **Vercel mühit dəyişənləri** (Vercel → `qeydai` → Settings → Environment Variables → Production):
   - `NEXT_PUBLIC_SITE_URL` = sayt ünvanı (məs. `https://panelim.az`).
   - `TRUST_PROXY` = `x-forwarded-for`.
   - `QEYDAI_CRM_WORKER_KEY`: təsadüfi açar. Terminalda `openssl rand -hex 32`. Sensitive kimi saxlayın.
3. **`QEYDAI_DATABASE_URL`-in məhdud rolla olduğunu yoxlayın.** Neon-da `panelim_production_app` rolu hazırdır. Neon Console → project `neon-bisque-marble` → Roles → həmin rol üçün parolu sıfırlayıb "Connection string"-i (pooled) kopyalayın və Vercel-də `QEYDAI_DATABASE_URL`-ə yazın. Owner (`neondb_owner`) bağlantısı olmamalıdır, çünki RLS yalnız məhdud rolda qoruyur.
4. **Deploy-dan sonra yoxlama:** `node scripts/smoke.mjs https://<domen>`. Vercel SSO qoruması `*.vercel.app` ünvanlarında giriş divarı qoyur; öz domeniniz qoşulanda (bənd 5) bu problem olmur.

## B. Domen
5. **panelim.az domenini qoşun:** Vercel → `qeydai` → Settings → Domains → Add. Vercel DNS qeydlərini göstərəcək (A/CNAME), onları domen qeydiyyatçınızın panelində əlavə edin. Domeni sahib olduğunuzu qeydiyyatçıda yoxlayın (az domenləri üçün https://www.nic.az və ya akkreditə olunmuş qeydiyyatçı).

## C. AI (cavabları aktivləşdirmək üçün)
6. **Groq açarı:** https://console.groq.com → API Keys → Create. Vercel-də `GROQ_API_KEY`.
7. **NVIDIA açarı:** https://build.nvidia.com → profil → API Keys → Generate. Vercel-də `NVIDIA_API_KEY`. **Söhbətdə göstərdiyiniz köhnə açarı eyni səhifədə silib yenisini yaradın.**
8. **Groq modelini yoxlayın** (hələ yoxlanmayıb): `GROQ_API_KEY=... QEYDAI_AI_PROVIDER_ORDER=groq npx tsx scripts/ai-eval.mts`. Uğursuz olarsa Groq-un model siyahısından (console.groq.com/docs/models) cari model adını seçib `QEYDAI_AI_GROQ_MODEL`-ə yazın.
9. **Biznes məlumatını yazın:** panelə daxil olun (`QEYDAI_ADMIN_KEYS`-dəki sahib açarı ilə) → AI tabı → xidmətlər, qiymətlər, iş saatları, ünvan → Yadda saxla. Panelin AI tabında status "Aktiv" olmalıdır.

## D. Kanallar
10. **Telegram:** Telegram-da @BotFather → `/newbot` → token alın. Sonra:
    `curl "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://<domen>/api/channels/telegram?account=<hesab-adı>" -d "secret_token=<təsadüfi-gizli>"`
    `QEYDAI_CRM_CHANNELS`-ə `{"channel":"telegram","account":"<hesab-adı>","tenant":"<iş sahəsi id>","token":"<TOKEN>","secret":"<təsadüfi-gizli>"}` əlavə edin (JSON siyahı, `.env.example`-a baxın).
11. **WhatsApp:** https://developers.facebook.com → Create App (Business) → WhatsApp məhsulu əlavə edin → telefon nömrəsi qoşun. Lazım olanlar:
    - Daimi giriş tokeni: Meta Business Settings → System Users → token yaradın (`whatsapp_business_messaging`).
    - `QEYDAI_META_APP_SECRET`: App Settings → Basic → App Secret.
    - `QEYDAI_META_VERIFY_TOKEN`: özünüz seçdiyiniz təsadüfi sətir.
    - Webhook: WhatsApp → Configuration → Callback URL `https://<domen>/api/channels/whatsapp`, Verify token yuxarıdakı, `messages` sahəsinə abunə olun.
    - Real müştərilərə yazmaq üçün Meta Business Verification (sənəd yükləmə) və mesaj şablonları lazımdır. Bu bir neçə gün çəkə bilər.
12. **Instagram:** eyni Meta App-də Instagram məhsulu; callback `https://<domen>/api/channels/instagram`. `instagram_manage_messages` icazəsi üçün Meta App Review tələb olunur (həftələr çəkə bilər); onsuz yalnız test hesabları işləyir.
13. **Outbox cron (cavabların çatdırılması):** Vercel Hobby planı cron-u gündə bir dəfə icazə verir, bu kifayət deyil. Seçimlər: Vercel Pro (hər dəqiqə cron) və ya pulsuz n8n/cron-job.org ilə hər 1 dəqiqə `POST https://<domen>/api/channels/deliver` sorğusu, başlıq `Authorization: Bearer <QEYDAI_CRM_WORKER_KEY>`.

## E. Etibarlılıq və hüquq
14. **Neon planı:** layihənin tarix saxlama müddəti 6 saatdır (`history_retention_seconds: 21600`). Real müştəri məlumatı üçün Neon-da ödənişli plana keçin və point-in-time restore müddətini artırın (Neon Console → Settings → Storage).
15. **Monitorinq:** UptimeRobot və ya Better Stack-də `https://<domen>/api/health` üçün 1–5 dəqiqəlik yoxlama qurun.
16. **Hüquqi baxış:** məxfilik siyasəti və istifadə şərtləri mən yazdığım ilkin mətnlərdir. Şirkət rekvizitləri (VÖEN, ünvan), saxlama müddəti və məlumat subyektinin hüquqları üçün hüquqşünasa göstərin. Məxfilik siyasəti AI provayderlərini (Groq, NVIDIA), Vercel və Neon-u artıq göstərir.
17. **Təmizlik:** Neon-da test branch-ı `rehearsal-0006-2026-11-22` silin (parolu söhbətdə göründüyü üçün). Neon Console → Branches.
18. **Müştəri iş sahələri:** hər yeni biznes üçün iş sahəsi və sahib açarı yaratmaq indi `QEYDAI_ADMIN_KEYS` ilə əl ilə edilir. Avtomatik qeydiyyat axını hələ yoxdur.

## Bilinən məhdudiyyətlər
- Kommo kimi WhatsApp yayını, AI copilot və vizual Salesbot qurucusu hələ yoxdur; sayt bunları "Hazırlanır" kimi göstərir.
- Naməlum `/features/...` və `/scenarios/...` ünvanları standart ingilis 404 mətni göstərir (noindex ilə); lokallaşdırma yoxlanıldı, bu Next sazlamasında işləmədi.
- `npm run test:pg` Neon-a bu konteynerdən işləmədi (portlar bağlıdır); Neon-da yalnız SQL yoxlamaları (RLS, imtiyazlar) aparılıb. Lokal PostgreSQL 16-da 22 PG testi keçir.

## F. Google və Facebook ilə giriş / hesab yaratma (kod hazırdır, açarlar sizdən)
Kod işləyir (hər kəs Google/Facebook ilə girib öz biznes hesabını yarada bilir). Düymələr yalnız aşağıdakı açarlar Vercel-ə qoyulanda görünür.
Əvvəl bir dəfə: migrasiya `0007_panel_accounts.sql` Neon production-a tətbiq olunmalıdır (mən tətbiq edirəm, sizin "bəli"nizlə).

19. **Google:** https://console.cloud.google.com → yeni layihə → APIs & Services → OAuth consent screen (External, tətbiq adı, dəstək e-poçtu) → Credentials → Create credentials → OAuth client ID → "Web application".
    - Authorized redirect URI: `https://panelim.az/api/auth/oauth/google/callback`
    - Çıxan **Client ID** və **Client secret**-i Vercel-də `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` kimi əlavə edin.
    - Consent screen-i "In production"-a keçirin, yoxsa yalnız test istifadəçiləri girə bilər.
20. **Facebook:** https://developers.facebook.com → Create App → "Authenticate and request data from users with Facebook Login" → Facebook Login → Settings.
    - Valid OAuth Redirect URIs: `https://panelim.az/api/auth/oauth/facebook/callback`
    - App Settings → Basic: **App ID** → `FACEBOOK_APP_ID`, **App Secret** → `FACEBOOK_APP_SECRET`.
    - Privacy Policy URL: `https://panelim.az/az/legal/privacy`. Tətbiqi "Live" rejiminə keçirin.
    - `email` və `public_profile` icazələri standartdır (əlavə review tələb etmir).
21. Dəyişənlər əlavə olunandan sonra saytı yenidən deploy edin (düymələr build zamanı oxunur).
22. **Sui-istifadədən qorunma:** hər yeni Google/Facebook hesabı avtomatik yeni biznes hesabı yaradır. Sorğu limiti var (IP başına dəqiqədə 20 geri çağırış), amma çoxlu saxta hesabları izləmək üçün Neon-da `panel_accounts` cədvəlinə vaxtaşırı baxın.

## G. E-poçtla giriş / hesab yaratma (kod hazırdır, e-poçt xidməti sizdən)
Müştəri e-poçtunu yazır, poçta 15 dəqiqəlik birdəfəlik link gəlir, linkə basanda hesab yaranır və daxil olur. Forma yalnız aşağıdakı iki dəyişən qoyulanda görünür.
Migrasiya `0007_panel_accounts.sql` (Google/Facebook ilə eyni) bu üçün də lazımdır.

23. **Resend hesabı:** https://resend.com → qeydiyyat → API Keys → Create API Key (Sending access). Açarı Vercel-də `RESEND_API_KEY` kimi əlavə edin. (Köhnə `panelim` tətbiqində `RESEND_API_KEY` adlı dəyişən var idi; `panelim-az` layihəsində artıq mövcuddursa eyni açarı istifadə edə bilərsiniz, yalnız domenin təsdiqli olduğunu yoxlayın.)
24. **Domeni təsdiqləyin:** Resend → Domains → Add Domain → `panelim.az`. Resend göstərən SPF/DKIM DNS qeydlərini domenin DNS panelində əlavə edin (domen Cloudflare-dədir, nameserver-lər `*.ns.cloudflare.com`). Təsdiq olmadan e-poçtlar spam-a düşür və ya göndərilmir.
25. **Göndərən ünvan:** Vercel-də `EMAIL_FROM` = `panelim.az <noreply@panelim.az>`.
26. Dəyişənlər əlavə olunandan sonra yenidən deploy edin. Yoxlama: login səhifəsində öz e-poçtunuzu yazıb linkin gəldiyini görün.

Bilməli olduğunuz: eyni e-poçtla Google və e-poçt link ayrı hesablar sayılır (təhlükəsizlik üçün avtomatik birləşdirmə yoxdur). Sorğu limiti yaddaşdadır və hər serverə görə ayrıdır; ciddi sui-istifadə olarsa Neon-da ortaq limit əlavə edərik.
