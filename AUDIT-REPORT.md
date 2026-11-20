# QeydAI unified audit — /az ve /az/panel

Tarih: 2026-11-18. Kaynak: 5 agent raporu (SEO, CRO/copy, frontend/panel, UI/UX+a11y, güvenlik). Hiçbir kaynak dosya düzenlenmedi. Onay sonrası uygulanacak.

## Severity scale

- P0 — Blocker / catastrophe (erişilemezlik, veri kaybı, Yetkisiz erişim, WCAG AA fail, authentication DoS)
- P1 — Must fix (darbe, contrast fail, tasa belirtili davranış)
- P2 — Major (kullanabilirlik, ortaklama, performans)
- P3 — Moderate (tutarlılık, bilişsel yük)
- P4 — Minor (polish)

---

## /az (marketing site)

### P0

**A1. JSON-LD SoftwareApplication fiyat çakışması** — `src/app/[lang]/page.tsx:44-79`
`offers.price` = `"100"` AZN; görünen varsayılan dönem `halfYear` = 90 AZN. Google `"Mismatch with page content"` uyarısı verir.
Fix: fiyatı görünen varsayılanla eşle (90 AZN) ya da `priceValidUntil`/dönem belirt.

**A2. Heading hierarchy skip** — `src/app/[lang]/page.tsx`
H1 doğrudan H3, H2 yok. WCAG + SEO.
Fix: H2 ekle, sıralamayı düzelt.

**A3. Background photo CLS** — `src/app/[lang]/page.tsx:542`
`width`/`height` eksik.
Fix: `width`/`height` ekle ya da `fill` + `sizes`.

### P1

**B1. Canonical unification** — `src/app/[lang]/layout.tsx`
Canonical `/\${lang}`, OG 1200x630 ama `w-lobby.webp` 16:9. Favicon/icons metadata yok.
Fix: OG boyutunu gerçek görsele çevir, favicon metadata ekle.

**B2. sitemap.ts** — `src/app/sitemap.ts`
`lastModified` sabit `"2026-11-18"`, `x-default` alternatif yok.
Fix: dosya mtime'dan türet, `x-default` ekle.

**B3. robots.ts** — `src/app/robots.ts`
`/` izni açık, `/api/` hariç, `/panel` disallow yok. Panel indexlenmesin.
Fix: `/panel` disallow ekle.

**B4. Preload warning** — `/az` console
CSS preload kullanılmıyor.
Fix: `rel="preload"` kaldır ya da `as="style"` uygunlaştır.

**B5. LeadForm copy + validation** — `src/app/[lang]/LeadForm.tsx`
- Submit copy `"Demo istə"` satıcı-merkezli (musteri-değer yok).
- Telefon hatası genel hata ile karışık (`hasPhoneError = state === "error"`).
- Doğrulama sadece submit'te, `ok` sonrası input sıfırlanmıyor.
- Tüm non-429 hatalar `invalid_phone` olur (satır 87-97).
Fix: copy'ı müşteri-merkezli yaz (`"Demo vətənəşdə qəbul"` / değer odaklı), telefon hatası ayır, alan sıfırla, hata eşlemeyi düzelt.

**B6. Pricing default period** — `src/components/LandingInteractive.tsx:156`
`halfYear` varsayılan; fiyat JSON-LD ile ayrı.
Fix: varsayılanla JSON-LD tutarlı yap.

### P2

**C1. ProductPreview tablist** — `src/components/ProductPreview.tsx:122-136`
`role="tablist"`/`tab` ama `aria-controls`, `tabpanel`, ArrowLeft/Right/Home/End yok.
Fix: PanelShell pattern'ini kopyala (tabpanel + klavye navigasyon).

**C2. AiSpotlight tablist** — `src/components/LandingInteractive.tsx:52-74`
Aynı tablist eksiklikleri.
Fix: Aynı düzeltme.

**C3. MobileNavDrawer** — `src/components/LandingInteractive.tsx:240-301`
Escape yok, focus trap yok, backdrop/overlay yok, `aria-modal` yok.
Fix: Escape kapatma, focus trap, backdrop, `aria-hidden` ana içeriğe.

**C4. Touch targets <44px** — `marketing.css`
`.pm-burger` 40x40, `.pm-lang-pill` 36, `.pm-signin` ~32, pills/dots/tags 20-28.
Fix: 44px min-height/min-width zorunlu kıl.

