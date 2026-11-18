# Teslim: QeydAI (müvəqqəti ad)

Tarih: 2026-11-18 · Klasör: C:/Users/adem/projects/qeydai · Brief: brief.md (onay: 2026-11-18)

## Ne yapıldı
- **Çekirdek qeydiyyat mantığı** (boş yer, təkrar qeydiyyat, eşzamanlı son yer, kiracı izolasyonu, başlamış dərsə kayıt reddi, AZ mobil numara doğrulama) → `src/lib/enrollment/enrollment.ts` (+ `enrollment.test.ts`, `enrollment.review.test.ts`).
- **AZ/EN landing sayfası** (`/az`, `/en`, dil yönlendirme, koyu/açık tema, mobil uyumlu) → `src/app/[lang]/`, `src/proxy.ts`.
- **Kalıcı SQLite deposu** (node:sqlite, Node 24 yerleşik): `BEGIN IMMEDIATE` ile atomik yer ayırma, `UNIQUE(tenant_id, session_id, phone)`, kiracı kapsamlı sorgular, gerçek çok süreçli yarış testi (4 süreç x 25 deneme, 10 yer: tam 10 kayıt). Kilit zayıflatılınca test başarısız oluyor (doğrulandı) → `src/lib/enrollment/sqlite-store.ts`. Kayıt API'sine bağlı.
- **n8n için kimlik doğrulamalı kayıt API'si** (`GET /api/v1/sessions`, `POST /api/v1/enroll`): Bearer anahtarı, kiracı anahtardan türetilir, SQLite deposuna bağlı, gerçek HTTP E2E testli (kimlik, kiracı izolasyonu, 10 paralel istek / 3 yer = tam 3 kayıt). Kullanım: `docs/api.md`, ayarlar: `.env.example`, demo veri: `npm run seed:demo` → `src/lib/api/`, `src/app/api/v1/`.
- **Lead formu API** (`POST /api/lead`: boyut sınırı, Content-Type ve Origin kontrolü, hız sınırı, global tavan, yapılandırılmış hatalar; lokal `data/leads.jsonl`) → `src/app/api/lead/route.ts`.
- **Güvenlik başlıkları** (CSP, HSTS, X-Frame-Options vb.) → `next.config.ts`.
- **Marka ve ses** → `brand/BRAND.md`, `brand/VOICE.md` (taslak; "devam" ile kabul sayıldı, değiştirilebilir).
- **İçerik** (AZ + EN): 4 blog yazısı, Meta ve Google reklam varyantları (3'er), 3 e-posta/mesaj şablonu (11 bot hazır cevabı dahil), SEO anahtar kelimeleri → `content/month-1/{blog,ads,email}`, `content/month-1/seo-keywords.md`.
- **30 günlük paket** (takvim, 30 gün AZ+EN gönderi, `meta.json`) ve 30 Flow görseli → `content/month-1/day-01…30`, `assets/month-1/` (git dışı).
- **Rakip araştırması** (küresel + Azerbaycan, Meta Reklam Kitaplığı, fiyatlar, WhatsApp mesaj maliyeti) → `docs/competitor-research.md`.
- **n8n lokal kurulum** (ayrı klasör) → `D:\tedris-ai` (n8n 2.48.4, `start-n8n.ps1`, `.env.example`).
- 18 ajan `.claude/agents/` altına kuruldu (`install_plan.py --run`, 18 ok / 0 hata).

## Nasıl çalıştırılır
```
cd C:/Users/adem/projects/qeydai
npm install
npm run dev            # geliştirme: http://localhost:3000/az
npm run build && npm run start   # üretim modu
npm test               # birim testleri (vitest)
npm run e2e            # Playwright (port 3100, kendi sunucusunu açar)
python C:/Users/adem/studio/tools/content/check_pack.py content/month-1 --assets assets
```
n8n (ayrı): `powershell -File D:\tedris-ai\start-n8n.ps1` → http://localhost:5678

## Test kanıtı
```
Run at: 2026-11-18 05:11:04
$ npm test
 Test Files  10 passed (10)
      Tests  95 passed (95)
$ npm run lint -> exit 0
$ npm run build -> exit 0
$ npm run e2e
  32 passed (6.5s)
$ npm audit --omit=dev
found 0 vulnerabilities
$ python check_pack.py content/month-1 --assets assets
OK
-> exit 0
```
Ayrıntılı geçmiş (kırmızı turlar, bulgular, düzeltmeler): `.studio/log.md`.

## İçerik paketi
- Yer: content/month-1/ (30 gün, AZ + EN) · Görseller: assets/month-1/ (30 adet, git dışı)
- Blog: 4 yazı · Reklam: 6 varyant (Meta 3 + Google 3, her biri AZ+EN) · E-posta/mesaj: 3 şablon (demo karşılama, pilot teklifi, bot hazır cevapları)
- Doğrulama: `check_pack.py` → OK (2026-11-18 04:59)
- Görsel kalite kontrolü: 30/30 görsel prompt'u ile eşleşiyor, kopya yok. **Not:** Flow betiği ilk turda görselleri kaydırmıştı (d09'dan itibaren); içeriğe göre yeniden adlandırıp 6 görseli yeniden ürettim (`assets/month-1/_remap_notes.json`). Bu aracı tekrar kullanırsan sonucu gözle doğrula.
- Yayınlamadan önce bak: `d21` görselindeki takvim tarihleri tuhaf, `d12` görselindeki defterde telefon numarası benzeri rakamlar var.

