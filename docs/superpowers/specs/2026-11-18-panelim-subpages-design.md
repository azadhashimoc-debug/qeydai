# Panelim.az Alt Sayfalar ve Kanal Mimarisi Tasarım Dokümanı

**Tarih:** 2026-11-18  
**Durum:** Nihai taslak — onay bekliyor  
**Hedef Ürün:** `panelim.az` (QeydAI — Next.js 16.4.6, App Router, AZ/EN)

## 1. Amaç ve Neden

`panelim.az` ana sayfası (`src/app/[lang]/page.tsx`) şu anda tek sayfa (landing) ve `/[lang]/panel` CRM çalışma alanından oluşmaktadır. Sağlanan 60 ekranlık tasarım referans paketi (`panelim-dizayn-istinadlari.zip`, Kommo TR düzen örüntüleri) doğrultusunda, ziyaretçilerin ürünü, desteklenen mesajlaşma kanallarını, ücretsiz WhatsApp araçlarını, şeffaf fiyatlandırmayı ve kullanım senaryolarını derinlemesine inceleyebileceği özgün alt sayfalar kurulacaktır.

## 2. Hedefler, Kapsam Dışı ve Anti-Hedefler

### Hedefler
- `panelim.az` marka kimliğini (`#F8F9FF` açık tuval, `#0E0142` derin indigo, `#3046E8` kobalt vurgu, `#137547` nane-zümrüt, `Plus Jakarta Sans` + `Inter`) koruyarak çok sayfalı SaaS yapısına geçmek.
- Ürün özelliklerini, gerçekçi kanal entegrasyonlarını, çalışan ücretsiz araçları ve şeffaf fiyat matrisini sunmak.
- Bütün sayfalarda tam AZ/EN çift dil desteği (`src/app/[lang]/dictionaries/{az,en}.json`) ve `i18n-guard.test.ts` / `dictionaries.test.ts` uyumu sağlamak.
- Tüm görsellerde sıkıcı kurumsal ofis fotoğrafları yerine renkli, özgün 3D SaaS stüdyo illüstrasyonları (`public/images/p-*.webp`) ve canlı kodlanmış UI önizleme bileşenleri kullanmak.

### Kapsam Dışı ve Anti-Hedefler (Kesin Sınırlar)
- **İş Ortağı / Müşteri İddiası Yok:** Panelim.az'ın henüz iş ortağı kurumları veya yayınlanacak müşteri referansları bulunmadığından partner kataloğu, müşteri logoları, başarı hikayeleri, alıntı/yorum blokları ve `Meta Business Partner` benzeri rozetler **eklenmeyecektir**.
- **Hayali Entegrasyon Yok:** Kod tabanında yer almayan 3. parti uygulamalar (Shopify, PayPal, Lazada, Jotform, forms.app, Slack, Chatfuel, TikTok) için ayrı entegrasyon sayfaları **oluşturulmayacaktır**.
- **Rakip Kopyası Yok:** Kommo maskotları, görselleri veya birebir metinleri kopyalanmayacak; yalnızca sayfa düzeni ritmi ve bilgi mimarisi referans alınacaktır.
- **Mevcut Ana Sayfa/Panel Kırılmayacak:** `/[lang]/panel` ve `/api/*` uç noktalarının çalışma ve güvenlik sözleşmeleri değişmeyecektir.

## 3. Teknik Kısıtlar

- **Next.js 16.4.6 (`cacheComponents: true`, `globalNotFound: true`):** Sunucu bileşenlerinde render sırasında `Date.now()` gibi deterministik olmayan çağrılar kullanılmayacaktır; yeni sayfalar `generateStaticParams` ile statik/prerender uyumlu olacaktır.
- **Yönlendirme ve Güvenlik:** Mevcut `[lang]` dinamik segmenti korunur (`az`, `en`). Bilinmeyen slug değerleri `notFound()` döner. Dış bağlantılar ve QR/Link oluşturucular XSS/protocol injection (`javascript:` vb.) korumalı olacaktır.
- **Harici Paket Kısıtı:** Ekstra ağır bağımlılık yerine özelleştirilebilir, sıfır-bağımlılıklı veya hafif bileşenler tercih edilir (WhatsApp QR kodu doğrudan deterministik SVG matris veya hafif saf JS QR üretici ile tarayıcıda üretilir).

