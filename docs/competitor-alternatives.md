# QeydAI Competitor & Alternatives Positioning Guide

Date: 2026-11-18
Constraints: Grounded in `docs/competitor-research.md`. **Zero competitor copying** (`brief.md`); **do not publish** comparison pages with unverified competitor prices or SLA claims until verified directly on each vendor's official pricing page.

## 1. Positioning Summary
QeydAI does not try to out-feature global generic chatbot builders or full-stack school ERPs. Its wedge is narrow and concrete:
- **Natural Azerbaijani language** (including typos, colloquial phrasing, AZ/EN support) grounded strictly in each center's approved course/price/schedule table.
- **Deterministic trial-lesson enrollment** (real capacity check, atomic last-seat protection, duplicate phone blocking, started-session rejection) rather than free-form AI text promises.
- **Clean coordinator handoff** so center staff talk to booked, qualified candidates instead of answering "qiymət neçədir?" at midnight.

## 2. Honest Competitive Comparison

| Dimension | QeydAI (MVP Scope) | Manychat | Kommo | Umai CRM (KZ) | Manual WhatsApp + Excel |
|---|---|---|---|---|---|
| **Primary job** | AI inquiry reply + deterministic trial booking | Generic IG/WA keyword & flow builder | General messenger CRM + sales pipeline | Full back-office ERP/CRM for education (RU/KZ) | Human replies + spreadsheet tracking |
| **Azerbaijani AI fit** | Built specifically for AZ learning-center phrasing | Generic flows; AI requires custom setup | Generic; no AZ education focus observed | Russian/Kazakh market focus | Native (human), but zero scale/overnight delay |
| **Deterministic seat capacity** | Built-in (`enrollment.ts`, atomic last seat) | Not native (needs external webhook/DB) | Not native (pipeline stages, not seat locks) | Attendance/schedule module included | Manual counting; prone to double-booking |
| **Back-office (attendance, billing)** | Not in MVP (F4 planned) | None | Pipeline CRM only | Strong (debts, attendance, branches) | Manual Excel |
| **Pricing model** | Placeholder `350 + 100 AZN` (**unverified**) | Search ref: ~29–39 USD/mo Pro + Meta fees (**unverified**) | Search ref: ~25–45 USD/user/mo (**unverified**) | Search ref: ~19,990–29,990 KZT/mo (**unverified**) | Staff salary + lost night leads |

## 3. Who Should Choose What (Honest Fit)

### Choose QeydAI if:
- You run an Azerbaijani learning center losing Instagram/WhatsApp/Telegram inquiries at night or during peak hours.
- You want an AI assistant that **never invents prices, discounts, or schedules** and locks real trial-lesson seats deterministically.
- Your team wants ready-to-call candidates without learning a complex multi-menu CRM.

### Choose an Alternative if:
- **Manychat:** You only need simple Instagram comment-to-DM keyword triggers ("comment + to get PDF") in English/Russian and have someone to build flows yourself.
- **Kommo:** You already work with a local Baku integrator (e.g., multi-industry B2B sales pipelines) and need complex multi-stage sales CRM more than education seat-booking.
- **Umai CRM:** You operate in Russian/Kazakh and need full post-enrollment back-office (student attendance, debt tracking, teacher payroll) today rather than front-door AI sales capture.

## 4. Future Comparison Page Blueprints (Draft — Hold Until Pricing Verified)

When QeydAI moves past pilot validation and launches SEO comparison pages (see `docs/programmatic-seo-plan.md`), build only modular, honest pages backed by verified vendor rate cards:
1. **`/[lang]/alternatives/manychat`** — Angle: *Why generic Instagram flow builders still drop trial-lesson bookings without a seat table & Azerbaijani NLU.*
2. **`/[lang]/vs/kommo`** — Angle: *Messenger CRM vs. deterministic trial-enrollment assistant (and per-seat vs. center-level pricing).*
3. **`/[lang]/vs/umai-crm`** — Angle: *Front-door Azerbaijani AI enrollment vs. Russian/Kazakh back-office school ERP (and what migrates from Excel).*

### Migration Story (From Manual WhatsApp + Excel -> QeydAI)
1. **Transfers in <15 minutes:** Course names, prices, trial-lesson dates, capacities (seeded into sessions store).
2. **Stays untouched:** Your existing WhatsApp number or Telegram channel; managers keep full override control.
3. **Zero lock-in:** Center leads and session records stay exportable per tenant.

## 5. Verification Checklist Before Publishing Any Comparison Page
- [ ] Re-verify competitor tier prices directly on `manychat.com/pricing`, `kommo.com/pricing`, `wati.io/pricing`, `umaicrm.kz`.
- [ ] Re-verify Meta WhatsApp Business Platform Azerbaijan rate card directly on Meta's official pricing docs.
- [ ] Replace placeholder QeydAI prices with pilot-validated numbers.
- [ ] Confirm zero copied copy, layouts, or brand assets from any competitor.