## Yapılan ücretli / dış işlemler
- **Üçüncü taraf kod kurulumu (onay: 2026-11-18):** `npx claude-code-templates@latest` ile 18 ajan; npm paketleri (Next.js, Vitest, Playwright vb.); n8n npm kurulumu; Playwright Chromium indirmesi (~124 MB). `@latest` sürüm sabit değil.
- **Google Flow görsel üretimi (onay: 2026-11-18, kullanıcının Chrome ve Google hesabı):** toplam 34 başarılı üretim (30 + yeniden denenen 6 ile kayan/kopya olanlar dahil). Flow kredi tüketimi doğrulanmadı.
- **Apify:** çağrılar denendi, hesap ücretsiz plan kotası dolu olduğu için **bloklandı, hiçbir şey çalışmadı, ücret yok**. Sohbete yapıştırılan Apify token'ı **kullanılmadı** ama açıkta kaldı: iptal edip yenisini oluştur.
- **Web araştırması:** web aramaları ve Meta Reklam Kitaplığı'nın (herkese açık) Chrome ile okunması. Hesap açılmadı, giriş yapılmadı.
- Hesap açma, ödeme, yayın, e-posta veya mesaj gönderimi: **yok**.
- Arka planda çalışan süreçler: `npm run start` (port 3000, demo için) ve n8n (port 5678, `D:\tedris-ai`). İstersen kapat.

## Açık kalanlar
- **Brief'teki özellikler:** F2 (birleşik mesajlaşma paneli) ve F4 (CRM/analitik paneli) **yapılmadı**. F1 yalnızca site metni ve statik demo sohbeti; **gerçek Gemini + Telegram botu çalışmıyor** (anahtarlar yok, workflow'lar yazılmadı).
- **Orijinal 8 aşamalı sistem planı:** yalnızca Aşama 1 (n8n kurulumu) tamam. Google Sheets/SQLite yapısı, Gemini + Telegram workflow'ları, n8n import dosyaları, WhatsApp, çok kiracılı PostgreSQL geçişi yapılmadı. Karar bekleyen: Sheets mi SQLite mi.
- **Güvenlik:** CSP'de `'unsafe-inline'` (nonce gerekir); hız sınırı süreç bazlı ve proxy olmadan taklit edilebilir; CSRF token yok (JSON Content-Type + Origin kontrolü var); `listSessions` N+1 sorgusu; SQLite deposu atomik ve test edildi, ama PostgreSQL uyarlaması yazılmadı ve site formu hâlâ yalnızca lead dosyasına yazıyor (kayıt akışı yalnızca API üzerinden).
- **Doğrulanmamış rakamlar:** 350/100 AZN fiyatı (pazar doğrulaması yok), 180 AZN IELTS ve "sınaq dərsi pulsuzdur" örnek; SEO arama hacimleri; rakip fiyatları ve WhatsApp mesaj ücretleri (resmî sayfalardan teyit gerekir).
- **Rakip araştırması eksikleri:** Instagram profil verileri (takipçi, etkileşim) toplanmadı (Apify kotası); Manychat/Wati/ChatDaddy reklam geçmişi bakılmadı.
- **Marka:** ad, logo, domain kesin değil. Sitede SSS ve "hakkımızda" bölümü yok.
- **Yayın:** canlıya alma, domain, reklam bütçesi, toplu e-posta ve sosyal paylaşım için ayrı onay gerekir. Hiçbiri yapılmadı.
- **Bağımsız inceleme:** bir kez yapıldı; ertelenen bulgular `.studio/log.md` içinde.
