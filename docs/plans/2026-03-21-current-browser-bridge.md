# Current Browser Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome MV3 extension MVP that exposes current-tab target metadata, cookie access, and structured recording logs to a local AI bridge over WebSocket.

**Architecture:** A background service worker owns bridge connectivity, target registration, cookie reads, debugger control, and recording storage. A popup reads live tab state from the background script and lets the user copy a target descriptor or control recording. A content script captures interaction events and forwards normalized log entries to the background worker.

**Tech Stack:** TypeScript, Vite, React, Vitest, Chrome MV3 APIs, WebSocket

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/manifest.ts`
- Create: `src/background/index.ts`
- Create: `src/content/index.ts`
- Create: `src/popup/index.html`
- Create: `src/popup/main.tsx`
- Create: `src/popup/App.tsx`

**Step 1: Write the failing test**

Create a test that imports a manifest builder and asserts the extension name, MV3 version, and required permissions are present.

**Step 2: Run test to verify it fails**

Run: `npm test -- manifest.test.ts`
Expected: FAIL because the manifest builder does not exist yet.

**Step 3: Write minimal implementation**

Add the build config, manifest builder, and placeholder background/content/popup entry files.

**Step 4: Run test to verify it passes**

Run: `npm test -- manifest.test.ts`
Expected: PASS

**Step 5: Optional commit**

If the directory becomes a git repository later:

```bash
git add .
git commit -m "chore: scaffold browser bridge extension"
```

### Task 2: Shared Protocol and Target Model

**Files:**
- Create: `src/shared/protocol.ts`
- Create: `src/shared/targets.ts`
- Test: `src/shared/targets.test.ts`
- Test: `src/shared/protocol.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- stable target descriptor generation from tab metadata
- protocol message guards for supported message types
- copyable descriptor formatting

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/shared/targets.test.ts src/shared/protocol.test.ts`
Expected: FAIL because the shared modules do not exist yet.

**Step 3: Write minimal implementation**

Implement typed protocol helpers, target id generation, and copy text formatting.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/shared/targets.test.ts src/shared/protocol.test.ts`
Expected: PASS

### Task 3: Bridge Client in Background Worker

**Files:**
- Create: `src/background/bridgeClient.ts`
- Create: `src/background/state.ts`
- Modify: `src/background/index.ts`
- Test: `src/background/bridgeClient.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- WebSocket URL normalization
- bridge state transitions on open/close/error
- registration payload generation for active tabs

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/background/bridgeClient.test.ts`
Expected: FAIL because the bridge client and state helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement a reconnecting bridge client and the background bootstrap that can publish target registration messages.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/background/bridgeClient.test.ts`
Expected: PASS

### Task 4: Popup Connection and Copy UX

**Files:**
- Create: `src/popup/hooks.ts`
- Modify: `src/popup/App.tsx`
- Modify: `src/popup/main.tsx`
- Test: `src/popup/App.test.tsx`

**Step 1: Write the failing tests**

Add tests for:

- showing the current target descriptor
- showing disconnected vs connected bridge state
- copy button text generation

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/popup/App.test.tsx`
Expected: FAIL because the popup logic does not exist yet.

**Step 3: Write minimal implementation**

Implement popup state loading from the background worker and the copy-to-clipboard controls.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/popup/App.test.tsx`
Expected: PASS

### Task 5: Cookie Export

**Files:**
- Create: `src/background/cookies.ts`
- Modify: `src/background/index.ts`
- Test: `src/background/cookies.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- cookie filtering for the active site
- API response formatting for bridge requests
- popup-side plain-text cookie export formatting

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/background/cookies.test.ts`
Expected: FAIL because the cookie helper does not exist yet.

**Step 3: Write minimal implementation**

Implement the cookie helper and expose it through the background message router.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/background/cookies.test.ts`
Expected: PASS

### Task 6: Recorder MVP

**Files:**
- Create: `src/content/recorder.ts`
- Create: `src/background/recordings.ts`
- Modify: `src/content/index.ts`
- Modify: `src/background/index.ts`
- Test: `src/content/recorder.test.ts`
- Test: `src/background/recordings.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- click/input/navigation event normalization
- recording session start/stop state
- retrieval of structured log entries for a target

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/content/recorder.test.ts src/background/recordings.test.ts`
Expected: FAIL because recorder modules do not exist yet.

**Step 3: Write minimal implementation**

Implement the content-side recorder and background recording store with current-target scoping.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/content/recorder.test.ts src/background/recordings.test.ts`
Expected: PASS

### Task 7: Docs and Open Source Attribution

**Files:**
- Create: `README.md`
- Create: `THIRD_PARTY_NOTICES.md`

**Step 1: Write the failing test**

Optional: add a lightweight docs smoke test only if a docs validation tool is introduced. Otherwise skip code tests for this task.

**Step 2: Write minimal implementation**

Document:

- how to load the unpacked extension
- default local bridge endpoint
- how AI tools should consume the copied target descriptor
- how `agent-browser --auto-connect` fits the workflow
- which open-source projects influenced or contributed code

**Step 3: Verify docs build context**

Run: `npm run build`
Expected: PASS, generating the extension bundle referenced by the README.

### Task 8: Full Verification

**Files:**
- Modify as needed based on verification findings

**Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

**Step 3: Manual checklist**

Verify:

- popup opens on a normal web page
- target descriptor renders with title, origin, and target id
- copy actions succeed
- recording can start and stop
- cookie export path is reachable

**Step 4: Optional commit**

```bash
git add .
git commit -m "feat: add current browser bridge extension MVP"
```
