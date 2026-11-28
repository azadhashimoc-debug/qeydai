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
- Yeni hesab üçün standart aktivləşdirmə və salon təlimatı lokalizasiya faylına icazə verildikdən sonra birlikdə tətbiq ediləcək.
- WhatsApp qoşulanda Meta Phone Number ID və token yoxlanır. Deaktiv verilənlər bazası bağlantısı köhnə mühit konfiqurasiyasından üstün tutulur.
- WhatsApp-ın 24 saatlıq pəncərəsi bitdikdə göndəriş uğursuz kimi saxlanır və paneldə tapşırıq açılır. AI sorğusu uğursuz olduqda xəta loqa yazılır və operatora tapşırıq açılır.
- Təkrar göndəriş yalnız provayderin sorğunu rədd etdiyi məlum olduqda mümkündür. Nəticəsi qeyri-müəyyən göndəriş avtomatik təkrar edilmir.
- Başlanğıcda kanal limiti sıfırdır. Standart və Premiumda bir WhatsApp kanalı icazəlidir. Məcburi 11 mühit dəyişəni nümunə faylında dəyərsizdir.
- Mövcud PostgreSQL testləri və müvəqqəti bazada Groq və Meta cavabları simulyasiya edilən Mərhələ 2B yoxlamaları keçdi. Canlı staging mesajlaşması buraxılış yoxlamasında açıqdır.
