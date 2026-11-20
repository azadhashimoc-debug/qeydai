# QeydAI Programmatic SEO Blueprint (`programmatic-seo`)

Deferred post-MVP SEO expansion. Never publish thin doorway pages; every page requires unique Baku learning-center workflows, real sample schedules, and verified schema markup.

## Hub-and-Spoke Architecture

- **Hub (`/az/heller` / `/en/solutions`)**: Overview of QeydAI automated trial-lesson booking + CRM.
- **Spokes (`/az/heller/[niche]`)**:
  1. `ielts-ve-dil-kurslari` — Level test scheduling, morning/evening group capacity caps.
  2. `abituriyent-hazirligi` — Parent WhatsApp updates, subject group conflict prevention.
  3. `it-ve-proqramlasdirma` — Bootcamp cohort waitlists, technical intro call booking.
  4. `usaq-inkisaf-merkezleri` — Age-group seat limits, sibling phone deduplication handling.

## Quality & Cannibalization Guardrails

- Target 1 primary intent per URL; canonical + `hreflang` (`az` / `en` / `x-default`) matching `src/app/[lang]/layout.tsx`.
- Reuse `Organization`, `SoftwareApplication`, and niche-specific `FAQPage` JSON-LD with escaped `<`.
- Gate indexing behind `>= 600` words of authentic Azerbaijani copy reviewed against `brand/VOICE.md`.
