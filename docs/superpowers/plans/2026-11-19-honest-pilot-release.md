# Honest B2B Pilot Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove disconnected/simulated UI promises, wire public lead/register forms into the panel CRM SQLite store, align pricing and error copy, and bring all lint, unit, build, and E2E gates to green.

**Architecture:** Keep the single-node SQLite + JSONL hybrid architecture while bridging `POST /api/lead` into `getSharedStore().upsertLead(tenantId, ...)` for the configured pilot tenant. Replace dead OAuth/Passkey/toggle controls in marketing auth and panel tabs with honest workspace-key auth, webhook copy, AI preview, and contact links backed by localized dictionaries.

**Tech Stack:** Next.js 16.4.6 App Router, React 19.3, TypeScript 5, Node 24 `node:sqlite`, Vitest 5, Playwright 1.65.

**Spec:** `docs/superpowers/specs/2026-11-19-honest-pilot-release-design.md`

## Global Constraints

- Zero hardcoded Azerbaijani characters (`/[əğıöüçşƏĞİÖÜÇŞ]/`) in `src/` outside `dictionaries/`, `error-copy.ts`, `global-not-found.tsx`, and `*.test.ts(x)`.
- Preserve existing E2E contracts in `tests/e2e/panel.spec.ts`, `tests/e2e/subpages.spec.ts`, `tests/e2e/landing.spec.ts`, and `tests/e2e/api.spec.ts`.
- Never open SQLite during `NEXT_PHASE === "phase-production-build"`.
- Do not commit or deploy without explicit user request.

## Review Focus

- `POST /api/lead` when `QEYDAI_PUBLIC_LEAD_TENANT` is unset must derive the default tenant from `QEYDAI_ADMIN_KEYS` / `QEYDAI_API_KEYS` or fall back to `"center_001"`, and a SQLite failure must not crash if `LEADS_FILE` is intentionally broken in storage-failure unit tests.
- `POST /api/lead` and `POST /api/analytics` rate-limit tests passing `x-forwarded-for` or `x-real-ip` headers must set `TRUST_PROXY` explicitly in test setup so `clientKey()` stays fail-closed by default when `TRUST_PROXY` is unset.
- `/[lang]/demo` and `/[lang]/contact` must display invalid-phone error copy (not `form.successBody`) when phone validation or submission fails.
- `PlansTab` CTA elements must render `<a href="/${lang}#contact">` links matching `panel.spec.ts:56`.
- `DealDetail` and `KanbanBoard` must pass ESLint (`react-hooks/set-state-in-effect` and `react-hooks/preserve-manual-memoization`) without breaking keyboard stage navigation or deal editing.

---

### Task 1: Fix Public Lead & Analytics Rate-Limit Tests + Bridge `POST /api/lead` to Panel CRM Store

**Files:**
- Modify: `src/app/api/lead/route.ts`
- Modify: `src/app/api/lead/route.test.ts`
- Modify: `src/app/api/lead/route.review.test.ts`
- Modify: `src/app/api/analytics/route.test.ts`

**Interfaces:**
- Consumes: `getSharedStore()` and `parseKeys()` from `src/lib/api/instance.ts`
- Produces: `resolvePublicLeadTenant(): string` in `src/app/api/lead/route.ts` and automatic `upsertLead` persistence into SQLite when `ENROLL_DB_FILE` / default store is available.

- [ ] **Step 1: Add CRM-sync test and explicit `TRUST_PROXY` setup in `src/app/api/lead/route.test.ts`, `src/app/api/lead/route.review.test.ts`, and `src/app/api/analytics/route.test.ts`**
- [ ] **Step 2: Implement `resolvePublicLeadTenant()` and `getSharedStore().upsertLead(...)` in `src/app/api/lead/route.ts`**
- [ ] **Step 3: Run `npx vitest run src/app/api/lead/route.test.ts src/app/api/lead/route.review.test.ts src/app/api/analytics/route.test.ts` and verify PASS**

### Task 2: Remove Disconnected Social/Passkey Controls and Fix Demo/Contact Error Copy

**Files:**
- Modify: `src/components/marketing/AuthKommoClient.tsx`
- Modify: `src/components/marketing/AuthKommoRegisterClient.tsx`
- Modify: `src/app/[lang]/demo/page.tsx`
- Modify: `src/app/[lang]/contact/page.tsx`
- Modify: `src/app/[lang]/dictionaries/subpages-az.json`
- Modify: `src/app/[lang]/dictionaries/subpages-en.json`