## 4. Değerlendirilen Yaklaşımlar ve Seçilen Yol

1. **Yaklaşım 1 — Gerçek Ürün + 3 Aktif Kanal + Ücretsiz Araçlar (SEÇİLDİ):**
   - Çekirdek ürün sayfaları (`/product`, `/pipeline`, `/inbox`, `/ai`, `/booking`), gerçek kanal sayfaları (`/channels` + `/channels/[slug]`: WhatsApp, Instagram, Telegram, Webhook/n8n API), çalışan ücretsiz araçlar (`/tools`), örnek sektör senaryosu (`/scenarios/fitness-centers` — açıkça "örnek senaryo" etiketli), AI/CRM rehberleri (`/blog`, `/blog/[slug]`), fiyat matrisi (`/pricing`), demo/iletişim (`/demo`, `/contact`) ve yasal metinler (`/legal/terms`, `/legal/privacy`).
   - *Neden seçildi:* 60 ekran referansındaki tüm gerçekçi SaaS değerini kapsar, hayali entegrasyon/partner uydurmaz ve kullanıcı tarafından onaylanmıştır.
2. **Yaklaşım 2 — Sadece 10 Çekirdek Sayfa (Elendi):**
   - Araçlar, blog ve sektör senaryosunu Faz-2'ye bırakır; paketin dönüşüm ve SEO değerini düşürür.
3. **Yaklaşım 3 — 60 Ekranın Birebir Üretimi (Elendi):**
   - QeydAI'de bulunmayan Shopify/PayPal/Lazada/Chatfuel sayfalarını ve sahte partner bloklarını gerektirir; anti-hedeflerle çelişir.

## 5. Bilgi Mimarisi ve Sayfa Haritası (`/[lang]/...`)

| Rota | Amaç | Referans Ekranlar | Görsel (`public/images/`) |
|---|---|---|---|
| `/[lang]/product` | Ürün genel bakışı + modül bağlantıları | `008-urun-incelemesi` | `p-product-tour.webp` |
| `/[lang]/pipeline` | Kanban satış hunisi + liste görünümü + filtreler | `009-crm-pipeline` | `p-pipeline.webp` |
| `/[lang]/inbox` | Birleşik gelen kutusu + atama + şablonlar | `010-birlesik-gelen-kutusu` | `p-inbox.webp` |
| `/[lang]/ai` | AI Asistan, 4 yanıt senaryosu ve webhook/n8n otomasyonu | `011`, `012`, `020`, `021` | `p-ai-copilot.webp`, `p-salesbot.webp` |
| `/[lang]/booking` | AI destekli deneme dersi / randevu ve kontenjan kilidi | `014-randevu` | `p-booking.webp` |
| `/[lang]/channels` | Tüm kanallar merkezi + API/n8n özeti | `015`–`019`, `051` | `p-channels.webp` |
| `/[lang]/channels/[slug]` | `whatsapp`, `instagram`, `telegram`, `webhook-api` detay sayfaları | `013`, `015`, `016`, `051`, `055`–`060` | `p-whatsapp.webp`, `p-instagram.webp`, `p-telegram.webp` |
| `/[lang]/tools` | Ücretsiz araçlar: WA Link (`wa.me`), WA QR indirici (SVG/PNG), WA Maliyet Hesaplayıcısı | `022`, `053`, `054` | `p-tools.webp` |
| `/[lang]/scenarios/fitness-centers` | Örnek sektör senaryosu (açık "Örnek Senaryo" etiketiyle) | `001-fitness-salonlari` | `p-fitness.webp` |
| `/[lang]/blog` & `/blog/[slug]` | 5–6 odak rehber (WhatsApp otomasyonu, Flows, Instagram DM, Randevu CRM, AI Copilot) | `023`–`041` | `p-blog-1.webp`, `p-blog-2.webp`, `p-cases.webp` |
| `/[lang]/pricing` | Dönem seçicili plan kartları + açılır özellik karşılaştırma matrisi + SSS | `002-fiyat-karsilastirma` | `p-demo.webp` |
| `/[lang]/demo` & `/contact` | Özel demo ve destek iletişim formu (`/api/lead` entegreli) | `006-demo-al`, `007-bize-ulasin` | `p-demo.webp` |
| `/[lang]/login` & `/register` | Ayrı marka giriş ekranı (`/api/panel/auth` -> `/[lang]/panel`) ve kayıt/başvuru ekranı (`/api/lead` entegreli) | `giris`, `qeydiyyat` | `p-product-tour.webp`, `p-demo.webp` |
| `/[lang]/legal/terms` & `/privacy` | Kullanım koşulları ve gizlilik politikası | `004`, `005` | — |

