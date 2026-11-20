# QeydAI A/B Test Plan

Zero-flicker experiment attribution built on `src/lib/experiments/ab.ts` and `docs/analytics-plan.md`.
All variants stay server-static compatible (`cacheComponents: true`) until an active copy swap is enabled, with sticky assignment stored in `localStorage` (`qeydai_ab_<id>`) and QA preview overrides via `?ab_<id>=<variant>`.

## Experiment 1: `hero_cta_v1`

- **Hypothesis**: Because prospective learning center directors worry about setup friction and time commitment, changing the hero primary CTA framing from generic `"Demo istə"` / `"Request a demo"` (`control`) to outcome + time-boxed `"Pulsuz demo al — 15 dəq"` / `"Get a free 15-min demo"` (`benefit`) will increase hero CTA click-through and completed lead submissions by >=20%.
- **Traffic split**: 50% `control` / 50% `benefit` (sticky per browser via `localStorage`, degrades cleanly when storage is blocked).
- **Primary metric**: `lead_form_submitted` per `page_viewed` (by `exp` property).
- **Secondary metrics**: `cta_clicked` (`location="hero_primary"`), `lead_form_started`.
- **Guardrail metrics**: `web_vital_measured` (`CLS`, `LCP`, `INP` rating distribution), `lead_form_failed` rate.
- **Sample size target**: ~7,000 visitors per variant at 5% baseline conversion, 20% relative MDE, 95% confidence, 80% statistical power (minimum 2 full weekly business cycles before calling a winner).
- **QA preview**: Open `/az?ab_hero_cta_v1=benefit` or `/en?ab_hero_cta_v1=control` and inspect `exp` in `data/analytics.jsonl` or `window.dataLayer`.
