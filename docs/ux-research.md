# QeydAI UX Research Plan, Personas & Usability Guide

Date: 2026-11-18
Status: **Hypothesis / Unvalidated** (0 owner interviews conducted so far; built from `brief.md` and ad-pattern observations in `docs/competitor-research.md`). Do not treat persona attributes or conversion estimates as measured field data.

## 1. Research Objectives
1. Validate whether Azerbaijani learning-center owners lose evening/weekend leads before morning manual follow-up.
2. Measure how coordinators currently track trial-lesson capacities (paper register, Excel, Google Sheets, WhatsApp chat history) and where double-booking or missed follow-ups happen.
3. Test comprehension and trust on the redesigned QeydAI landing page (notebook/register visual language, AZ/EN copy, lead form friction).

## 2. Draft Personas (Hypotheses to Validate in 5+ Interviews)

| Attribute | Persona A: Center Director / Owner (Primary Buyer) | Persona B: Enrollment Coordinator (Daily Operator) | Persona C: Parent / Prospective Student (End User) |
|---|---|---|---|
| **Role** | Owns or runs a 1–3 branch language, IELTS, SAT, or DİM prep center in Baku/Sumqayıt | Answers WhatsApp/Instagram/calls, schedules trial lessons, hands leads to teachers | Messages at 21:00–00:30 from Instagram/Meta ads asking price, schedule, free trial |
| **Current workflow** | Pays for Meta ads (`api.whatsapp.com` links), checks daily spreadsheets or asks admin | Copies name/phone from WhatsApp into notebook or Excel; manually counts open seats | Sends "qiymət nədir?" or "+" comment; waits until next morning for reply |
| **Core pain** | Ad spend leaks overnight; no clear funnel from inquiry -> trial -> paid student | Repetitive price/schedule questions; duplicate bookings when two admins edit a sheet | Messages 2–3 centers at once; enrolls with whichever replies clearly first |
| **Trust trigger** | Sees exact approved prices/times only (zero AI hallucination), clean manager handoff | Simple status list without complex CRM menus | Fast, polite Azerbaijani reply with concrete trial slot confirmation |
| **Top objection** | "Will AI invent a wrong price or discount? Is my student list private?" | "Will this create double work alongside WhatsApp?" | "Am I talking to a real schedule or a dead bot?" |
| **Design implication** | Lead with deterministic seat-check proof (`Sınaq dərsləri` register) and human-handoff promise | Future F2/F4 panel needs single-screen status board (`new`, `trial_booked`, `paid`), zero clutter | Keep chat replies short (2–3 lines), confirm slot + seat count immediately |

## 3. Customer Journey Map (Current vs. QeydAI Target)

| Stage | Without QeydAI (Manual) | With QeydAI (Target Flow) | UX Opportunity / Risk |
|---|---|---|---|
| **1. Discovery** | Clicks Meta/Instagram ad -> lands on WhatsApp or DM | Same entry point (Telegram MVP, later WhatsApp/Instagram) | Do not force users off messaging apps |
| **2. First Inquiry (23:40)** | Unanswered until 10:00–11:00 next day | Instant Azerbaijani reply (<5s) answering price/schedule from center table | Risk: unnatural robotic phrasing -> mitigated by `brand/VOICE.md` |
| **3. Trial Slot Selection** | Back-and-forth "Hansı gün uyğundur?" across hours | AI offers open trial sessions with live remaining seats | Must filter started/full sessions deterministically (`enrollment.ts`) |
| **4. Booking & Confirmation** | Admin writes in paper register or forgets | Deterministic `/api/v1/enroll` reserves seat, blocks duplicate phone | Must handle `already_enrolled` and `session_full` gracefully with alternative slots |
| **5. Coordinator Handoff** | Admin scrolls chats to find phone numbers | Manager receives instant Telegram/lead notification with ready candidate | Next phase (F4): searchable CRM table |

## 4. Landing Page Usability Test Protocol (5 Participants, 15 min each, 0 AZN)

### Method
Moderated 1-on-1 screen-share or in-person test with 5 learning-center owners/coordinators before paid launch.

### Tasks
1. **5-Second Impression (`/az` above the fold):** Show hero for 5 seconds, hide it. Ask: *"Bu platforma nə edir və kim üçündür?"* Pass criterion: participant mentions learning centers + automated trial enrollment.
2. **Register Comprehension (`SeatBoard`):** Ask participant to explain what the `Sınaq dərsləri` card shows. Pass criterion: recognizes live seat ticking, last open seat highlight, and chat-to-booking flow without explanation.
3. **Price & Trust Check (`#pricing`, `#faq`):** Ask: *"Bot səhv qiymət və ya olmayan dərs vaxtı deyə bilərmi?"* Observe whether they find the FAQ answer and setup/monthly terms easily.
4. **Lead Form Completion (`#contact`):** Have participant request a demo on mobile (390px) and desktop. Watch for keyboard focus clarity, phone format confusion (`050 123 45 67`), and submission confirmation readability.
5. **Bilingual & Dark Mode Check:** Switch to `/en` and OS dark mode; verify legibility of red margin timestamps and ticks.

## 5. UX Success Metrics (Pre-Launch -> Pilot)
- **Hero clarity:** >=4/5 test users accurately state the product purpose in 5 seconds.
- **Lead form completion rate** (`lead_form_submitted / lead_form_started` from `POST /api/analytics`): baseline tracked locally; target >=60% form completion among starters.
- **Zero accessibility blockers:** WCAG AA contrast >=4.5:1 text / >=3:1 focus ring (enforced automatically by `design-tokens.test.ts` and `tests/e2e/landing.spec.ts`).
