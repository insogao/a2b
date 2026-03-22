# Background Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-class operations layer to A2B so the local CLI can act on specific tabs with eval, DOM interactions, waiting, and screenshots.

**Architecture:** The CLI stays a thin wrapper over the local relay server. The relay resolves target selectors and forwards operation requests to the extension over the existing request/response bridge. The extension executes DOM operations with `chrome.scripting.executeScript()` and captures screenshots through `chrome.debugger`.

**Tech Stack:** Chrome MV3 extension APIs, Node HTTP/WS relay, ESM CLI, Vitest, Playwright.

---

### Task 1: Extend protocol and manifest permissions

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/shared/protocol.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/shared/protocol.test.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/manifest.ts`
- Test: `/Users/gaoshizai/work/plugin/src/shared/protocol.test.ts`

**Step 1: Write the failing test**

Add assertions for the new bridge command names and request envelopes.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/protocol.test.ts`

**Step 3: Write minimal implementation**

Add operation and screenshot command names to the protocol enum list and add `"scripting"` to manifest permissions.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/protocol.test.ts`

### Task 2: Add background operation executors

**Files:**
- Create: `/Users/gaoshizai/work/plugin/src/background/operations.ts`
- Create: `/Users/gaoshizai/work/plugin/src/background/operations.test.ts`
- Modify: `/Users/gaoshizai/work/plugin/src/background/index.ts`
- Test: `/Users/gaoshizai/work/plugin/src/background/operations.test.ts`

**Step 1: Write the failing test**

Add focused tests for:

- eval operation dispatch
- click/type/press DOM action dispatch
- wait-for timeout/success behavior shaping
- screenshot command routing

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/operations.test.ts`

**Step 3: Write minimal implementation**

Implement tab-targeted helpers built on `chrome.scripting.executeScript()` and `chrome.debugger`.

**Step 4: Wire background message handling**

Handle the new bridge commands in `/Users/gaoshizai/work/plugin/src/background/index.ts` and return `requestId`-scoped results.

**Step 5: Run tests**

Run: `npm test -- src/background/operations.test.ts`

### Task 3: Extend relay HTTP routes

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/bin/lib/a2b-relay-server.mjs`
- Modify: `/Users/gaoshizai/work/plugin/src/relay/server.test.ts`
- Test: `/Users/gaoshizai/work/plugin/src/relay/server.test.ts`

**Step 1: Write the failing test**

Add relay tests for:

- `POST /eval`
- `POST /click`
- `POST /type`
- `POST /press`
- `POST /wait-for`
- `POST /screenshot`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/relay/server.test.ts`

**Step 3: Write minimal implementation**

Forward each route to the matching bridge command and keep target prefix resolution centralized in the relay.

**Step 4: Run tests**

Run: `npm test -- src/relay/server.test.ts`

### Task 4: Add CLI subcommands

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/bin/a2b.mjs`
- Modify: `/Users/gaoshizai/work/plugin/bin/lib/a2b-help.mjs`
- Create: `/Users/gaoshizai/work/plugin/src/cli/commands.test.ts`
- Test: `/Users/gaoshizai/work/plugin/src/cli/commands.test.ts`

**Step 1: Write the failing test**

Add tests or smoke assertions for subcommand parsing and help text.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/cli/commands.test.ts`

**Step 3: Write minimal implementation**

Add:

- `screenshot`
- `eval-js`
- `click`
- `type`
- `press`
- `wait-for`

Support `--json` everywhere and `--path` / `--timeout-ms` where applicable.

**Step 4: Run tests**

Run: `npm test -- src/cli/commands.test.ts`

### Task 5: Add end-to-end extension coverage

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/tests/e2e/extension.spec.ts`
- Test: `/Users/gaoshizai/work/plugin/tests/e2e/extension.spec.ts`

**Step 1: Write the failing test**

Add an e2e flow that:

- loads the extension
- opens a page with target elements
- invokes the new background operation hooks
- verifies resulting DOM state and screenshot payload

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/extension.spec.ts`

**Step 3: Write minimal implementation**

Add the required e2e helper hooks to the background runtime for test-only inspection where necessary.

**Step 4: Run test**

Run: `npx playwright test tests/e2e/extension.spec.ts`

### Task 6: Update docs and verify full build

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/README.md`
- Modify: `/Users/gaoshizai/work/plugin/docs/AI_BRIDGE_PROTOCOL.md`

**Step 1: Document commands**

Add the new CLI commands and explain the background-tab semantics clearly.

**Step 2: Run final verification**

Run:

- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/extension.spec.ts`

**Step 3: Summarize remaining risks**

Call out any sites where background DOM interaction may still need debugger/CDP fallback.
