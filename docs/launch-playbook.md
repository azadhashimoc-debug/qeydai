# QeydAI Launch, Paid Ads & Email Playbook (Draft)

All paid budgets and external launches remain at **0 AZN / unexecuted** until explicit user approval.

## 1. ORB Launch Strategy (`launch-strategy`)

- **Owned**: `qeydai` bilingual landing (`/az`, `/en`), SEO blog (`content/month-1/blog/`), demo email/WhatsApp follow-up list.
- **Rented**: Instagram Reels & Carousel (Baku learning center audience), TikTok short clips, Telegram channel. Every post funnels back to `/az#contact` or a Telegram demo bot.
- **Borrowed**: Co-demos with 3–5 Baku IELTS/IT center founders; before/after enrollment case studies (only after real pilot metrics exist).

### Phased Rollout

1. **Internal (0 AZN)**: Seed demo DB (`npm run seed:demo`), import `n8n/workflows/*.json`, verify Telegram -> `/api/v1/enroll` with test phone numbers only.
2. **Alpha (3–5 pilot centers, 0 AZN ad spend)**: 1-on-1 WhatsApp/in-person onboarding in Baku; measure missed-inquiry recovery and double-booking blocks.
3. **Beta**: Publish `/az` + `/en` landing, enable `hero_cta_v1` A/B test (`docs/ab-testing.md`), publish 30-day social pack (`content/month-1/`).
4. **Full Launch**: Open paid acquisition once organic/pilot conversion rate (`lead_form_submitted / page_viewed`) and onboarding time are verified.

## 2. Paid Ads Architecture (`paid-ads`, Unapproved Draft)

Start only after conversion tracking (`POST /api/analytics` + GA4/Meta Pixel if approved) is verified.

- **Meta (Instagram/Facebook — demand generation in Baku)**:
  - Campaign: `META_Leads_Baku-EduDirectors_Demo_2026Q4`
  - Split: 70% proven Problem-Agitate-Solve ("Axşam 21:00 mesajı səhərə qalsa, tələbə rəqibə gedir") / 30% creative tests (SeatBoard demo video vs. static ledger).
  - Placements: Reels + Feed vertical/square; exclude existing leads (7–30 day window).
- **Google Search (high-intent capture)**:
  - Campaign: `GOOG_Search_KursCRM-AZ_Demo_Ongoing`
  - Keyword clusters (`content/month-1/seo-keywords.md`): `"tədris mərkəzi proqramı"`, `"kurs crm"`, `"tələbə qeydiyyatı sistemi"`.
  - Use negative keywords (`pulsuz pdf`, `iş elanları`, `dövlət imtahan mərkəzi`) before launch.

## 3. Lifecycle Email & Message Sequences (`email-sequence`)

Base templates exist in `content/month-1/email/` (`demo-welcome`, `pilot-offer`, `bot-quick-replies`). Extend with 3 lifecycle triggers:

1. **Demo Welcome (Immediate, Day 0 -> Day 2 -> Day 5)**:
   - Email 1 (Day 0): Confirm demo slot + 1 question ("Hansı kanaldan daha çox müraciət gəlir: Instagram, WhatsApp yoxsa Telegram?").
   - Email 2 (Day 2): 90-second SeatBoard walkthrough showing last-seat lock (`409 full` / `duplicate`).
   - Email 3 (Day 5): Pilot offer with 14-day setup checklist (`pilot-offer.md`).
2. **Pilot Onboarding (Day 0, Day 3, Day 10)**:
   - Day 0: Collect course timetable + capacity rules.
   - Day 3: First 10 real inquiries reviewed (`enrolled` vs. `handoff`).
   - Day 10: Weekly missed-inquiry & seat-utilization summary.
3. **Win-Back (Day 14 / Day 30 inactive leads)**:
   - Short plain-text check-in with one CTA (`15 dəqiqəlik canlı sınaq`).
