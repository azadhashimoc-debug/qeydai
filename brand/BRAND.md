# panelim.az Brand

Product: **panelim.az** — messaging-first AI sales & booking CRM for Azerbaijani businesses (learning centers, service providers, retail teams).

Visual direction: crisp light SaaS canvas with soft lavender-periwinkle mesh gradients, deep indigo (`#0E0142`) anchor surfaces, cobalt-indigo (`#3046E8`) primary actions, and mint-emerald (`#137547` / `#C6F7DC`) positive highlights.

## Palette (CSS tokens in `src/app/globals.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--cover` | `#0E0142` | `#0E0142` | deep indigo CTA & footer frame, dark hero accents |
| `--blue` (`brand`) | `#3046E8` | `#3046E8` | primary CTAs, active tabs, focus ring on light |
| `--pen` | `#2C40D0` | `#9FA8FF` | interactive links, step accents |
| `--margin` | `#B8254B` | `#FF85A1` | urgent/hot indicators, alerts |
| `--stamp` | `#137547` | `#5AE0A0` | confirmed status, ROI & feature highlights |
| `--marker` | `#FFE45C` | `#FFE45C` | focus ring on dark surfaces, highlight badges |
| `--bg` / `--surface` | `#F8F9FF` / `#FFFFFF` | `#090624` / `#130F3A` | page canvas & elevated cards |
| `--ink` / `--muted` / `--line` | `#0E0142` / `#4A4F75` / `#DFE3F5` | `#EEF0FF` / `#A8AFDA` / `#2A255E` | text hierarchy & subtle dividers |

Dark mode follows `prefers-color-scheme`; `data-theme="light|dark"` on `<html>` forces it.

## Typography
- `Plus Jakarta Sans` (`--font-display`, `latin` + `latin-ext`): display headings, section titles, navigation, and CTA buttons (full coverage of `ə ı ğ ö ü ç ş`).
- `Inter` (`--font-body`, `latin` + `latin-ext`): body copy, form controls, UI tables, and chat previews.

## Voice
- **AZ:** Natural, clear, concise Azerbaijani. Direct active verbs, zero hype or unverified claims.
- **EN:** Concrete, plain business English. Always state pilot terms and channel approvals transparently.
