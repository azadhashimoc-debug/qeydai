# Panel Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the QeydAI settings screen using the reference layout without implying live delivery.

**Architecture:** Extend the existing client settings view and preserve its storage key. Use a typed notification catalog and reuse existing workspace and member views. Scope the layout to the Settings tab.

**Tech Stack:** Next.js 16.4.6, React 19, CSS, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-20-panel-settings-design.md`

## Global Constraints

- Preserve QeydAI branding, real account data, and existing workspace permissions.
- Preserve the existing per-workspace/member browser storage key and existing preferences.
- Do not add API, schema, auth, payments, or delivery changes.
- No commit or external publication without a user request.

## Review Focus

- A legacy profile retains its name, note, and existing notification choices.
- Invalid or blocked storage does not crash the form or report a successful write.
- Mixed column selection changes only rows in that table.
- Missing account email and unsupported features cannot be mistaken for live actions.
- A narrow viewport fits the rail, navigation, and form; only the tables scroll horizontally.

### Task 1: Expand the profile and notifications

**Files:** `src/components/panel/PanelSettings.tsx`, `src/components/panel/panel-profile.ts`, `src/components/panel/PanelNotificationSettings.tsx`, `src/components/panel/PanelSettings.test.tsx`.

**Interfaces:** `PanelSettings` keeps the locale, tenant, member, and navigation props; accepts optional `memberName` and a workspace view renderer for `"workspace" | "members"`. The settings layout exposes the saved menu mode through `data-menu`. `loadPanelProfile(key: string, memberName?: string): PanelProfile` normalizes the existing JSON and `PanelNotificationSettings({ lang, profile, onChange })` edits the draft without sending notifications.

- [ ] Add tests for the security link, workspace/member navigation, locked email, notification rows, scoped bulk selection, legacy preference migration, persistence, and failed writes. Assert actual controls, selected values, and restored data after remounting.
- [ ] Run `npm test -- src/components/panel/PanelSettings.test.tsx`. Expected: new assertions fail against the incomplete screen.
- [ ] Build the profile card, notification tables, settings menu, and unavailable states. Keep Save disabled until the draft changes.
- [ ] Run the same test command. Expected: all settings tests pass.

### Task 2: Integrate the layout and existing views

**Files:** `src/components/panel/PanelShell.tsx`, `src/components/panel/TeamStageTab.tsx`, `src/app/[lang]/panel/panel.css`.

**Interfaces:** `TeamStageTab` accepts `section: "workspace" | "members"`; the shell supplies the signed-in member name and applies the saved rail preference only while Settings is active.

- [ ] Verify routing to the existing views with panel navigation tests and a browser check if available.
- [ ] Apply a narrow settings-only icon rail, grouped secondary menu, compact rows, and responsive profile fields. Use neutral light colors (`#f3f4f6`, `#ffffff`, `#273244`, `#dce1e8`, `#e5edff`, `#2457aa`) and existing dark tokens. Keep one table scroll region per group. Do not modify other panel layouts.
- [ ] Run `npx tsc --noEmit`, targeted ESLint, and `npm test`. Check desktop and phone widths with the running app where possible. Report unrelated failures separately.
