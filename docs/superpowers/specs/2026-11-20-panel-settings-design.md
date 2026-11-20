# Panel settings reference design

## Intent

Bring the reference settings layout into the existing authenticated QeydAI panel. Preserve QeydAI branding, real account data, and existing workspace permissions. The reference image supplies layout and control coverage, not sample identities or production capabilities.

## Approaches

- Selected: extend the existing settings tab, reuse workspace and member forms, and save profile and notification preferences in the current browser. This covers the reference layout without implying that delivery is live.
- Deferred: build an account profile service and notification providers. This requires verified email changes, delivery infrastructure, and separate rollout decisions. A static replica was rejected because the existing controls and navigation can work.

## Screen

- Desktop: QeydAI icon rail, grouped settings menu, profile heading and Save on one line, security notice, profile card, then two notification tables. Use dense, left-aligned rows, pale blue selection, a neutral canvas, and existing dark-theme tokens. On phones, stack the settings navigation and profile fields; only the notification tables may scroll horizontally.
- Provide profile initials or a locally selected image, authenticated member ID and copy action when available, AZ/EN switch, name, phone, read-only email state, note, and a compact or expanded rail in Settings. Do not import the reference's name, phone, email, avatar, logo, or default selections.
- Workspace settings and User management open their existing forms with existing permissions. AI settings and Billing open existing AI and Plans views. Chat, email, and security pages explain the unavailable features; the security notice links to Profile security.
- Advanced settings show activity limits, billing, calls, errors, inbox, mentions, team support chat, incoming email, incoming leads, four task/booking events, and a disabled scheduled report. Integrations show WhatsApp Business. Both tables have row and column controls for email, mobile, and browser, plus email frequency when applicable. The task reminder interval is editable. Browser and Telegram notices explain that notification delivery is not active.
- Preserve the existing per-workspace/member browser storage key and existing preferences. Show save success only after a successful write. Display profile and notification preferences as browser-local; do not add API, schema, auth, payments, or delivery changes.
