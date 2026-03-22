# Browser Access Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent browser access master switch, clearer on/off popup states, and bridge commands for listing, creating, and activating tabs.

**Architecture:** Extend the background service worker settings with a persisted `browserAccessEnabled` flag and gate all bridge registration/recording behavior behind it. Update the popup to present a single master switch with a simple enabled/disabled mental model, while exposing debug count as secondary information. Expand the bridge protocol so AI tools can enumerate all current-window tabs and manage tab focus/creation without relying on the popup.

**Tech Stack:** Chrome MV3 extension, React popup UI, TypeScript, Vitest, Playwright.

---

### Task 1: Lock in the new product model with failing tests

**Files:**
- Modify: `src/popup/App.test.tsx`
- Modify: `src/shared/protocol.test.ts`
- Create: `src/background/browserAccess.test.ts`

**Step 1:** Add popup tests covering:
- browser access enabled state
- browser access disabled state
- debug count shown as secondary info
- browser access switch callback

**Step 2:** Add protocol tests for new bridge commands:
- `tab.list`
- `tab.list.result`
- `tab.create`
- `tab.activate`

**Step 3:** Add a focused background helper test for browser-access gating and tab selection helpers.

### Task 2: Implement persistent browser access state

**Files:**
- Modify: `src/background/state.ts`
- Modify: `src/background/index.ts`
- Create: `src/background/browserAccess.ts`

**Step 1:** Extend persisted settings with `browserAccessEnabled: true` default.

**Step 2:** Add helpers to:
- check whether browser access is enabled
- clear runtime targets when disabled
- enumerate current-window web tabs

**Step 3:** Gate bridge connection, target registration, cookies, and recording behind browser access state.

### Task 3: Add bridge-level tab management

**Files:**
- Modify: `src/shared/protocol.ts`
- Modify: `src/background/index.ts`
- Update docs if needed after code lands

**Step 1:** Support:
- `tab.list`
- `tab.list.result`
- `tab.create`
- `tab.activate`

**Step 2:** Make `target.list` enumerate all current-window web tabs so AI sees the full list without user interaction.

### Task 4: Simplify popup UI to a single on/off model

**Files:**
- Modify: `src/popup/hooks.ts`
- Modify: `src/popup/main.tsx`
- Modify: `src/popup/App.tsx`

**Step 1:** Add a `browserAccessEnabled` field to popup state.

**Step 2:** Replace the top status model with:
- `On`
- `Off`

**Step 3:** Add a capsule-style browser access switch.

**Step 4:** Demote recording to a bottom `Debug Count` indicator.

### Task 5: Verify the closed loop still works

**Files:**
- Modify: `tests/e2e/extension.spec.ts` only if needed

**Step 1:** Run unit tests.

**Step 2:** Run production build.

**Step 3:** Run Chromium extension e2e and confirm recording still works when browser access is on.
