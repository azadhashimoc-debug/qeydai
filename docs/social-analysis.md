# Instagram competitor analysis and winning content (2026-11-18)

## Method and limits (read first)
- Read-only viewing of three public Instagram profiles in a browser, **Reels tab** (the only tab that shows view counts). Photo and carousel posts show no counts in the UI, so they are not ranked.
- Snapshot of one day, last 12 reels per account. Very small sample. Treat the patterns as hypotheses to test, not facts.
- Instagram's unofficial profile endpoint was NOT used (the action was blocked and I did not work around it). Apify is out of quota. So there is no engagement rate, no posting-frequency series, no Azerbaijani competitor beyond one center.
- "Winner" here = reel with views far above that account's own median.
- Umai CRM: the view counts were read in tab order and matched to captions by order. Exact caption-to-count matching for Umai is an assumption.

## Accounts
| Account | Role for QeydAI | Followers | Reel median views | Top reel |
|---|---|---|---|---|
| @manychat | global tool, creator audience | 675K | ~14.7K | 161K (about 11x median) |
| @umai_crm | closest product (CRM for learning centers, CIS) | 599 | ~184 | 387 (about 2x) |
| @edugrata | Azerbaijani center, target customer (9 branches, Baku) | 64.4K | ~6.4K | 423K (about 67x) |

Umai has almost no organic audience (599 followers). Its growth comes from paid ads plus a founder-style persona page (see competitor-research.md). Its organic content is a useful **message test**, not proof of reach.

## What won, per account
### Manychat
1. **161K:** podcast clip with a person on camera and a number-based result hook ("100K Followers in 10 Days"). Next best 28.5K, rest 11-20K.
2. Mid performers (14-20K): short podcast clips with a punchy caption, a seasonal skit.
3. Weak (11-12K): holiday jokes, creator shout-outs, news graphics.

### Umai CRM (top to bottom)
1. **387:** parent writes at 22:40 to your center and two others; by morning she is enrolled where someone answered. (Night-inquiry story.)
2. **292:** how to track inquiries so none gets lost (WhatsApp, Instagram, notebook, Excel, admin's head).
3. **263:** testimonial reel ("100+ centers use Umai").
4. **201 / 196:** why parents do not buy a subscription after the trial; Umai vs a named competitor (4 features, incl. a WhatsApp AI bot that answers at night and books a trial).
5. Weak (86-117): partner announcement, "go on vacation" tips.

### EDUGrata (Azerbaijan)
1. **423K (pinned):** "Do not miss the chance to study at boarding gymnasiums": opportunity and deadline feel, real children at a real school, search-style topic.
2. **119K (pinned):** a student explaining a problem + "registration for the Russian-section groups is open".
3. **59.9K:** staff member speaking to camera about exam results with score boards behind her; question hook ("have you ever felt ...?").
4. Typical (3-9K): contest countdowns, ceremonies, teachers' day graphics, event recaps.

## Patterns that repeat (hypotheses)
1. **Result or outcome in the hook, with a number or a named opportunity** (Manychat 10 days, EDUGrata boarding gymnasium).
2. **A scene from the customer's own day**, not a feature (Umai 22:40 parent).
3. **A real person talking to camera** beats a designed graphic (Manychat, EDUGrata 59.9K).
4. **Open registration plus a clear next step** on real classroom footage (EDUGrata 119K).
5. **Proof**: scores, named students, testimonials.
6. **Losers:** announcements, partner news, holiday graphics, ceremonies, designed quote cards.

## What this means for QeydAI content (month-1 pack)
Already aligned: Day 1 (night parent) and Day 26 (23:40 to 10:00) match the best Umai angle; Day 13 (50 people, 10 seats test) is a proof format; Days 29 and 5 (full group / last seat) are scarcity moments.
Suggested changes to test, not yet applied to the pack:
- Turn Days 1, 5 and 26 into **screen-recorded reels** of the demo chat with a person on camera in the first 2 seconds (we have only still images and text today).
- Put a **number or named situation in the hook** ("38 unread messages", "last seat, two people at once") instead of generic titles. Use only numbers we can show (demo data or a real pilot).
- Add **after-trial follow-up** content (Umai's #4) and a **"what an admin loses to Excel"** piece; both are proven angles and fit our product.
- Add **proof** content as soon as a pilot center gives real numbers (with their consent).
- Reduce announcement-style posts (Days 3, 7, 28 are informational and likely to underperform).
- Do not name competitors in comparison reels without legal review; Umai does it, but it is a risk.
- For Azerbaijani centers as the audience: hooks about admission windows (January groups, DİM, IELTS dates) and real-student results are what move views in this market.

## How to test (first 2 weeks after launch)
- Post 3 formats x 2 each: (a) customer-day scenario reel, (b) number-hook reel, (c) designed graphic as the control.
- Judge by views divided by followers and by saves/shares, not likes. Keep the account's own median as the baseline.
- Keep what beats the median by 3x or more; drop the rest.

## Not done
- No Azerbaijani competitor software account found (none exists in search; see competitor-research.md).
- Only one Azerbaijani center analysed (EDUGrata). Other centers seen in ads (Glodemia, Stimul Academy, British Academy, Landau) not analysed.
- TikTok and Telegram channels not analysed.
- Carousels and photo posts not ranked (no public counts).