## 6. Paylaşılan Bileşen ve Tasarım Sistemi

- **`SiteHeader`:** Sticky cam efektli üst bar; açılır/grup menülü "Ürün" (Genel Bakış, Pipeline, Gelen Kutusu, AI & Bot, Randevu), "Kanallar & Araçlar" (WhatsApp, Instagram, Telegram, Webhook/API, Ücretsiz Araçlar), "Fiyatlandırma", "Rehberler" (Blog, Fitness Senaryosu), sağda Dil Değiştirici (`AZ`/`EN`), `Panel`, `Demo al` CTA'sı ve mobil çekmece (`MobileNavDrawer`).
  - *Ana sayfa (`/[lang]/page.tsx`) kararı:* Mevcut ana sayfa üst çubuğundaki `#how` / `#features` / `#ai` / `#pricing` / `#faq` çapa bağlantıları, `CTA_LOCATIONS` analitik sözleşmeleri ve `tests/e2e/landing.spec.ts` korunur; yanına alt sayfa keşif bağlantıları ("Alt Sayfalar" / `/product`, `/channels`, `/tools`, `/pricing`, `/blog`) eklenir ve footer yeni `SiteFooter` ile birleştirilir.
- **`SiteFooter`:** 4 kolonlu koyu/açık çerçeveli footer (Ürün, Kanallar & Araçlar, Kaynaklar, İletişim & Yasal); hiçbir partner rozeti içermez.
- **`SubpageHero`:** Solda etiket + H1 + açıklama + birincil/ikincil CTA, sağda renkli 3D görsel kartı (`Photo`) veya interaktif mini UI kartı.
- **`FeatureAlternating` & `FeatureGrid`:** 2 kolonlu sırayla değişen görsel + metin blokları ve pastel kartlı 4/6'lı özellik ızgaraları.
- **`BottomCtaBand`:** `#0E0142` derin indigo zeminli dönüşüm bandı ("14 gün ücretsiz dene" / "Demo al").
- **Görsel Kuralı (`assets/site-vibrant` -> `public/images/p-*.webp`):** Tüm 16 alt sayfa görseli parlak pastel-gradient stüdyo zeminli 3D SaaS tarzında (`1376x768 WEBP`) üretilmiştir (`p-ai-copilot`, `p-blog-1`, `p-blog-2`, `p-booking`, `p-cases`, `p-channels`, `p-demo`, `p-fitness`, `p-inbox`, `p-instagram`, `p-pipeline`, `p-product-tour`, `p-salesbot`, `p-telegram`, `p-tools`, `p-whatsapp`).

## 7. Etkileşimli Araçlar, Kapsam Sınırı ve Veri Akışı

- **Ürün Kapsamı ve Doğruluk Sınırı:**
  - Sayfalarda yalnızca kodda bulunan yetenekler anlatılır: Birleşik Gelen Kutusu (`/inbox`), Kanban Pipeline (`/pipeline`), Deneme Dersi ve Kontenjan Kilidi (`/booking`), AI Yanıt/Asistan 4 senaryo modülü ve kural tabanlı yanıt/n8n otomasyon akışı (`/ai`), WhatsApp Cloud API metin mesajlaşması, Instagram DM, Telegram Bot ve REST Webhook API (`/api/v1/*`).
  - Arayüzde **"Pilot" veya "Yakında" etiketi kullanılmaz**; olmayan sürükle-bırak editörler veya Meta Flows karuselleri yerine mevcut çalışan akışlar (webhook kurulumu, AI yanıt senaryoları, mesaj şablonu ve ekip atama) net şekilde gösterilir.
