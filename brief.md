# Brief: QeydAI (müvəqqəti ad)

Tarih: 2026-11-18 · Tür: web + automation (SaaS) · Klasör: C:/Users/adem/projects/qeydai

## Fikir
Azərbaycandakı tədris mərkəzləri üçün AI əsaslı satış, müştəri əlaqələri və qeydiyyat platforması: WhatsApp, Instagram və Telegram müraciətlərini AI ilə cavablandırır, potensial tələbələri müəyyənləşdirir, sınaq dərslərinə qeydiyyat aparır və satış nəticələrini izləyir. Əvvəl işlək MVP, sonra çoxmüştərili SaaS.

## Kitle ve pazar
- Kim: tədris mərkəzi sahibləri, kurs direktorları/menecerləri, satış və qeydiyyat əməkdaşları. İkincil: kursa yazılmaq istəyən tələbələr.
- Nerede: Bakı, sonra bütün Azərbaycan; gələcəkdə beynəlxalq.
- Diller: Azərbaycan dili + English

## Marka
- Ad: QeydAI (müvəqqəti) · Ton: müasir, premium-sadə, etibarlı · Renk: tünd lacivərt/qrafit + elektrik mavisi + firuzəyi vurğu, açıq/qaranlıq rejim · Logo: yok
- Dil: təbii, nəzakətli Azərbaycan dili; panel terminologiyası sadə.

## Referanslar
- Beğenilen: Linear (minimalizm, sürət), Intercom (yazışma + AI), Kommo (kanal CRM), Calendly (sadə qeydiyyat), Manychat (mesaj avtomatlaşdırması). Kopya yok.
- Beğenilmeyen: qarışıq paneller, yalnız texniki istifadəçiyə uyğun UI, çox menyu, şablon SaaS dizaynı.

## Olmazsa olmaz özellikler
1. AI müştəri köməkçisi (AZ, operatora yönləndirmə)
2. Vahid mesajlaşma mərkəzi (MVP: Telegram; sonra WhatsApp, Instagram)
3. Ağıllı qeydiyyat (cədvəl, boş yer, təkrar/tutum bloku, menecer bildirişi)
4. CRM və satış analitikası
5. Çoxmüştərili arxitektura (tenant izolyasiyası)

## Yığın
Web: Next.js (App Router) + TypeScript + Tailwind, Vitest + Playwright (landing + sonradan idarəetmə paneli). Automation: n8n 2.48.4 (lokal, `D:\tedris-ai`) + Gemini API + Telegram Bot API + Google Sheets, sonra PostgreSQL + Docker Compose. Backend məntiqi (qiymət/tutum/qeydiyyat) deterministik kodda; Python/pytest testləri. Sapma yok, iki stack birlikdə.

## Seçilen bileşenler (.studio/agents.json)
| id | neden | scan |
|---|---|---|
| business-marketing/customer-support | müştəri cavab ssenariləri | LOW |
| ai-specialists/prompt-engineer | Gemini sistem təlimatı | LOW |
| data-ai/ai-engineer | AI axını, JSON schema | LOW |
| business-marketing/sales-automator | satış/CRM axınları | LOW |
| development-team/fullstack-developer | landing + panel | LOW |
| web-tools/expert-nextjs-developer | Next.js App Router | LOW |
| programming-languages/typescript-pro | tip təhlükəsizliyi | LOW |
| development-tools/playwright-tester | E2E testlər | LOW |
| performance-testing/test-automator | birim/inteqrasiya testləri | LOW |
| development-tools/qa-expert | test strategiyası | LOW |
| security/security-auditor | ümumi təhlükəsizlik | LOW |
| security/se-security-reviewer | OWASP + LLM təhlükəsizliyi | LOW |
| security/api-security-audit | webhook/API audit | LOW |
| database/database-architect | tenant-izolyasiyalı sxem | LOW |
| development-team/backend-architect | deterministik qeydiyyat backend | LOW |
| development-team/ui-designer | dizayn sistemi | LOW |
| business-marketing/seo-specialist | AZ SEO, bloq | LOW |
| business-marketing/content-marketer | 30 günlük paket | LOW |

MEDIUM işarətli bileşen yok.

## İçerik kanalları
Instagram, TikTok, korporativ sayt + SEO bloq, e-poçt (sistem bildirişləri/hesabat), Telegram, WhatsApp (müştəri kanalı). LinkedIn sonra. Avto-paylaşım yok; fokus müraciət→qeydiyyat.

## Maliyet ve dış işlemler (tahmini)
- Flow görsel: ~45-50 adet (30 gün + blog/reklam kapakları), ücretsiz, Chrome CDP onayı gerekir
- Ücretli servis: yok. Gələcək xərclər (WhatsApp Cloud API mesajları, server, Gemini ödənişli limit) ayrıca hesablanıb təqdim olunacaq, təsdiqsiz aktivləşməz.
- Bütçe sınırı: 0 AZN

## Hedef dışı
Canlıya yayım, ödənişli servis aktivləşdirmə, WhatsApp/Instagram real inteqrasiyası (MVP sonrası), sosial media avto-paylaşım, rəqib kopyası, real müştəri məlumatı ilə sınaq.

<!-- Onay satırı burada YOK. Yalnızca kullanıcı onayladıktan sonra şu biçimde eklenir:
Onay: YYYY-MM-DD — kullanıcı -->
Onay: 2026-11-18 — kullanıcı
