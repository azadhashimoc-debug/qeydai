# QeydAI competitor research (2026-11-18)

Method: web search (vendor and comparison pages) and Meta Ad Library, country filter Azerbaijan, active ads only, read in a browser. Apify scraping was blocked (free plan monthly usage exhausted), so Instagram profile metrics (followers, engagement) were NOT collected.

Caveat: most global sources are vendor marketing pages. Their claims (conversion gains, rankings) are unverified. Ad counts in Ad Library are approximate ("~180") and show only currently active ads.

## 1. Who actually competes with QeydAI

### Global (WhatsApp / Instagram chatbots and CRM for education)
| Product | What it is | Note |
|---|---|---|
| Manychat | Instagram/WhatsApp automation | Cheapest entry; WhatsApp needs the paid Pro plan (about 29 USD/month, per a 2026 comparison). Generic, not education-specific. |
| Kommo | Messenger-based CRM | Has a Baku partner (Buta Grup). No active Kommo ads found in Azerbaijan. |
| Wati | WhatsApp team inbox and bots | 100+ integrations; edtech page. |
| ChatDaddy | WhatsApp CRM with AI admissions chatbot | Claims 25-40% enrollment gains (self-reported, unverified). |
| Umai CRM (Kazakhstan) | CRM for kids/education centers: leads, WhatsApp + Instagram, AI chatbot, schedule, attendance | Closest product shape to QeydAI. Russian-speaking market. |
| WAzion, Landbot, Clint, TeleCRM, Chakra | WhatsApp chatbots / coaching-center CRM | Other regions (India, Brazil, Spain). |
| ZapUp | AI agents on WhatsApp, Instagram, Telegram | Was running ads that reach Azerbaijan (Black Friday "80% off" offer, Nov 2026). Generic. |

### Azerbaijan
- Bitrix24 ranks first among CRM systems detected on Azerbaijani sites (one tracker; CRM present on only 0.8% of sites).
- Local integrators: Buta Grup (Kommo partner, CRM consulting), Reelpresso CRM, Odify (Odoo partner), Cybernet (CRM product listing).
- **Not found:** an Azerbaijani-language, education-specific AI enrollment assistant. This looks like the open gap, but it is an absence of search results, not proof. Confirm by asking learning-center owners what they use today.

### Meta Ad Library, Azerbaijan, active ads (checked 2026-11-18)
| Keyword | Result |
|---|---|
| kommo | 0 ads |
| çatbot | ~4 ads, all ABB bank (Telegram chatbot for a card, not a vendor) |
| manychat | ~7 ads: one foreign Instagram-growth course advertiser and ZapUp |
| CRM | ~400 ads, mostly Brazilian doctors (CRM = medical license number). Noise. |
| tədris mərkəzi | ~180 ads, all learning centers (see below) |

Reading: no chatbot/CRM vendor is advertising to Azerbaijani learning centers in Azerbaijani right now. Paid competition in the local language looks thin.

## 2. Who QeydAI would sell to (centers advertising now)
Seen in the ads: EDUGrata (1 online + 8 branches in Baku), Stimul Academy, British Academy Nərimanov, Glodemia (IELTS, Digital SAT), Inqilab, BRIDGE Academy (ACCA), Hamburg Academy (German), TURAN N.1, Master Class, Informatika Mərkəzi (Sumqayıt), Təkan (Tovuz), İATM, Talant (music), Azeredu (DİM prep), Landau School.

### Patterns that show the pain QeydAI solves
1. **Inquiry handling is manual.** Calls to action are phone numbers, "write + in the comments", "DM us", or a WhatsApp click-to-chat button. Several ads list 2-3 phone numbers.
2. **WhatsApp click-to-chat is common** (api.whatsapp.com links), so centers already send traffic into WhatsApp.
3. **Free first lesson and discounts are the hook:** "first lesson free", "bring a friend, up to 30% off", a 30 AZN entry price, early-registration discounts. QeydAI must never invent such offers; it should read them from the approved course table.
4. **Seasonality:** DİM / buraxılış prep and the 2026-2027 school year (September onward), IELTS and SAT, MİQ. Good timing for the pilot pitch and for content.
5. **Social proof sells:** exam-score congratulation posts (IELTS 8.0, SAT 1570).
6. **Bilingual copy** (AZ + RU) appears in at least one ad. Consider Russian as a later language.

## 3. Pricing signal (weak)
- Our assumed 350 AZN setup + 100 AZN/month is NOT market-validated.
- Manychat's WhatsApp tier (about 29 USD/month) and a Baku CRM implementation range from a catalog (values shown without a clear currency/unit) are the only price hints found. Treat both as unreliable.
- Next step: ask 5 centers what they pay today for CRM/ads/admin staff.

## 4. What was not done
- Instagram profile data (followers, post cadence, engagement) for any competitor. Needs Apify credits or manual review.
- Ad history for global vendors' own pages (Manychat, Kommo, Intercom) across all countries.
- Verification of competitor features and prices on their own sites.
- Sample is small and a snapshot of one day.

## 5. Implications for QeydAI
- Position on: Azerbaijani natural language, trial-lesson booking with real seat checks, duplicate blocking, manager handoff. Umai CRM is the nearest feature match but not Azerbaijani.
- Messaging to centers: "your ad sends people to WhatsApp or a phone number; who answers at 23:40?"
- Do not compete on price with Manychat; compete on fit and local language.
- Validate with 5 owner interviews before fixing the 350/100 AZN offer.

## Sources
- WhatsApp CRM for Education (ChatDaddy): https://chatdaddy.tech/blog/whatsapp-crm-education
- Best WhatsApp chatbots for education 2026 (Hackceleration): https://hackceleration.com/labs/best/whatsapp-chatbots-education
- Umai CRM: https://www.umaicrm.kz/en
- Wati edtech page: https://www.wati.io/geo/blog/best-whatsapp-tool-automating-learner-support-edtech
- Kommo partner Buta Grup: https://www.kommo.com/partners/buta-grup-as/
- CRM in Azerbaijan (tracker): https://www.wmtips.com/technologies/crm/country/az/
- Meta Ad Library: https://www.facebook.com/ads/library/ (filters: country Azerbaijan, active ads)