**Interfaces:**
- Consumes: `d.subpages.demoPage.form`, `d.subpages.contactPage.form`, `d.subpages.authPages`
- Produces: Honest workspace-key sign-in form and pilot workspace application form without non-functional Google/Facebook/Passkey buttons; accurate `invalidPhone` error text on `/demo` and `/contact`.

- [ ] **Step 1: Update `subpages-az.json` and `subpages-en.json` with `invalidPhone` and `rateLimited` keys for `demoPage.form` and `contactPage.form`**
- [ ] **Step 2: Wire `errText={form.invalidPhone}` and `rateLimitedText={form.rateLimited}` in `src/app/[lang]/demo/page.tsx` and `src/app/[lang]/contact/page.tsx`**
- [ ] **Step 3: Remove dead passkey and Google/Facebook buttons from `AuthKommoClient.tsx` and `AuthKommoRegisterClient.tsx` while keeping existing labels/roles used by E2E**

### Task 3: Fix Panel Tabs (`PlansTab`, `ChannelsTab`, `AiTab`, `LoginGate`) and ESLint Errors (`DealDetail`, `KanbanBoard`)

**Files:**
- Modify: `src/components/panel/PlansTab.tsx`
- Modify: `src/components/panel/ChannelsTab.tsx`
- Modify: `src/components/panel/AiTab.tsx`
- Modify: `src/components/panel/LoginGate.tsx`
- Modify: `src/components/panel/DealDetail.tsx`
- Modify: `src/components/panel/KanbanBoard.tsx`
- Modify: `src/app/[lang]/dictionaries/az.json`
- Modify: `src/app/[lang]/dictionaries/en.json`

**Interfaces:**
- Consumes: `PanelDict` in `src/components/panel/types.ts`
- Produces: Dictionary-driven `PlansTab` contact links (`/${lang}#contact`), honest `ChannelsTab` webhook copy UI, honest `AiTab` scenario preview UI, and zero ESLint errors/warnings.

- [ ] **Step 1: Move all fallback Azerbaijani strings in `PlansTab.tsx`, `ChannelsTab.tsx`, `AiTab.tsx`, and `LoginGate.tsx` into `az.json` / `en.json` and align button/link labels with `tests/e2e/panel.spec.ts`**
- [ ] **Step 2: Fix `react-hooks/set-state-in-effect` in `DealDetail.tsx` and `react-hooks/preserve-manual-memoization` in `KanbanBoard.tsx`**
- [ ] **Step 3: Run `npm run lint` and verify 0 errors and 0 warnings**

### Task 4: Move Remaining Hardcoded Azerbaijani Copy in Subpages & Marketing Components to Dictionaries

**Files:**
- Modify: `src/app/[lang]/ai/page.tsx`
- Modify: `src/app/[lang]/blog/page.tsx`
- Modify: `src/app/[lang]/booking/page.tsx`
- Modify: `src/app/[lang]/channels/[slug]/page.tsx`
- Modify: `src/app/[lang]/contact/page.tsx`
- Modify: `src/app/[lang]/demo/page.tsx`
- Modify: `src/app/[lang]/inbox/page.tsx`
- Modify: `src/app/[lang]/pipeline/page.tsx`
- Modify: `src/app/[lang]/pricing/page.tsx`
- Modify: `src/app/[lang]/product/page.tsx`
- Modify: `src/app/[lang]/scenarios/fitness-centers/page.tsx`
- Modify: `src/app/[lang]/tools/page.tsx`
- Modify: `src/components/marketing/InboxShowcaseClient.tsx`
- Modify: `src/components/marketing/PipelineFocusClient.tsx`
- Modify: `src/components/marketing/ProductViewSwitcherClient.tsx`
- Modify: `src/app/[lang]/dictionaries/subpages-az.json`
- Modify: `src/app/[lang]/dictionaries/subpages-en.json`

**Interfaces:**
- Consumes: `d.subpages` from `getDictionary(lang)`
- Produces: Zero offenders in `src/app/[lang]/i18n-guard.test.ts` and unified canonical pilot pricing (100/160/240 AZN monthly, 90/145/215 AZN 6-month, 80/130/190 AZN annual) on `/[lang]/pricing`.

- [ ] **Step 1: Extract hardcoded Azerbaijani strings from the 15 marketing/subpage files into `subpages-az.json` and `subpages-en.json` (and align `/pricing` tier prices with landing/panel)**
- [ ] **Step 2: Run `npx vitest run src/app/[lang]/i18n-guard.test.ts` and verify PASS**
- [ ] **Step 3: Run full `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run e2e` to verify end-to-end green status**
