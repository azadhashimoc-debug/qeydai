# QeydAI Pricing Strategy & Validation Plan

Date: 2026-11-18
Status: **Draft / Unverified**. All numeric prices currently shown on the landing page (**350 AZN setup + 100 AZN/month**) are **unverified placeholder assumptions** without market or unit-economics validation. Budget constraint: **0 AZN** (`brief.md`); no paid billing or external services may be activated without user approval.

## 1. Current State & Gaps
- **Placeholder offer on landing page:** `350 AZN` one-time setup + `100 AZN/month` service fee, with WhatsApp Meta message fees noted as billed separately.
- **What is NOT verified yet:**
  1. Willingness to pay (WTP) of Baku and regional learning centers (single-branch vs. multi-branch).
  2. Exact Meta WhatsApp Business Platform utility/marketing template fees for Azerbaijan (third-party calculators suggest ~0.0212 USD/utility and ~0.086 USD/marketing, **unconfirmed on Meta's official rate card** — see `docs/competitor-research.md`).
  3. Monthly Gemini API token cost and VPS hosting cost per active tenant at realistic inquiry volumes.

## 2. Three Pricing Axes

### Axis 1: Value Metric
Charge on a metric that scales visibly with center revenue rather than per-admin-seat (Kommo charges per user, which penalizes centers with 3–5 coordinators):
- **Primary candidate:** Active branch / channel package + included monthly confirmed trial enrollments or AI conversations (soft cap with transparent overage or tier step-up).
- **Pass-through variable cost:** Meta WhatsApp Cloud API conversation/template fees billed transparently at Meta cost (never hidden inside a flat 100 AZN fee, because 1,000+ reminder templates/month could consume >35% of 100 AZN).

### Axis 2: Packaging (Good-Better-Best Hypothesis — To Validate)

| Tier (Hypothesis) | Target Segment | Included Scope | Support & Onboarding | Status |
|---|---|---|---|---|
| **Pilot / Başlanğıc** | Single-branch center testing Telegram/web | 1 branch, Telegram AI assistant, deterministic seat/duplicate checks, coordinator notifications | Guided setup on center's real course sheet | **Unverified** — test 7-day free or low-risk pilot |
| **Mərkəz (Core / Anchor)** | Active center running Meta/IG ads (1–2 branches) | Telegram + WhatsApp Cloud API / Instagram DM (post-MVP), CRM & conversion funnel (F4), waiting list | Setup + course schedule updates | **Unverified** (currently represented by 350/100 AZN placeholder) |
| **Şəbəkə (Multi-branch)** | 3+ branches (e.g., chains like EDUGrata scale) | Multi-branch tenant isolation, branch-level analytics, custom handoff rules | Priority support, quarterly review | **Unverified** — custom quote |

### Axis 3: Price Point & Unit Economics Guardrails
Before locking any monthly price:
1. **Calculate COGS floor per tenant/month:** `Hosting share + Gemini API tokens (system prompt + 4-6 turns/lead) + Support hours`.
2. **Keep Meta WhatsApp fees separate** (customer pays Meta directly via Business Manager) so high reminder volume never creates negative margin on QeydAI's subscription.
3. **Setup fee role:** Covers one-time course/schedule structuring, prompt calibration, and channel verification. Test whether waiving or crediting setup toward a 3-month commitment increases pilot conversion (competitor Umai CRM offers a 7-day free trial with Excel migration).

## 3. Validation Research Plan (0 AZN, 5–10 Owner Interviews)

### Van Westendorp Questions (for Learning Center Owners)
Ask after showing a live 3-minute Telegram + register demo using their own course list:
1. **Too cheap:** *"Aylıq hansı qiymətə QeydAI sizə şübhəli dərəcədə ucuz görünər (keyfiyyətinə inanmazsınız)?"*
2. **Bargain / Good value:** *"Hansı qiymətə bunu mərkəziniz üçün çox sərfəli fürsət sayarsınız?"*
3. **Getting expensive:** *"Hansı qiymətdə 'bir az bahadır, amma yenə düşünərəm' deyərsiniz?"*
4. **Too expensive:** *"Hansı qiymətdən yuxarı qətiyyən almazsınız?"*

### Gabor-Granger Follow-Up on Setup Fee
Test pilot conversion sensitivity at three setup structures:
- Option A: `350 AZN` setup + `100 AZN/month` (current placeholder)
- Option B: `0 AZN` 7-day pilot -> `X AZN` setup only if continuing
- Option C: Higher monthly (`Y AZN/month`), `0 AZN` setup with 3-month minimum

## 4. Pricing Page Rules Until Validated
- Keep `"İlkin təklifdir, pilot mərkəzlərlə birlikdə dəqiqləşdirilir"` (`pricing.note`) visible above/beside every price figure.
- Keep `"WhatsApp mesaj xərcləri (Meta tarifi) ayrıca hesablanır və əvvəlcədən göstərilir"` (`pricing.extra`) explicit.
- Never run live A/B price tests showing different prices to different visitors simultaneously (trust risk in a tight local market like Baku).