**C5. Contrast failures** — `marketing.css`, `globals.css`
`#d2d8ef`/`#e8eaf4`/`#dfe3f5` border'ları beyaz üzerinde 1.2-1.4:1; `#3373ff` text `#f3f0ff`/`#ece8ff` üzerinde 3.5-3.7:1 (4.5 gerekli).
Fix: border'ları en az `#c7cfe8` koyulaştır; lavon metinleri `#1a2e8f` ya da arka planı `#f3efff` yap.

**C6. Token split** — `marketing.css` vs `globals.css`/`panel.css`
İki ayrı token'universi; primary `#3373ff` vs `#3046E8`; radius/shadow ayrı.
Fix: tek `--pm-*` token setine geç, birincil rengi kanunla.

**C7. buttonClass çelişkisi** — `src/components/ui/button.ts:8-21`
Radius 6px / height 36-44px; marketing 10px / 48px.
Fix: tek buton spesifikasyonuna gele (marketing 10px/48px önerilir).

---

## /az/panel (CRM workspace)

### P0

**D1. LoginGate şifre-only input** — `src/components/panel/LoginGate.tsx:134`
Chrome DOM uyarısı: parola formunda (gizli) username alanı gerekli. Kullanıcı adı yok.
Fix: kullanıcı adı/email alanı ekle (gizli olabilir) ya da input'u `username` semantiğiyle işaretle.

**D2. PanelShell otomatik 401 probe** — `src/components/panel/PanelShell.tsx:253-289`
Kimliği doğrulanmamışta GET `/api/panel/auth` → konsola 401 hata. 10 paralel fetch; sadece 3 endpoint `loadError` kontrolü; tüm 7 tab statik import (lazy yok); `clearSensitiveState` unauthorized'da.
Fix: auth durumu cookie'den önce kontrol et, probe'u koşullu yap, tab'ları `next/dynamic` ile lazy yap, `loadError` tüm endpoint'lerde.

**D3. Rate limit tek ortak kova + IP spoofing** — `src/lib/api/panel-api.ts:174`, `src/lib/http/same-origin.ts:16-29`, `src/app/api/lead/route.ts:11`, `src/app/api/analytics/route.ts:10`
`TRUST_PROXY` yoksa tüm callers tek `"unknown"` 30/dk kovaya düşer → bir saldırıcı tüm panel girişlerini kilitler. `maxKeys: 1` global kovaya tek spoofed IP tüm slotu doldurur. `lead`/`analytics` route'ları proxy başlıklarını şartlı gereksinimsiz güvenir.
Fix: `clientKey()` proxy başlığını sadece `TRUST_PROXY` set olduğunda güven; yoksa bağlantı-temelli kimlik kullan. Global kovayı `maxKeys: 1` kaldır. `/api/panel/auth` limiter'ı kiraya veya bağlantı kimliğine göre anahtarla.

**D4. JTI geri çağrı bellekte yalnız** — `src/lib/api/panel-auth.ts:10-34`
`revokedJtis` Map, yeniden başlatmada kaybolur, çalışanlar arasında paylaşılmaz. Logout sonrası çerez 8 saat kadar geçerli kalır.
Fix: JTI'yi store (SQLite/Postgres) `jti`+`exp` ile kalıcı hale getir, `isPanelJtiRevoked` cross-worker danış, expiry ile temizle.

### P1

**D5. Sınırsız liste sorguları** — `src/lib/crm/store.ts:300-306` vb., `listLeads`/`listContacts`/`listTasks`/`listNotes`/`listPhoneMatches`/`listDealMessages`/`listTimeline`, `src/lib/analytics/summary.ts:129-161`
`LIMIT`/`OFFSET` yok; `overview` her istekте 10 MiB senkron disk okuma (`MAX_READ_BYTES`).
Fix: her list metodu sunucu taraflı pagination (limit/offset, max page size); `listDealMessages`/`listTimeline` deal başına sayfalandır; analytics önbellekle ya da debounce et.

**D6. DealList orphan contact** — `src/components/panel/DealList.tsx`
contact POST başarılı, deal POST başarısız → kayıtsız contact kalır.
Fix: transaction/rollback ya da deal başarısızsa contact'ı geri al (compensating delete).

