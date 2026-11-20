# Yaklaşım A — Dürüst B2B Pilot Yayını Tasarımı

Tarih: 2026-11-19
Durum: Kullanıcı tarafından onaylandı (`onayliyorum uygula`)

## 1. Amaç ve Neden
Yayına çıkarken kullanıcıların tıklayıp boşa düşeceği veya yanlış yönlendirileceği hiçbir sahte buton/form bırakmamak; siteden gelen demo/iletişim/kayıt başvurularını doğrudan panel CRM veritabanına düşürmek; tüm kalite kapılarını (`lint`, `tsc --noEmit`, `vitest`, `next build`, `playwright e2e`) yeşile çıkarmak.

## 2. Seçilen Yaklaşım (Yaklaşım A)
- **Yaklaşım A (Seçilen — Dürüst B2B Pilot Yayını):** Kırık veri akışlarını gerçek backend'e bağla, yanıltıcı/sahte UI kontrollerini kaldır veya dürüst kurulum görünümüne çevir, fiyat/hata mesajı çelişkilerini ve test/lint engellerini gider.
- **Yaklaşım B (Elendi):** Tam self-servis SaaS (Google OAuth, WebAuthn, kartlı ödeme ağ geçidi, çok kullanıcılı davet/şifre sistemi) ilk pilot yayını için gereksiz büyük kapsam.

## 3. Kapsam ve Tasarım Kararları
1. **Giriş & Kayıt (`/login`, `/register`):**
   - `AuthKommoClient` ve `AuthKommoRegisterClient` içinden çalışmayan Google, Facebook ve Passkey butonları kaldırılır.
   - Giriş ekranı net olarak **İş sahəsi açarı (Workspace access key)** ile çalışır; erişilebilirlik ve E2E uyumu korunur.
   - `/register` sayfası dürüst pilot/iş sahası başvurusu olarak çalışır ve başvuruyu `/api/lead` üzerinden hem `leads.jsonl` dosyasına hem de panel CRM veritabanına yazar.
2. **Public Lead Form → Panel CRM Bağlantısı (`POST /api/lead`):**
   - `POST /api/lead` doğrulanan başvuruyu `LEADS_FILE` yanında pilot kiracısının (`QEYDAI_PUBLIC_LEAD_TENANT`, yoksa `QEYDAI_ADMIN_KEYS` / `QEYDAI_API_KEYS` içindeki ilk kiracı veya `"center_001"`) SQLite `leads` tablosuna `source: "web"` olarak `upsertLead` ile kaydeder (`NEXT_PHASE === "phase-production-build"` dışındaki çalışma zamanlarında).
3. **Demo & Contact Yanlış Hata Mesajı (`/demo`, `/contact`):**
   - `demo/page.tsx` ve `contact/page.tsx` içinde `errText={form.successBody}` yerine sözlükteki telefon hata mesajı (`form.invalidPhone`) geçirilir.
4. **Planlar ve Fiyat Tutarlılığı (`PlansTab.tsx`, `/pricing`):**
   - `PlansTab.tsx` içindeki etkisiz `<button>` öğeleri `/${lang}#contact` adresine giden `<a href={...}>` bağlantılarına dönüştürülür.
   - `/pricing` sayfasındaki 59/99/169 AZN fiyatları ana sayfa ve panel ile tutarlı pilot fiyatlarına (100/160/240 AZN aylık, 90/145/215 AZN 6 aylık, 80/130/190 AZN yıllık) çekilir ve sabit kodlanmış Azerbaycanca metinler sözlüğe taşınır.
5. **Kanallar & AI Sekmeleri (`ChannelsTab.tsx`, `AiTab.tsx`):**
   - Kalıcı olmayan yerel `useState` "Qoş/Bağlantını kəs" ve "AI cavabı aktivdir" kontrolleri kaldırılır; webhook kopyalama (`Copy webhook` -> `Webhook copied.`) ve AI senaryo önizleme (`Preview` / `Close`) akışları sözlük tabanlı ve E2E testleriyle tam uyumlu hale getirilir.
6. **Kalite Kapıları (`i18n-guard`, Rate-Limit Testleri, ESLint):**
   - `i18n-guard.test.ts` tarafından yakalanan 19 dosyadaki sabit Azerbaycanca karakterli metinler `az.json` / `en.json` / `subpages-*.json` sözlüklerine taşınır.
   - `lead` ve `analytics` testlerinde `TRUST_PROXY` varsayımı açıkça test ortamında doğrulanır.
   - `DealDetail.tsx`, `KanbanBoard.tsx`, `AiTab.tsx`, `ChannelsTab.tsx` içindeki ESLint hataları ve uyarıları giderilir.
