# Panelim.az — Yol xəritəsi

## Mərhələ 2A — Təmizlik + Yeni Qiymət (icra tamamlandı)
- [x] Layihə yaddaşı və qaydaları yaradıldı.
- [x] İcazəli test artefaktları silindi, .gitignore yeniləndi.
- [x] Təsdiqlənmiş UI hissələrində dondurulmuş funksiyalar gizlədildi.
- [x] Üç yeni paket, müqayisə cədvəli, SEO qiymətləri və panel aktivləşdirməsi uyğunlaşdırıldı.
- [ ] Texniki buraxılış təsdiqi: əvvəlki CI kataloq testində dayanıb; yeni commit üçün build və CI təsdiqi tələb olunur. Test və kataloq cari altı fayllıq icazə xaricindədir.
- AuthSplitClient.tsx hədəf branch-də istifadəsizliyi təsdiqlənmədiyi üçün qorunur.

## Mərhələ 2B — Pani AI + WhatsApp düzəlişi (tamamlandı)
- [x] Pani AI-də operatora keçid və Groq xəta mesajları tətbiq edildi.
- [x] Yeni biznes hesablarında Pani AI standart olaraq aktivdir və Azərbaycan dilində salon təlimatı ilə başlayır.
- [x] Meta məlumatlarının yoxlanması, deaktiv kanalın üstünlüyü, təkrar göndərişdən qorunma və panel xəbərdarlıqları tətbiq edildi.
- [x] Paketlər üçün WhatsApp icazələri və dəyərsiz mühit dəyişənləri təsdiqləndi.
- [x] PostgreSQL-də təkrar sorğular, paralel qoşulma, operator müdaxiləsi və tenant izolyasiyası sınaqdan keçirildi.

## Mərhələ 3 — Yayıma hazırlıq və pre-push yoxlaması
- [x] `feat/panelim-subpages` mənbə faylları və onun Git tarixçəsi məxfi açarlar üçün yoxlanıldı; real API açarı aşkarlanmadı.
- [x] `.env` fayllarının ignore qorunması və Git-də yalnız `.env.example` izlənməsi təsdiqləndi.
- [x] Production build və daxilindəki TypeScript yoxlaması keçdi; lint 0 xəta/4 xəbərdarlıq, 341 test uğurlu.
- [x] `proje/YAYIM-YOXLAMASI.md` yaradıldı: beş canlı yoxlama və 11 əsas dəyişən göstərildi. Nümunə faylında ümumilikdə 44 dəyişən var.
- [x] Yoxlanmış mənbədən təmiz `main` yaradıldı və GitHub-a göndərildi; `wip/local-latest-2026-11-26` dəyişməz saxlanıldı.
- [x] Kod commit-i `45ebd4e8` üçün GitHub CI #242-də PostgreSQL və bütün Playwright mərhələləri daxil tam yoxlamalar keçib: https://github.com/azadhashimoc-debug/qeydai/actions/runs/46123962728. Lokal 29 PostgreSQL testi bağlantı olmadığı üçün buraxılıb; lokal Playwright icra edilməyib. Sənəd commit-inin yeni CI nəticəsi ayrıca izlənilir.
- [ ] Hosting production branch-i `main` seçilsin, 11 əsas dəyişən və əlavə hosting ayarları təsdiqlənsin.
- [ ] Canlı Meta/Groq ilə WhatsApp axını və mobil/kompüter qeydiyyat-rezervasiya sınaqları keçsin.
- [ ] Production yayımı ayrıca təsdiqlə həyata keçirilsin.

## Mərhələ 4 — İlk 3 salon satışı
- Bakıdakı gözəllik salonları və estetik mərkəzlərə demo təqdim et.
- İlk üç ödənişli salonu qoş və rəyləri qeyd et.