**D7. DealDetail setState during render + try/catch yok** — `src/components/panel/DealDetail.tsx`
Render sırasında `setState`, çakışan fetch mantığı, `try/catch` yok, dize'ler yerelleştirilmemiş.
Fix: fetch'i `useEffect`'e al, `try/catch` ekle, `useTranslation` kullan.

**D8. KanbanBoard klavye DnD yok** — `src/components/panel/KanbanBoard.tsx:49-213`
HTML5 drag-and-drop yalnız; klavye alternatifi yok (WCAG 2.2).
Fix: klavyeli stage taşıma (seç + ok tuşları) ya da erişilebilir stage-select (zaten var, kullanıma aç).

**D9. error.tsx retry yerine reset** — `src/app/[lang]/error.tsx`
`retry()` yerine `reset()` yok.
Fix: hata sonrası state temizleme için `reset()` ekle.

**D10. Analytics tracking hedefleri** — `src/components/AnalyticsTracker.tsx`
İzleme hedefleri/netleri belirtilmemiş.
Fix: olay adı ve hedef metrikleri belirle.

### P2

**D11. Panel gradient wrapper** — `src/components/panel/panel.css:1-9` `.crm-screen`
Her panel sayfasına lavanta/nane gradient; marka beyaz-önce çelişir.
Fix: flat `--bg` canvas; lavanta/nane sadece akcent chip/kesit.

**D12. Dark mode sızıntısı** — `globals.css:25-57`, `LeadForm.tsx:555-563`
Açık kart üzerinde dark `--stamp`/`--danger` text (#5AE0A0 = 1.67:1, #FF8B94 = 2.24:1).
Fix: kartı `data-theme="light"` yap veya dark token'ları açık yüzeyde kullanma.

**D13. Contrast panel** — `LoginGate.tsx:114` `.bg-cover` #0e0142 on #090624 = 1.04:1 (görünmez).
Fix: dark tema'da kontrastlı doldurma (beyaz/#FFE45C).

**D14. Tabliste klavye yok** — `ProductPreview`, `AiSpotlight` (yukarı C1/C2).
Aynı düzeltme.

**D15. Tablet breakpoint 768px yok** — `PanelShell` tab şeridi tablet’te iki satıra sarabilir.
Fix: 768px ekle, tek sütun kaydırılabilir veya yığılmış tab'lar.

**D16. min-h-9 (36px) butonlar** — panel genelinde.
Fix: 44px min-height zorunlu.

**D17. Checkbox 16x16** — `TeamStageTab.tsx:562`.
Fix: 44px hit alanı sar.

**D18. Delete onay dialog'ı yok** — `DealDetail.tsx:536-554` haricinde tüm silme anında.
Fix: `role="dialog"`/`aria-modal` ekle veya 5s'lik geri alma (undo) toast'ı ekle.

**D19. Skeletör yok** — `PanelShell.tsx:400-405`, `OverviewTab.tsx:571`.
Yükleme metni statik.
Fix: KPI kartı, satır, iş listesi için pulse skeletör.

**D20. Logo/brand identity çakışması** — edtech copy ("Tədris mərkəzi") vs multi-sector CRM.
Fix: panel copy'sini CRM'e genişlet, `"İşçi paneli"` yerine iş akışı dili kullan.

---

## Önceki uygulama önerisi (P0 → P1 → P2)

1. D1 LoginGate kullanıcı adı
2. D2 PanelShell 401 probe + lazy tab
3. D3 rate limit kovası + TRUST_PROXY
4. D4 JTI kalıcı geri çağrı
5. A1 JSON-LD fiyat çakışması
6. A2 heading hiyerarşisi
7. B1 canonical + favicon + OG
8. B2 sitemap lastModified + x-default
9. B3 robots /panel disallow
10. D5 pagination + 10 MiB okuma
11. D6 orphan contact
12. D7/D8/D9 DealDetail/KanbanBoard/error.tsx
13. A3/C4/C5/C1/C2/C3/C6/C7 contrast/touch/tablist/token

Onay istiyorum: hangi grupları uygulayayım? P0 grubu mı önce, yoksa tüm P0+P1 mı? Dosya düzeyinde yama onayından sonra düzenleme başlayacaktır.
