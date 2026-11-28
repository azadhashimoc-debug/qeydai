# Panelim.az — Qərarlar

## 2026-11-28 — Mərhələ 2A planı təsdiqləndi
- Məhsul: Panelim.az; ilk niş Bakıdakı gözəllik salonları və estetik mərkəzlər.
- Aktiv istiqamət: müştəri bazası, rezervasiya, işçi idarəetməsi, Pani AI (Groq), tək hesablı WhatsApp.
- Dondurulmuş inteqrasiyalar UI-dən gizlədilir; backend məntiqi saxlanılır.
- Qiymətlər: Başlanğıc 99/49, Standart 199/99, Premium 349/175 AZN (aylıq/ilk ay).
- Standart tövsiyə olunan paketdir.
- Paycell əvəzinə əl ilə əlaqə vasitəsilə aktivləşdirmə nəzərdə tutulur; biznes nömrəsi uydurulmur.
- Yalnız feat/panelim-subpages branch-i və təsdiqlənmiş fayl/sətir sərhədləri istifadə olunur.
- Mərhələ 2B, 3 və 4 ayrıca təsdiq tələb edir.
- Build nəticəsi faktiki yoxlama olmadan uğurlu sayılmır.

## 2026-11-28 — Mərhələ 2A checkpoint
- Altı icazəli fayl üzrə son beş detalın kod və sənədləşdirmə icrası tamamlandı.
- Kanal səhifəsinin aktiv kartları yalnız WhatsApp və Pani AI-dır.
- Qiymət müqayisəsi, SEO və panel tarifləri: 99/49, 199/99, 349/175 AZN (aylıq/ilk ay).
- Paycell müştəri interfeysində aktivləşdirmə axınından çıxarılıb. NEXT_PUBLIC_WHATSAPP_NUMBER konfiqurasiya olunubsa WhatsApp keçidi, əks halda lokal əlaqə səhifəsi istifadə olunur. Dəyər loglanmır.
- Backend ödəniş tarifləri və entitlement limitləri dəyişdirilməyib; canlı satışdan əvvəl uyğunluğu yoxlanmalıdır.
- Əvvəlki CI: TypeScript və ESLint uğurlu; src/lib/marketing/wa-tools.test.ts köhnə kanal kataloqu gözləntisində uğursuz; build icra edilməyib. Bu fayl və kataloq yeni icazə xaricindədir. Texniki buraxılış təsdiqi açıqdır.
- Mərhələ 2B başladılmayıb.

## 2026-11-28 — Mərhələ 2B checkpoint

- Eyni giriş hadisəsi üçün tək Pani AI cavabı növbəyə düşür. Operator cavabından sonra söhbətdə avtomatik cavab dayandırılır.
- Yeni biznes hesablarında Pani AI aktiv başlayır və Azərbaycan dilində standart salon təlimatından istifadə edir. Təlimat xidmət, qiymət və rezervasiya sorğularını əhatə edir. Saxlanmış hesab ayarları əməliyyatda üstün tutulur.
- Standart salon təlimatı və 24 saatlıq WhatsApp bildirişi `src/app/[lang]/dictionaries/pani-whatsapp.ts` faylında saxlanılır.
- WhatsApp qoşulanda Meta Phone Number ID və token yoxlanır. Deaktiv verilənlər bazası bağlantısı köhnə mühit konfiqurasiyasından üstün tutulur.
- WhatsApp-ın 24 saatlıq pəncərəsi bitdikdə göndəriş uğursuz kimi saxlanır və paneldə tapşırıq açılır. AI sorğusu uğursuz olduqda xəta loqa yazılır və operatora tapşırıq açılır.
- Təkrar göndəriş yalnız provayderin sorğunu rədd etdiyi məlum olduqda mümkündür. Nəticəsi qeyri-müəyyən göndəriş avtomatik təkrar edilmir.
- Başlanğıcda kanal limiti sıfırdır. Standart və Premiumda bir WhatsApp kanalı icazəlidir. Məcburi 11 mühit dəyişəni nümunə faylında dəyərsizdir.
- Mövcud PostgreSQL testləri və müvəqqəti bazada Groq və Meta cavabları simulyasiya edilən Mərhələ 2B yoxlamaları keçdi. Canlı staging mesajlaşması Mərhələ 3-ün buraxılış yoxlamasına daxildir.

## 2026-11-28 — Mərhələ 3 checkpoint

- İstifadəçi planı təsdiqlədi: pre-push təhlükəsizlik/build yoxlaması, yayım siyahısı və `feat/panelim-subpages` mənbəyindən `main` yaradılması. Tətbiq kodu dəyişdirilmədi.
- Yoxlanmış kod commit-i: `45ebd4e8c8abcb8fda08aaacff903c8b55fe5a9d`. Başlanğıcda lokal və GitHub-da `main` yoxdur. `wip/local-latest-2026-11-26` başlanğıc SHA-sı `1f35428c460daafdef1b80b39f9d67c10f401a79`-dır; həmin branch dəyişdirilmir, merge edilmir və silinmir.
- 564 mətn faylı və mənbə tarixçəsinin 1267 mətn blob-u nümunə əsaslı skan edildi; araşdırılan uyğunluqlarda real API açarı aşkarlanmadı. `.env` ailəsi ignore olunur, Git-də yalnız `.env.example` var. Məxfi dəyərlər sənədlərə və loglara köçürülmədi.
- Node.js 24: production build (TypeScript daxil) keçdi; ESLint 0 xəta/4 xəbərdarlıq; 341 test uğurlu, PostgreSQL bağlantısı olmadığı üçün 29 test buraxıldı. Lokal Playwright icra edilməyib. Kod commit-inin GitHub CI #242 yoxlamasında PostgreSQL və bütün Playwright mərhələləri uğurludur: https://github.com/azadhashimoc-debug/qeydai/actions/runs/46123962728.
- `proje/YAYIM-YOXLAMASI.md` beş canlı yoxlamanı saxlayır. `.env.example` 44 dəyişəndir; bu buraxılış üçün 11 əsas dəyişən ayrıca göstərildi. Əvvəlki “11 dəyişən” qeydi faylın ümumi sayını ifadə etmir.
- `main` yoxlanmış kod commit-indən yaradılıb GitHub-a göndərildi; sənəd yenilikləri də eyni tarixçə ilə hər iki branch-ə əlavə edilir. Hosting-də production branch seçimi ayrıca təsdiqlənməlidir. Branch push-u canlı deploy-un uğurlu olması kimi təqdim edilmir.
- Hosting dəyişənləri, canlı SSL, Groq/Meta sınaqları, migrasiya və production deployment icra edilmədi. Tam canlı yayım təsdiqi həmin yoxlamalardan asılıdır.
