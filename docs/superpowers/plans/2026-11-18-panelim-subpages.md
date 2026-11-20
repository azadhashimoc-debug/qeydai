# Panelim.az Alt Sayfalar ve Kanal Mimarisi Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `panelim.az` için tam AZ/EN çift dilli, renkli 3D görselli (`public/images/p-*.webp`) çok sayfalı ürün, kanal, ücretsiz WhatsApp araçları, fiyat matrisi, örnek senaryo, blog, demo/iletişim ve yasal alt sayfaları kurmak.

**Architecture:** Mevcut `src/app/[lang]/` App Router yapısı ve `marketing.css` tasarım tokenları üzerine ortak sayfa kabuğu (`SiteHeader`, `SiteFooter`, `SubpageHero`, `BottomCtaBand`, `FeatureAlternating`) kurulur; tüm metinler `az.json` / `en.json` sözlüklerine (veya doğrudan sözlüklerce import edilen ayrık JSON modüllerine) bağlanır, araç hesaplamaları ve slug doğrulamaları saf TypeScript modülleri olarak birim testlerle doğrulanır.

**Tech Stack:** Next.js 16.4.6 (`cacheComponents: true`), React 19.3.0, TypeScript 5, Tailwind CSS 4.3.3, `qrcode` + `@types/qrcode` (tarayıcı içi QR SVG/PNG üretimi), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-panelim-subpages-design.md`

## Global Constraints

- Next.js `16.4.6` with `cacheComponents: true` and `experimental.globalNotFound: true`: no `Date.now()` / `new Date()` in Server Component render paths; every `[lang]` and `[slug]` route exports `generateStaticParams`.
- Strict CSP in `next.config.ts`: `img-src 'self' data:`, `script-src 'self' 'unsafe-inline'`, `connect-src 'self'`; zero external network calls or CDN scripts from new pages/tools.
- Bilingual i18n parity (`src/app/[lang]/i18n-guard.test.ts` and `src/app/[lang]/dictionaries.test.ts`): zero Azerbaijani diacritics (`[əğıöüçşƏĞİÖÜÇŞ]`) inside `.ts` or `.tsx` source files; identical sorted flattened keys in `az.json` and `en.json`; zero placeholder strings (`lorem|todo|tbd|xxx|\.\.\.\.|<.*>`) and zero identical AZ/EN strings longer than 12 characters.
- Content truthfulness and brand rules: no partner catalogs, client logos, customer testimonials, or `Meta Business Partner` badges; no `"Pilot"` or `"Yakında"` badges; no invented company title, VÖEN, or corporate email on `/legal/*` (reference `/[lang]/contact` only); no non-existent 3rd-party integration pages (`Shopify`, `PayPal`, `Lazada`, `Jotform`, `forms.app`, `Slack`, `Chatfuel`, `TikTok`).
- Preserve `/api/lead` (`{ name, phone }` validation in `src/lib/leads/leads.ts`) and existing `tests/e2e/landing.spec.ts` home page selectors (`h1`, `EN` link, `#contact` form, `#how`/`#features`/`#ai`/`#pricing`/`#faq`).
- Use the 16 pre-generated vibrant 3D assets in `public/images/p-*.webp` (`p-product-tour`, `p-pipeline`, `p-inbox`, `p-ai-copilot`, `p-salesbot`, `p-booking`, `p-channels`, `p-whatsapp`, `p-instagram`, `p-telegram`, `p-tools`, `p-fitness`, `p-blog-1`, `p-blog-2`, `p-demo`, `p-cases`).

## Review Focus

- `/tools` QR and WhatsApp Link inputs receiving `javascript:`, `data:`, `vbscript:`, malformed URLs, or empty phone numbers -> `buildWhatsAppUrl` and `sanitizeQrUrl` strictly enforce `https?://` and clean digits-only phone normalization, disabling download/copy actions when invalid.
- `/tools` WhatsApp Fee Calculator receiving negative numbers, `NaN`, `Infinity`, or decimal floats -> `estimateWhatsAppCost` clamps every category count with `Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))` and keeps 24h service window cost `$0.00`.
- `/[lang]/channels/[slug]` and `/[lang]/blog/[slug]` receiving unknown slugs or `Object.prototype` keys (`toString`, `constructor`, `__proto__`) -> lookup helpers use `Object.hasOwn(...)` and trigger Next.js `notFound()`.
- Bilingual dictionary parity (`dictionaries.test.ts` + `i18n-guard.test.ts`) broken by missing EN/AZ keys, untranslated >12-char strings, or hardcoded Azerbaijani text inside a component -> all copy stored in JSON dictionaries and verified via Vitest before any build.
- Mobile (`390px`) horizontal overflow or sticky header dropdown clipping on `SubpageHero`, `PricingMatrix`, or `/tools` QR preview -> Playwright E2E checks `scrollWidth <= clientWidth` at both desktop (`1280px`) and mobile (`390px`) viewports across new routes.

---

### Task 1: Pure Utilities, `qrcode` Dependency, and Slug Lookup Guards

**Files:**
- Modify: `package.json` (install `qrcode` and `@types/qrcode`)
- Create: `src/lib/marketing/wa-tools.ts`
- Create: `src/lib/marketing/catalog.ts`
- Test: `src/lib/marketing/wa-tools.test.ts`

**Interfaces:**
- Produces in `src/lib/marketing/wa-tools.ts`:
  - `normalizePhoneDigits(countryCode: string, localNumber: string): string`
  - `buildWhatsAppUrl(countryCode: string, localNumber: string, message: string): string | null`
  - `sanitizeQrUrl(raw: string): string | null`
  - `export type WaCategoryCounts = { marketing: number; utility: number; auth: number; service: number }`
  - `export type WaCostEstimate = { marketingUsd: number; utilityUsd: number; authUsd: number; serviceUsd: number; totalUsd: number; totalAzn: number }`
  - `estimateWhatsAppCost(counts: WaCategoryCounts, aznRate?: number): WaCostEstimate`
- Produces in `src/lib/marketing/catalog.ts`:
  - `export const CHANNEL_SLUGS = ["whatsapp", "instagram", "telegram", "webhook-api"] as const`
  - `export type ChannelSlug = (typeof CHANNEL_SLUGS)[number]`
  - `export const BLOG_SLUGS = ["whatsapp-automation", "instagram-dm-sales", "appointment-crm", "ai-reply-workflows", "telegram-lead-capture"] as const`
  - `export type BlogSlug = (typeof BLOG_SLUGS)[number]`
  - `isChannelSlug(slug: string): slug is ChannelSlug`
  - `isBlogSlug(slug: string): slug is BlogSlug`

- [ ] **Step 1: Install `qrcode` and `@types/qrcode`**

Run: `npm install qrcode @types/qrcode`
Expected: `package.json` includes `"qrcode"` in `dependencies` and `"@types/qrcode"` in `devDependencies`.

- [ ] **Step 2: Write failing unit tests in `src/lib/marketing/wa-tools.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, estimateWhatsAppCost, sanitizeQrUrl } from "./wa-tools";
import { isBlogSlug, isChannelSlug } from "./catalog";

describe("wa-tools", () => {
  it("builds wa.me URL with normalized digits and encoded message", () => {
    expect(buildWhatsAppUrl("+994", "050 123 45 67", "Salam, demo istəyirəm")).toBe(
      "https://wa.me/994501234567?text=Salam%2C%20demo%20ist%C9%99yir%C9%99m",
    );
  });

  it("returns null for empty or too-short phone numbers", () => {
    expect(buildWhatsAppUrl("+994", "12", "")).toBeNull();
  });

  it("sanitizeQrUrl allows https/http only and rejects javascript/data URLs", () => {
    expect(sanitizeQrUrl("https://wa.me/994501234567")).toBe("https://wa.me/994501234567");
    expect(sanitizeQrUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeQrUrl("data:text/html,<script>")).toBeNull();
  });

  it("estimateWhatsAppCost clamps invalid/negative counts and keeps service windows free", () => {
    const res = estimateWhatsAppCost({ marketing: -5, utility: 100.9, auth: Number.NaN, service: 500 });
    expect(res.marketingUsd).toBe(0);
    expect(res.serviceUsd).toBe(0);
    expect(res.utilityUsd).toBeGreaterThan(0);
    expect(res.totalAzn).toBeCloseTo(res.totalUsd * 1.7, 2);
  });
});

describe("catalog slug guards", () => {
  it("accepts valid channel/blog slugs and rejects prototype keys", () => {
    expect(isChannelSlug("whatsapp")).toBe(true);
    expect(isChannelSlug("shopify")).toBe(false);
    expect(isChannelSlug("toString")).toBe(false);
    expect(isBlogSlug("whatsapp-automation")).toBe(true);
    expect(isBlogSlug("constructor")).toBe(false);
  });
});
```

- [ ] **Step 3: Run failing tests**

Run: `npx vitest run src/lib/marketing/wa-tools.test.ts`
Expected: FAIL with missing module errors (`./wa-tools`, `./catalog`).

- [ ] **Step 4: Implement `src/lib/marketing/wa-tools.ts` and `src/lib/marketing/catalog.ts`**

- In `wa-tools.ts`: strip non-digits, drop leading `"0"` on local part when prefixed with country code (`+994` + `050...` -> `99450...`), require `>= 8` and `<= 15` digits, encode optional `message`; validate QR URLs via `new URL(...)` allowing only `http:` and `https:`; calculate Meta benchmark template rates (`marketing: 0.045`, `utility: 0.015`, `auth: 0.012`, `service: 0` USD per message, default `aznRate = 1.70`).
- In `catalog.ts`: define `CHANNEL_SLUGS`, `BLOG_SLUGS`, and `Set.prototype.has`-backed type guards (`isChannelSlug`, `isBlogSlug`) so prototype properties return `false`.

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/lib/marketing/wa-tools.test.ts`
Expected: PASS (all 5 tests pass).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/marketing/wa-tools.ts src/lib/marketing/catalog.ts src/lib/marketing/wa-tools.test.ts
git commit -m "feat(marketing): add WhatsApp tools utilities and slug guards"
```

---

### Task 2: Bilingual Dictionary Extension for All Subpages

**Files:**
- Create: `src/app/[lang]/dictionaries/subpages-az.json`
- Create: `src/app/[lang]/dictionaries/subpages-en.json`
- Modify: `src/app/[lang]/dictionaries/az.json` (or merge in `src/app/[lang]/dictionaries.ts`)
- Modify: `src/app/[lang]/dictionaries/en.json`
- Modify: `src/app/[lang]/dictionaries.ts`
- Test: `src/app/[lang]/dictionaries.test.ts`, `src/app/[lang]/i18n-guard.test.ts`

**Interfaces:**
- Consumes: `CHANNEL_SLUGS`, `BLOG_SLUGS` structure.
- Produces: `getDictionary(lang)` returning `{ ...baseDictionary, subpages: SubpagesDict }` where `SubpagesDict` contains full AZ and EN keys for:
  - `navGroups` (Product dropdown, Channels & Tools dropdown, Resources links)
  - `footer` (4 honest columns: Product, Channels & Tools, Resources, Contact & Legal — zero partner badges)
  - `common` (`tryFree`, `bookDemo`, `openPanel`, `readGuide`, `backToChannels`, `backToBlog`, `bottomCta`)
  - `product`, `pipeline`, `inbox`, `ai`, `booking`
  - `channelsHub`, `channelDetails` (keyed strictly by `whatsapp`, `instagram`, `telegram`, `webhook-api`)
  - `tools` (link builder, QR generator, fee estimator labels & disclaimer)
  - `fitnessScenario` (explicit "Sample scenario" / "Nümunə ssenari" badge, zero fabricated client names)
  - `blogHub`, `blogPosts` (keyed strictly by the 5 `BLOG_SLUGS`)
  - `pricingPage` (matrix category groups & real feature rows matching codebase + FAQ)
  - `demoPage`, `contactPage`
  - `legal` (`terms` and `privacy` referencing `panelim.az` and `/contact` with zero company title or VÖEN)

- [ ] **Step 1: Author `src/app/[lang]/dictionaries/subpages-az.json` and `subpages-en.json`**

Ensure every string is genuinely translated between AZ and EN, zero placeholders (`lorem`, `tbd`, `xxx`, `...`), zero `"Pilot"`/`"Yakında"` badges, zero partner claims, and exact parity of nested keys.

- [ ] **Step 2: Wire `subpages` into `src/app/[lang]/dictionaries.ts` and update `src/app/[lang]/dictionaries.test.ts` to validate merged dictionaries**

In `dictionaries.ts`, import `subpagesAz` and `subpagesEn` cleanly inside `dictionaries` loader (`az: async () => ({ ...baseAz, subpages: subpagesAz })`) and import both in `dictionaries.test.ts` so `AZ and EN have identical keys`, `no empty or placeholder values`, and `AZ copy is not just the English copy` cover 100% of subpage copy automatically.

- [ ] **Step 3: Run i18n and dictionary test suites**

Run: `npx vitest run src/app/[lang]/dictionaries.test.ts src/app/[lang]/i18n-guard.test.ts`
Expected: PASS (zero key mismatches, zero placeholders, zero untranslated long strings).

- [ ] **Step 4: Commit**

```bash
git add src/app/[lang]/dictionaries/subpages-az.json src/app/[lang]/dictionaries/subpages-en.json src/app/[lang]/dictionaries.ts src/app/[lang]/dictionaries.test.ts
git commit -m "feat(i18n): add bilingual AZ/EN dictionaries for all subpages"
```

---

### Task 3: Shared Marketing Shell (`SiteHeader`, `SiteFooter`, `SubpageHero`, `FeatureAlternating`, `FeatureGrid`, `BottomCtaBand`) & CSS

**Files:**
- Create: `src/components/marketing/SiteHeader.tsx`
- Create: `src/components/marketing/SiteFooter.tsx`
- Create: `src/components/marketing/SubpageBlocks.tsx`
- Modify: `src/app/[lang]/marketing.css`
- Modify: `src/app/[lang]/page.tsx` (adopt `SiteHeader` with `mode="landing"` + `SiteFooter`)

**Interfaces:**
- Produces in `src/components/marketing/SiteHeader.tsx`:
  - `SiteHeader({ lang, brand, a11y, nav, subNav, mode = "subpage", routeSuffix = "" }: SiteHeaderProps)`
  - When `mode === "landing"`, keeps existing `#how`, `#features`, `#ai`, `#pricing`, `#faq` links plus compact dropdown/links to `/product`, `/channels`, `/tools`, `/pricing`, `/blog`, and preserves `data-track-lang`, `data-track-cta="header"`, and `MobileNavDrawer`.
  - When `mode === "subpage"`, links language switch to `/${other}${routeSuffix}` and "Demo" CTA to `/${lang}/demo`.
- Produces in `src/components/marketing/SiteFooter.tsx`:
  - `SiteFooter({ lang, other, tagline, copyright, switchLabel, cols }: SiteFooterProps)`
- Produces in `src/components/marketing/SubpageBlocks.tsx`:
  - `SubpageHero`, `FeatureAlternating`, `FeatureGrid`, `BottomCtaBand` (all using `Photo` from `@/components/Photo` for `p-*.webp` 3D assets).

- [ ] **Step 1: Create `SiteHeader.tsx`, `SiteFooter.tsx`, and `SubpageBlocks.tsx` (zero hardcoded Azerbaijani strings)**

- [ ] **Step 2: Add subpage layout & visual styles to `src/app/[lang]/marketing.css`**

Include responsive grids, pastel feature cards (`pm-pastel-mint`, `pm-pastel-lavender`, `pm-pastel-amber`, `pm-pastel-sky`), dropdown menu accessibility (`:focus-within` / click toggle), alternating 2-column sections, and `390px` mobile stacking with zero horizontal overflow.

- [ ] **Step 3: Wire `SiteHeader` (`mode="landing"`) and `SiteFooter` into `src/app/[lang]/page.tsx`**

Verify existing landing sections, `#contact` form, and `AnalyticsTracker` remain intact.

- [ ] **Step 4: Run i18n guard + typecheck**

Run: `npx vitest run src/app/[lang]/i18n-guard.test.ts && npx tsc --noEmit`
Expected: PASS with zero TypeScript errors and zero hardcoded AZ characters.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/SiteHeader.tsx src/components/marketing/SiteFooter.tsx src/components/marketing/SubpageBlocks.tsx src/app/[lang]/marketing.css src/app/[lang]/page.tsx
git commit -m "feat(ui): add shared marketing header, footer, and subpage layout blocks"
```

---

### Task 4: Product Subpages (`/product`, `/pipeline`, `/inbox`, `/ai`, `/booking`)

**Files:**
- Create: `src/app/[lang]/product/page.tsx`
- Create: `src/app/[lang]/pipeline/page.tsx`
- Create: `src/app/[lang]/inbox/page.tsx`
- Create: `src/app/[lang]/ai/page.tsx`
- Create: `src/app/[lang]/booking/page.tsx`

**Interfaces:**
- Consumes: `getDictionary`, `locales` (`generateStaticParams`), `SiteHeader`, `SiteFooter`, `SubpageHero`, `FeatureAlternating`, `FeatureGrid`, `BottomCtaBand`, `Photo`.

- [ ] **Step 1: Implement `/[lang]/product`, `/[lang]/pipeline`, `/[lang]/inbox`, `/[lang]/ai`, and `/[lang]/booking` pages**

- Each page exports `generateStaticParams` (returning `locales.map((lang) => ({ lang }))`) and `generateMetadata` (with `canonical` + `az`/`en` `alternates`).
- Hero visuals map to `p-product-tour`, `p-pipeline`, `p-inbox`, `p-ai-copilot` (+ `p-salesbot` in alternating block on `/ai`), and `p-booking`.
- `/product` links clearly into `/pipeline`, `/inbox`, `/ai`, `/booking`, and `/channels`.
- Copy reflects only real product capabilities (no "Pilot"/"Yakında" tags).

- [ ] **Step 2: Run i18n guard + typecheck**

Run: `npx vitest run src/app/[lang]/i18n-guard.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/[lang]/product/ src/app/[lang]/pipeline/ src/app/[lang]/inbox/ src/app/[lang]/ai/ src/app/[lang]/booking/
git commit -m "feat(pages): add product, pipeline, inbox, ai, and booking subpages"
```

---

### Task 5: Channels Hub & Dynamic Channel Pages (`/channels`, `/channels/[slug]`)

**Files:**
- Create: `src/app/[lang]/channels/page.tsx`
- Create: `src/app/[lang]/channels/[slug]/page.tsx`

**Interfaces:**
- Consumes: `CHANNEL_SLUGS`, `isChannelSlug` from `@/lib/marketing/catalog`, `WhatsAppIcon`/`InstagramIcon`/`TelegramIcon`, `Photo` (`p-channels`, `p-whatsapp`, `p-instagram`, `p-telegram`, `p-salesbot`).

- [ ] **Step 1: Implement `/[lang]/channels/page.tsx`**

Show supported active channels (WhatsApp, Instagram, Telegram, REST Webhook / n8n API) with links to `/[lang]/channels/[slug]` and `/[lang]/tools`.

- [ ] **Step 2: Implement `/[lang]/channels/[slug]/page.tsx`**

- `generateStaticParams()` returns cartesian product of `locales` x `CHANNEL_SLUGS`.
- Unknown `slug` or non-own key triggers `notFound()` via `isChannelSlug(slug)`.
- `whatsapp` page covers unified inbox, templates, broadcasts, team assignment, and links to `/tools` (no Meta Partner badge, no fake Shopify/Flows claims).
- `instagram` page covers DM, story replies, lead capture, and AI draft replies using `p-instagram.webp`.
- `telegram` page covers Bot token connection, private inquiry capture, and instant agent replies using `p-telegram.webp`.
- `webhook-api` page covers `/api/v1/sessions`, `/api/v1/enroll`, `/api/v1/leads`, `/api/v1/messages`, Bearer key auth, and n8n JSON workflow integration using `p-salesbot.webp`.

- [ ] **Step 3: Run i18n guard + typecheck**

Run: `npx vitest run src/app/[lang]/i18n-guard.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/[lang]/channels/
git commit -m "feat(channels): add channels hub and whatsapp, instagram, telegram, webhook-api pages"
```

---

### Task 6: Interactive Free WhatsApp Tools (`/tools`)

**Files:**
- Create: `src/components/marketing/WhatsAppToolsClient.tsx`
- Create: `src/app/[lang]/tools/page.tsx`
- Test: `src/components/marketing/WhatsAppToolsClient.test.tsx`

**Interfaces:**
- Consumes: `buildWhatsAppUrl`, `sanitizeQrUrl`, `estimateWhatsAppCost` from `@/lib/marketing/wa-tools`; `QRCode` from `qrcode`.

- [ ] **Step 1: Write failing component test `src/components/marketing/WhatsAppToolsClient.test.tsx`**

Verify tab switching (`link` / `qr` / `calculator`), live `https://wa.me/...` preview update on phone/message input, copy button state, invalid `javascript:` URL blocking on QR generator, and calculator cost update on marketing/service message inputs.

- [ ] **Step 2: Run failing component test**

Run: `npx vitest run src/components/marketing/WhatsAppToolsClient.test.tsx`
Expected: FAIL because `WhatsAppToolsClient.tsx` does not exist.

- [ ] **Step 3: Implement `WhatsAppToolsClient.tsx` and `src/app/[lang]/tools/page.tsx`**

- Tab 1 (Link Builder): country selector (`+994`, `+90`, `+7`, `+1`, `+44`, custom), local number, prefilled message, live `wa.me` output, copy button, and interactive phone chat preview bubble.
- Tab 2 (QR Generator): accepts generated `wa.me` link or custom `https://` URL (validated via `sanitizeQrUrl`), renders inline SVG via `QRCode.toString(url, { type: "svg", margin: 2 })`, provides SVG and PNG (`QRCode.toDataURL`) client-side download buttons.
- Tab 3 (WhatsApp Cost Estimator): inputs for Marketing, Utility, Authentication, and 24h Service messages; USD & AZN toggle (`1 USD = 1.70 AZN`); displays clear benchmark estimation note from dictionary.
- Hero uses `p-tools.webp`.

- [ ] **Step 4: Run component test to verify pass**

Run: `npx vitest run src/components/marketing/WhatsAppToolsClient.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/WhatsAppToolsClient.tsx src/components/marketing/WhatsAppToolsClient.test.tsx src/app/[lang]/tools/
git commit -m "feat(tools): add interactive WhatsApp link, QR, and fee calculator page"
```

---

### Task 7: Pricing Matrix, Demo, Contact, Fitness Scenario, Blog, and Legal Pages

**Files:**
- Create: `src/components/marketing/PricingMatrixClient.tsx`
- Create: `src/app/[lang]/pricing/page.tsx`
- Create: `src/app/[lang]/demo/page.tsx`
- Create: `src/app/[lang]/contact/page.tsx`
- Create: `src/app/[lang]/scenarios/fitness-centers/page.tsx`
- Create: `src/app/[lang]/blog/page.tsx`
- Create: `src/app/[lang]/blog/[slug]/page.tsx`
- Create: `src/app/[lang]/legal/terms/page.tsx`
- Create: `src/app/[lang]/legal/privacy/page.tsx`

**Interfaces:**
- Consumes: `PricingShowcase` or dictionary pricing plans (`starter`, `growth`, `pro`, `enterprise`), `LeadForm` (`src/app/[lang]/LeadForm.tsx`), `isBlogSlug` / `BLOG_SLUGS`, `Photo` (`p-demo`, `p-fitness`, `p-blog-1`, `p-blog-2`, `p-cases`).

- [ ] **Step 1: Implement `/[lang]/pricing` (`PricingMatrixClient` + accordion categories + FAQ)**

Include period selector (`monthly`, `halfYear`, `annual`) and collapsible comparison category rows (`Channels`, `CRM & Pipeline`, `AI & Automation`, `Support & API`) matching only real plan entitlements.

- [ ] **Step 2: Implement `/[lang]/demo` and `/[lang]/contact`**

Reuse `LeadForm` posting to `/api/lead` (`{ name, phone }`) with `p-demo.webp` hero and clear response expectations; track page CTA/visit via existing analytics setup.

- [ ] **Step 3: Implement `/[lang]/scenarios/fitness-centers`**

Mark clearly with the dictionary "Sample Scenario" badge (`p-fitness.webp`) illustrating trial workout booking, trainer schedule slots, and WhatsApp/Instagram inquiry capture — zero fake studio brands or client quotes.

- [ ] **Step 4: Implement `/[lang]/blog` and `/[lang]/blog/[slug]`**

5 focused guides (`BLOG_SLUGS`) with category pills/filtering or clean cards using `p-blog-1.webp`, `p-blog-2.webp`, `p-cases.webp`; `generateStaticParams` + `notFound()` via `isBlogSlug`.

- [ ] **Step 5: Implement `/[lang]/legal/terms` and `/[lang]/legal/privacy`**

Clear plain-language terms & privacy disclosures for `panelim.az` referencing only `/[lang]/contact` (no invented company title, VÖEN, or email).

- [ ] **Step 6: Run tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (all unit, dictionary, and i18n-guard tests pass, zero TS errors).

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/PricingMatrixClient.tsx src/app/[lang]/pricing/ src/app/[lang]/demo/ src/app/[lang]/contact/ src/app/[lang]/scenarios/ src/app/[lang]/blog/ src/app/[lang]/legal/
git commit -m "feat(pages): add pricing, demo, contact, fitness scenario, blog, and legal pages"
```

---

### Task 8: Standalone Login & Register Pages (`/[lang]/login`, `/[lang]/register`)

**Files:**
- Modify: `src/app/[lang]/dictionaries/subpages-az.json` (add `authPages.login` and `authPages.register` copy)
- Modify: `src/app/[lang]/dictionaries/subpages-en.json` (add `authPages.login` and `authPages.register` copy)
- Create: `src/components/marketing/AuthSplitClient.tsx`
- Create: `src/app/[lang]/login/page.tsx`
- Create: `src/app/[lang]/register/page.tsx`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, `Photo` (`p-product-tour`, `p-demo`), `LeadForm` (`src/app/[lang]/LeadForm.tsx` for `/register` workspace registration request), `POST /api/panel/auth` (for `/login`, redirecting to `/${lang}/panel` on HTTP 200).
- Preserves existing `/[lang]/panel` `LoginGate` untouched (`tests/e2e/panel.spec.ts` compatibility).

- [ ] **Step 1: Add `authPages` (`login` and `register`) bilingual copy to `subpages-az.json` and `subpages-en.json`**

Include split-panel headings, subtitles, field labels (workspace/user, access key, show/hide key, submit, invalid/rate-limit/network errors), cross-links (`/${lang}/register` <-> `/${lang}/login`), and `noindex,nofollow` metadata robots directive on `/login` and `/register` if appropriate (keep indexable or standard marketing metadata without exposing secrets).

- [ ] **Step 2: Create `src/components/marketing/AuthSplitClient.tsx`, `src/app/[lang]/login/page.tsx`, and `src/app/[lang]/register/page.tsx`**

- `/[lang]/login`: renders split-screen layout with `SiteHeader` / `SiteFooter`; left card submits `{ key }` to `/api/panel/auth` (`credentials: "same-origin"`) and navigates to `/${lang}/panel` via `router.push` on 200 (also handles 429 rate limit and invalid key error cleanly); right panel shows `p-product-tour.webp` + CRM workspace highlights + link to `/${lang}/register`.
- `/[lang]/register`: renders split-screen layout with `SiteHeader` / `SiteFooter`; left card renders `LeadForm` (`/api/lead`) framed for creating/requesting a new `panelim.az` workspace; right panel shows `p-demo.webp` + setup highlights + link to `/${lang}/login`.
- Export `generateStaticParams` and `generateMetadata` on both pages.

- [ ] **Step 3: Run tests and typecheck**

Run: `npx vitest run src/app/[lang]/dictionaries.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/[lang]/dictionaries/subpages-az.json src/app/[lang]/dictionaries/subpages-en.json src/components/marketing/AuthSplitClient.tsx src/app/[lang]/login/ src/app/[lang]/register/
git commit -m "feat(auth): add standalone login and register marketing pages"
```

---

### Task 9: Sitemap Expansion, Playwright Subpages E2E Suite, and Full Production Verification

**Files:**
- Modify: `src/app/sitemap.ts`
- Create: `tests/e2e/subpages.spec.ts`

**Interfaces:**
- Consumes: `CHANNEL_SLUGS`, `BLOG_SLUGS` from `@/lib/marketing/catalog` for dynamic sitemap generation.

- [ ] **Step 1: Expand `src/app/sitemap.ts` to include all static subpages, `CHANNEL_SLUGS`, and `BLOG_SLUGS` for both `az` and `en`**

Keep static ISO mtime helper (`pageMtime()` or fixed fallback) so prerendering remains deterministic.

- [ ] **Step 2: Add `tests/e2e/subpages.spec.ts`**

Verify:
- Every new route (`/az/product`, `/az/pipeline`, `/az/inbox`, `/az/ai`, `/az/booking`, `/az/channels`, `/az/channels/whatsapp`, `/az/channels/instagram`, `/az/channels/telegram`, `/az/channels/webhook-api`, `/az/tools`, `/az/scenarios/fitness-centers`, `/az/blog`, `/az/blog/whatsapp-automation`, `/az/pricing`, `/az/demo`, `/az/contact`, `/az/login`, `/az/register`, `/az/legal/terms`, `/az/legal/privacy`) returns HTTP 200 and renders `h1` with zero horizontal overflow at desktop and mobile (`scrollWidth <= clientWidth`).
- Unknown slugs (`/az/channels/shopify`, `/az/blog/unknown`) return 404.
- `/az/tools` generates a `wa.me` link and SVG QR code on user input, and switches to `/en/tools`.
- `/az/demo` submits a valid lead via `/api/lead`.

- [ ] **Step 3: Run full verification suite**

Run:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`
4. `npm run build`
5. `npm run e2e`

Expected: All lint checks, TypeScript checks, Vitest suites, Next.js `next build` routes, and Playwright desktop + mobile E2E tests (`landing.spec.ts`, `panel.spec.ts`, `api.spec.ts`, `subpages.spec.ts`) pass cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts tests/e2e/subpages.spec.ts
git commit -m "test(e2e): add subpages sitemap coverage and Playwright verification"
```

---

## Self-Review Checklist (Verified)

1. **Spec coverage:** Every route in Section 5 (`/product`, `/pipeline`, `/inbox`, `/ai`, `/booking`, `/channels`, `/channels/[slug]`, `/tools`, `/scenarios/fitness-centers`, `/blog`, `/blog/[slug]`, `/pricing`, `/demo`, `/contact`, `/login`, `/register`, `/legal/terms`, `/legal/privacy`), shared header/footer/hero/CTA blocks, 16 `p-*.webp` images, truthfulness boundaries, no `"Pilot"`/`"Yakında"` tags, no VÖEN/company title, and `sitemap.ts` are mapped 1:1 to Tasks 1–9.
2. **No incomplete steps:** Every step names exact file paths, function signatures, inputs, and verification commands.
3. **Type consistency:** `CHANNEL_SLUGS`, `BLOG_SLUGS`, `isChannelSlug`, `isBlogSlug`, `buildWhatsAppUrl`, `sanitizeQrUrl`, `estimateWhatsAppCost`, `SiteHeader`, `SiteFooter` match identically across Tasks 1–9.
4. **Review focus:** All 5 edge cases (XSS/non-HTTP QR URLs, negative/NaN fee inputs, prototype-key slug lookups returning 404, AZ/EN parity + no hardcoded AZ diacritics, `390px` overflow) are explicitly tested.
