# CLI Navigation And Run-JS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add browser navigation subcommands and a `run-js` file-based fallback executor to A2B.

**Architecture:** The CLI remains a thin wrapper over the relay. The relay resolves targets and forwards new navigation and script commands to the extension. The extension handles tab navigation with the Chrome tabs API and script fallback with `chrome.scripting.executeScript()`.

**Tech Stack:** Chrome MV3 extension APIs, Node ESM CLI, local HTTP/WS relay, Vitest, Playwright.

---

### Task 1: Extend protocol definitions

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/shared/protocol.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/shared/protocol.test.ts`

**Step 1: Write the failing test**

Add assertions for:

- `tab.goto`
- `tab.goto.result`
- `tab.reload`
- `tab.reload.result`
- `tab.back`
- `tab.back.result`
- `tab.forward`
- `tab.forward.result`
- `tab.close`
- `tab.close.result`
- `script.run`
- `script.run.result`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/protocol.test.ts`

**Step 3: Write minimal implementation**

Add the new command names to the protocol list.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/protocol.test.ts`

### Task 2: Add background helpers and tests

**Files:**
- Create: `/Users/gaoshizai/work/plugin/src/background/navigation.test.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/background/operations.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/background/operations.test.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/background/index.ts`

**Step 1: Write the failing test**

Add tests for:

- goto updates target URL
- reload/back/forward/close delegate to tab APIs
- run-js executes source in the page

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/operations.test.ts src/background/navigation.test.ts`

**Step 3: Write minimal implementation**

Add helpers for:

- `goto`
- `reload`
- `back`
- `forward`
- `close`
- `run-js`

**Step 4: Wire message handling**

Handle the new bridge commands in `/Users/gaoshizai/work/plugin/src/background/index.ts`.

**Step 5: Run tests**

Run: `npm test -- src/background/operations.test.ts src/background/navigation.test.ts`

### Task 3: Extend relay routes

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/bin/lib/a2b-relay-server.mjs`
- Modify: `/Users/gaoshizai/work/plugin/src/relay/server.test.ts`

**Step 1: Write the failing test**

Add route tests for:

- `POST /tabs/goto`
- `POST /tabs/reload`
- `POST /tabs/back`
- `POST /tabs/forward`
- `POST /tabs/close`
- `POST /run-js`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/relay/server.test.ts`

**Step 3: Write minimal implementation**

Forward each route to the new bridge commands with target prefix resolution.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/relay/server.test.ts`

### Task 4: Extend the CLI

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/bin/a2b.mjs`
- Modify: `/Users/gaoshizai/work/plugin/bin/lib/a2b-help.mjs`
- Modify: `/Users/gaoshizai/work/plugin/src/cli/commands.test.ts`

**Step 1: Write the failing test**

Extend help assertions for:

- `goto`
- `reload`
- `back`
- `forward`
- `close`
- `run-js`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/commands.test.ts`

**Step 3: Write minimal implementation**

Add the new subcommands and make `run-js` read script source from a file.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/cli/commands.test.ts`

### Task 5: Add end-to-end verification

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/tests/e2e/extension.spec.ts`

**Step 1: Write the failing test**

Add one flow that verifies:

- `goto` reaches `/next`
- `back` returns to `/`
- `forward` returns to `/next`
- `run-js` reads the page title or URL

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/extension.spec.ts`

**Step 3: Write minimal implementation**

Adjust any helper code needed for deterministic relay-driven testing.

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/extension.spec.ts`

### Task 6: Update docs and run final verification

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/README.md`
- Modify: `/Users/gaoshizai/work/plugin/docs/AI_BRIDGE_PROTOCOL.md`

**Step 1: Document the new command family**

Explain that A2B prefers high-level commands first and `run-js` as the fallback layer.

**Step 2: Run full verification**

Run:

- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/extension.spec.ts`

**Step 3: Capture remaining risks**

Call out that script fallback is powerful but should stay a fallback, not the primary integration path.
