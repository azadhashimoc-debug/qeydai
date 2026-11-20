# Qeydai pilot yayını uygulama planı

> **Uygulayıcı ajanlar:** Görevleri sırayla yürütmek için `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans` kullanın.

**Durum:** Revize taslak; yürütme onayı yok.

**Hedef:** Demo, iletişim ve pilot kayıt başvurularını panel CRM’ine ulaştırmak; çalışmayan kontrolleri koruyan düzeltmeler önermek ve VPS yayın kararını kanıta bağlamak.

**Mimari:** Mevcut `/api/lead` girişini ve CRM `upsertLead` yolunu kullanın. AZ/EN metinleri sözlüklerde tutun. Yerel kalite kapıları ile staging kabulünü ayrı yürütün.

**Teknoloji:** Next.js 16.4.6 App Router, TypeScript, SQLite, Vitest, Playwright, kalıcı diskli VPS.

**Tasarım:** [Dürüst B2B Pilot Yayını](../specs/2026-11-19-honest-pilot-release-design.md).

## Sınırlar

- Frontend ajanı yalnızca inceleme ve düzeltme önerisi yapar. Çalışmayan işlevleri kaldırmaz, gizlemez veya değiştirmez. Bu kural, önceki tasarımın kaldırma kararlarının yerine geçer. OAuth, Passkey, kartla ödeme ve çok kullanıcılı giriş için de bu aşamada uygulama yapılmaz.
- Mevcut çalışma ağacı değişikliklerini koruyun. Bağımlılıkları doğrulamadan panel dosyalarını tek başına commit etmeyin.
- Kod yazmadan önce ilgili yerel Next.js kılavuzunu okuyun. Gizli değerleri log, test çıktısı veya commit’e koymayın.
- Kurulum, uzak ortama dağıtım ve canlı yayın bu planla yetkilendirilmez.

## İnceleme odağı

- CRM yazımı başarısızken başarı gösterilmemesi: görev 2.
- Yanlış kiracıya başvuru düşmemesi: görev 2.
- Geçersiz telefon için başarı metni gösterilmemesi: görev 3.
- Dil değişiminden sonra yanlış fiyat veya boşa çıkan bağlantı: görev 4.
- VPS yeniden başlatmasından sonra başvurunun kaybolmaması: görev 6.

## 1. Tabanı sabitle — `code-reviewer`

- [ ] `git status --short`, `git diff --stat` ve `git diff --cached --stat` ile mevcut değişiklikleri ayırın. Panelin ve Playwright paketinin bağımlılıklarını listeleyin. Üretilmiş raporları ve ilgisiz dosyaları dışarıda bırakın.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npx vitest run` çalıştırıp güncel başarısızlıkları kaydedin. Son bilinen Playwright sonucu 78/78; bu, yeni kabul testlerinin yerine geçmez.

## 2. Başvuruyu CRM’e bağla — `fullstack-developer`

**Dosyalar:** `src/app/api/lead/route.ts`, `src/app/api/lead/route.test.ts`, `tests/e2e/subpages.spec.ts`. Mevcut CRM yazıcısı: `src/lib/crm/store.ts`.

- [ ] Testte geçerli bir başvuru gönderin; JSONL kaydı ve hedef kiracının CRM kaydında aynı normalize telefon ile `source: "web"` bekleyin. Diğer kiracıda kayıt olmadığını doğrulayın. CRM yazma hatasında başarı yanıtı gelmemesini ayrı test edin.
- [ ] `npx vitest run src/app/api/lead/route.test.ts` ile eksik CRM davranışını doğrulayın.
- [ ] `POST /api/lead` içinde doğrulamadan sonra mevcut `upsertLead` çağrısını bağlayın. Kiracı önceliği: `QEYDAI_PUBLIC_LEAD_TENANT`, ardından `QEYDAI_ADMIN_KEYS`, ardından `QEYDAI_API_KEYS`, son olarak `center_001`. Production build aşamasında CRM yazmayın. JSONL ve SQLite arasında atomiklik varsaymayın; kısmi yazım ve yeniden gönderim davranışını test edin.
- [ ] Odaklı testleri tekrar çalıştırın. Üç formun uçtan uca kapsamı görev 3’te tamamlanır.

## 3. Giriş ve başvuru arayüzü için düzeltme öner — `frontend-developer`

**Dosyalar:** `src/components/marketing/AuthKommoClient.tsx`, `src/components/marketing/AuthKommoRegisterClient.tsx`, `src/app/[lang]/demo/page.tsx`, `src/app/[lang]/contact/page.tsx`, `tests/e2e/subpages.spec.ts`, `src/app/[lang]/dictionaries/subpages-{az,en}.json`.

- [ ] Demo, iletişim ve kayıt sayfalarından ayrı geçerli başvurular gönderin. Panelde her başvuruyu kendi telefonuyla bulun. Geçersiz telefonda hata metnini ve yeni CRM kaydı olmadığını doğrulayın. AZ ve EN’de giriş ekranının yalnızca workspace access key sunduğunu doğrulayın.
- [ ] Mevcut production build ile odaklı testlerin değişiklik öncesi eksik akışlarda başarısız olduğunu doğrulayın.
- [ ] Google, Facebook, Passkey, pilot kayıt ve form hata metinlerini salt okunur inceleyin. Her işlev için kök neden, önerilen düzeltme, bağımlılıklar ve kabul testi sunun. Test ve kod dosyalarını değiştirmeyin. Uygulama için ayrı onay bekleyin.

## 4. Fiyat ve entegrasyon vaatlerini hizala — `frontend-developer`

**Dosyalar:** `src/components/panel/{PlansTab,ChannelsTab,AiTab}.tsx`, `src/app/[lang]/pricing/page.tsx`, AZ/EN sözlükleri, `tests/e2e/panel.spec.ts`.

- [ ] Testte `/pricing`, ana sayfa ve panel fiyatlarını karşılaştırın: aylık 100/160/240, 6 aylık 90/145/215, yıllık 80/130/190 AZN. İki dilde plan bağlantısı `/${lang}#contact` hedefini kullanmalı.
- [ ] Webhook kopyalamada panoya beklenen URL’nin yazıldığını ve dildeki onay metnini doğrulayın. AI önizlemede `aria-expanded` açılıp kapanmalı. Sahte etkinleştirme düğmeleri görünmemeli.
- [ ] Fiyat farklarını ve çalışmayan kanal/AI kontrollerini belgeleyin. Kontrolleri koruyan düzeltme seçeneklerini, her seçeneğin bağımlılıklarını ve kabul testlerini önerin. Kod ve test dosyalarını değiştirmeyin; uygulama için ayrı onay bekleyin.

