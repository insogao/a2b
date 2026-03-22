# Extension-Local AI Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `Copy For AI` prefer an extension-local guide page so AI tools are not blocked by GitHub `429/404` failures.

**Architecture:** Add a static guide page to the extension package, expose its runtime URL from the background popup state, and update the copy bundle to point to that local page first while keeping GitHub docs as a supplemental link. Keep the change minimal and verify it with popup-focused tests plus a production build.

**Tech Stack:** Chrome MV3 extension, Vite/CRX build, React popup, Vitest

---

### Task 1: Add failing tests for local guide preference

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/popup/App.test.tsx`

**Step 1: Write the failing test**

Assert that `Copy For AI` now includes:
- `First read in browser: chrome-extension://.../ai-guide.html`
- GitHub docs only as a supplemental line

**Step 2: Run test to verify it fails**

Run: `npm test -- src/popup/App.test.tsx`

Expected: FAIL because the popup copy text still prefers GitHub docs.

### Task 2: Add the extension-local guide page

**Files:**
- Create: `/Users/gaoshizai/work/plugin/public/ai-guide.html`
- Modify: `/Users/gaoshizai/work/plugin/src/manifest.ts`

**Step 1: Add a static guide page**

Create a simple self-contained HTML page that explains:
- required command order
- fallback behavior
- command ladder
- recovery steps

**Step 2: Make the page reachable by URL**

If needed, expose `ai-guide.html` through manifest resources so it can be opened via `chrome-extension://<id>/ai-guide.html`.

### Task 3: Wire popup state and copy text to the local guide

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/popup/hooks.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/background/index.ts`

**Step 1: Extend popup state**

Add a `guideUrl` field to popup state.

**Step 2: Provide the runtime URL from background**

Use `chrome.runtime.getURL("ai-guide.html")` when building popup state.

**Step 3: Update copy text**

Prefer:
- `First read in browser: <guideUrl>`
- `Supplementary docs: <GitHub URL>`

Keep the copy bundle short and explicit.

### Task 4: Refresh docs and verify

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/docs/AI_OPERATOR_GUIDE.md`

**Step 1: Clarify relationship between local guide and GitHub guide**

Explain that the extension-local guide is the preferred bootstrap page and GitHub is a mirror.

**Step 2: Run verification**

Run:
- `npm test -- src/popup/App.test.tsx src/testbench/taskRunner.test.ts`
- `npm run build`

Expected:
- tests pass
- build succeeds and includes the new guide page
