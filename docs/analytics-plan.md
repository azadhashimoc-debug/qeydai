# QeydAI Analytics Tracking Plan

Last updated: 2026-11-18

## Overview
- Architecture: First-party privacy-safe event pipeline (`POST /api/analytics` -> `data/analytics.jsonl`) + `window.dataLayer` compatibility for future GA4 / GTM attachment (no paid third-party tools, zero PII).
- Core Web Vitals: `useReportWebVitals` from `next/web-vitals` (`TTFB`, `FCP`, `LCP`, `CLS`, `INP`).
- Privacy rules:
  - Never record PII (`name`, `phone`, `email`, raw IP, or free-text form input).
  - Honor browser `navigator.doNotTrack === "1"`.
  - Only collect events and properties defined in the allowlist below.

## Marketing & Conversion Events

| Event Name | Category | Properties | Trigger | Decision Informed |
|---|---|---|---|---|
| `page_viewed` | navigation | `locale`, `path`, `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?`, `utm_term?`, `referrer_host?` | Initial mount on `/[lang]` | Compare AZ vs EN traffic and UTM campaign attribution |
| `cta_clicked` | engagement | `locale`, `location`, `target` | Click on header, hero primary, hero secondary, pricing, or mobile sticky CTA | Identify highest-converting CTA placements |
| `language_switched` | navigation | `from_locale`, `to_locale`, `location` | Click header locale toggle | Measure cross-locale switching rate |
| `faq_toggled` | engagement | `locale`, `faq_id`, `open` | Toggle `<details>` item in `#faq` (`q1`-`q5`) | Identify top buyer objections |
| `scroll_depth_reached` | engagement | `locale`, `depth` (`25 \| 50 \| 75 \| 100`) | Scroll crosses threshold (once per page view per depth) | Measure content engagement and drop-off depth |
| `lead_form_started` | conversion | `locale` | First focus/input inside `#contact` form | Measure form start rate vs page views |
| `lead_form_submitted` | conversion | `locale`, `utm_source?`, `utm_medium?`, `utm_campaign?` | `POST /api/lead` returns HTTP 200 | Primary conversion count by locale and campaign |
| `lead_form_failed` | system | `locale`, `reason` (`name_required \| invalid_phone \| rate_limited \| server_error \| network_error`) | Client validation failure or `/api/lead` non-2xx response | Diagnose form UX friction and error rates |
| `web_vital_measured` | performance | `locale`, `metric` (`TTFB \| FCP \| LCP \| CLS \| INP`), `value`, `rating` | `useReportWebVitals` callback | Monitor real-user Core Web Vitals by locale |

## UTM Naming Convention
- All lowercase, underscore-separated (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`).
- Examples:
  - Meta ads: `utm_source=meta&utm_medium=cpc&utm_campaign=az_pilot_nov&utm_content=var_a`
  - Google Search: `utm_source=google&utm_medium=cpc&utm_campaign=search_ielts_center&utm_term=tedris_merkezi_crm`
  - Instagram bio/posts: `utm_source=instagram&utm_medium=social&utm_campaign=month1_d05`

## Verification Checklist
- [ ] Only allowlisted event names and property keys accepted by `/api/analytics`
- [ ] Zero PII stored in `data/analytics.jsonl` or pushed to `window.dataLayer`
- [ ] Same-origin, `Content-Type: application/json`, 1 KB size cap, and rate limiting enforced on `/api/analytics`
- [ ] Unit tests cover event validation, PII rejection, and API security checks
- [ ] E2E test verifies `page_viewed`, `cta_clicked`, `faq_toggled`, and `lead_form_submitted` dispatch without PII