## 5. Kalite kapıları ve bağımsız inceleme — `test-engineer`, `code-reviewer`, `security-auditor`

- [ ] `src/app/[lang]/i18n-guard.test.ts` bulgularındaki metinleri sözlüklere taşıyın. Lead ve analytics testlerinde `TRUST_PROXY` varsayımını açıkça ayarlayın; production ayarını test uğruna gevşetmeyin. `DealDetail`, `KanbanBoard`, `AiTab` ve `ChannelsTab` lint bulgularını düzeltin.
- [ ] Sırayla `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `npx playwright test --workers=3 --reporter=list,html` çalıştırın. Her komutun çıkış kodunu kaydedin. Yerel demo sunucusu kullanımdaysa build sonrası yeniden başlatın ve CSS isteğinin `200` döndüğünü doğrulayın.
- [ ] `code-reviewer` kapsam ve regresyonları; `security-auditor` çerez, kiracı sınırı ve production ayarlarını savunma odaklı incelesin. Aktif saldırı testi yapmayın. Açık yayın engeli varken yayın önermeyin.

## 6. VPS kabulü ve yayın kararı — `qa-expert`

- [ ] Staging erişimi ve dağıtım onayından sonra SQLite ve JSONL yollarının kalıcı diskte ve servis hesabına yazılabilir olduğunu doğrulayın. Yedek ve geri yüklemeyi ayrı test alanında deneyin.
- [ ] Sentetik başvuru gönderin, CRM’de görünmesini doğrulayın. Servisi yeniden başlatın ve aynı kaydı tekrar bulun. HTTPS üzerinde giriş, yenileme, çıkış, geçersiz slug ve CSS kontrollerini çalıştırın.
- [ ] Sonuçları komut, çıkış kodu ve kanıt yolu ile `.studio/log.md` içine yazın. Yayın şartı: bütün yerel kapılar yeşil, staging kabulü başarılı, açık yayın engeli yok ve geri dönüş denenmiş. Canlı dağıtım ayrı onay ister.

## Yürütme sırası

Görev 1 önce gelir. Görev 2 ve görev 4, dosya kapsamları ayrılarak paralel yürütülebilir. Görev 3, görev 2’nin API akışını kullanır. Görev 5, birleşen değişiklikleri inceler. Görev 6 en son çalışır. Her kabul edilen görev için commit kapsamını ayrı belirleyin; onaylanmamış veya ilgisiz değişiklikleri eklemeyin.