- **Fiyat Karşılaştırma Matrisi (`/[lang]/pricing`):**
  - `az.json` / `en.json` içindeki mevcut 4 plan (`Starter` 90 AZN, `Growth` 140 AZN, `Pro` 220 AZN, `Enterprise` 390 AZN) ve mevcut gerçek panel kabiliyetleri temel alınır; uydurma API/SLA/mesaj kotaları yazılmaz.
- **`/tools` (Client-Side, API Gerektirmez):**
  - **WhatsApp Link Oluşturucu:** Ülke kodu (`+994` varsayılan) + numara + ön tanımlı mesaj ile anlık `https://wa.me/...` üretimi, tek tıkla kopyalama ve önizleme balonu.
  - **WhatsApp QR Oluşturucu:** Üretilen link veya özel URL için anlık tarayıcıda QR SVG çizimi + SVG/PNG indirme butonu (yalnızca `https://` veya `http://` kabul edilir).
  - **WhatsApp Ücret Hesaplayıcısı:** Meta'nın güncel mesaj bazlı tarifesi (24 saatlik müşteri hizmeti penceresi ücretsiz; Pazarlama / Hizmet / Doğrulama şablon mesajları için varsayılan tahmini USD tarifesi ve `1.70 AZN` opsiyonel dönüşüm) üzerinden hesaplar; arayüzde **"Meta resmi tarifesine göre tahmini hesaplama"** uyarısı gösterilir.
- **`/demo` ve `/contact`:** Mevcut `LeadForm` bileşeni ve `/api/lead` POST (`{ name, phone }`) sözleşmesi değiştirilmez; sayfa kaynağı (`/demo`, `/contact`) mevcut `/api/analytics` izleme olayları üzerinden kaydedilir.
- **`/legal/terms` ve `/legal/privacy`:** Henüz resmi şirket unvanı veya VÖEN bulunmadığından uydurma tüzel kişilik/vergi bilgisi yazılmaz; yalnızca `panelim.az` hizmet koşulları, mesaj/lead verisi işleme esasları ve tek iletişim kanalı olarak `/[lang]/contact` formu belirtilir.
- **SEO & Keşif:** `src/app/sitemap.ts` tüm yeni statik ve dinamik `[lang]` rotalarını `az`/`en` `alternates` ile içerecek şekilde genişletilir.

## 8. Yapıcıya Kalan Detaylar (Karar Notları)

- `src/app/[lang]/page.tsx` üzerindeki `pm-outcomes` bölümü (3 alıntı kartı) mevcut ana sayfa testleri kırılmadan korunabilir veya kullanıcı isterse ürün çıktı kartlarına dönüştürülebilir.
- QR üretimi için sıfır ağ bağımlılıklı hafif standart `qrcode` paketi veya saf TypeScript QR SVG üreticisi planlama aşamasında seçilebilir (`qrcode` TypeScript tipleriyle `canvas`/SVG üretir, tarayıcıda çevrimdışı çalışır).
- Yeni alt sayfa sözlükleri `az.json` ve `en.json` içine eklenirse `i18n-guard.test.ts` ve `dictionaries.test.ts` tüm anahtarları otomatik doğrular.

## 9. Doğrulama Planı

1. Tüm 16 `p-*.webp` görselinin `Read` ile görsel kontrolü ve `public/images/` dönüşümü.
2. `npm run lint` ve TypeScript tip kontrolü (`npx tsc --noEmit`).
3. `npm test` (Vitest: `dictionaries.test.ts`, `i18n-guard.test.ts` ve yeni araç hesaplama/link doğrulama testleri).
4. `npm run build` (`cacheComponents: true` altında tüm yeni rotaların hatasız prerender edilmesi).
5. `playwright` ile mobil (`390px`) ve masaüstü (`1280px`) kırılma/taşma ve araç etkileşim kontrolü.
