# panelim subpages — progress

**Branch:** `feat/panelim-subpages`

## Task 7: Dictionary shape fixes (pages)

All subpage page TS type errors resolved:

| File | Fix |
|---|---|
| `src/app/[lang]/login/page.tsx` | AuthSplitClient copy mapped from `login` dict keys; `showKey`/`hideKey` from dict (fixed i18n-guard diacritics) |
| `src/app/[lang]/register/page.tsx` | `reg.hasAccountText` → `reg.hasAccount`; removed `s.common.contactNote` |
| `src/app/[lang]/demo/page.tsx` | LeadForm labels: `nameLabel`→`name`, `phoneLabel`→`phone`, `submitting`→`sending`, removed `privacyNote`; added `nameRequired` |
| `src/app/[lang]/contact/page.tsx` | Same LeadForm label fixes as demo |
| `src/app/[lang]/pricing/page.tsx` | Removed unused import |
| `src/app/[lang]/channels/page.tsx` | `ctaPrimary`/`ctaSecondary` → `hero.primaryCta`/`secondaryCta` |
| `src/app/[lang]/product/page.tsx` | `heading={p.modules.title}` → `heading={p.hero.title}` |

## Task 8: Component shape fixes

| File | Fix |
|---|---|
| `src/components/marketing/PricingMatrixClient.tsx` | Rewrote `matrix.categories.X.features.Y {name, desc}`; openGroups keys `channels`/`crm`/`aiBooking`/`support` |
| `src/components/marketing/AuthSplitClient.tsx` | Removed `userLabel`/`userPlaceholder`/`showKey`/`hideKey`/`securityNote`; uses `keyLabel`/`keyPlaceholder`/`noAccount`/`registerLink`/`highlightsTitle` |
| `src/components/marketing/SiteFooter.tsx` | Fixed key refs `cols.productCol`/… → `cols.cols.product`/… |

## Task 9: Sitemap + e2e tests

| File | Fix |
|---|---|
| `src/app/sitemap.ts` | Added `/login`, `/register` to `STATIC_SUBPAGE_SUFFIXES` |
| `tests/e2e/subpages.spec.ts` | All subpages HTTP 200, 404 for unknown slugs, WhatsApp tools, demo lead form, login/register flow, sitemap URLs |

## Dictionary edits

| File | Edit |
|---|---|
| `src/app/[lang]/dictionaries/az.json` | Added `nameRequired` to `demoPage.form` + `contactPage.form` |
| `src/app/[lang]/dictionaries/en.json` | Added `nameRequired` to `demoPage.form` + `contactPage.form` |

## Verification

- `npx tsc --noEmit` — clean (no errors)
- `npm run build` — passes
- `npm run lint` — passes on fixed files
- vitest: 4 pre-existing failures (rate-limit state leakage in `route.test.ts`, `route.review.test.ts`, `analytics/route.test.ts`), unrelated to Task 7/8/9
- i18n-guard: clean for subpage files (only pre-existing panel component offenders remain)

## Commit

- `5f901cd` feat(subpages): fix all TS type errors in Task 7/8 pages and components; add sitemap + e2e tests. Co-Authored-By: Claude Code <noreply@anthropic.com>
