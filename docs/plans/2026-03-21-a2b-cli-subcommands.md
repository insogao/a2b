# A2B CLI Subcommands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a real `a2b` CLI that can start a local relay server and run tab-oriented subcommands against the current browser extension.

**Architecture:** Add a lightweight loopback-only relay server that accepts the extension’s existing WebSocket connection and exposes simple local HTTP routes for a Node CLI. The CLI becomes the official operator-facing interface, while the extension keeps its browser-side responsibilities. Request/response correlation will use optional `requestId` fields on bridge envelopes so multiple commands can be safely multiplexed.

**Tech Stack:** Node ESM CLI, `ws` for the relay WebSocket server, existing Chrome MV3 extension, Vitest, Playwright.

---

### Task 1: Lock protocol and CLI surface with failing tests

**Files:**
- Modify: `src/shared/protocol.test.ts`
- Create: `src/cli/target-selector.test.ts`
- Create: `src/relay/server.test.ts`

**Step 1:** Extend protocol tests for optional `requestId` support and any new bridge result commands needed by the relay.

**Step 2:** Add target selector tests for:
- exact target id
- unique prefix
- ambiguous prefix
- not found

**Step 3:** Add relay server integration tests using a fake extension WebSocket:
- target registration updates `/tabs`
- `POST /tabs/open` forwards `tab.create`
- `POST /tabs/focus` resolves a prefix and forwards `tab.activate`
- `POST /cookies` resolves a prefix and forwards `cookies.get`

### Task 2: Implement request-aware bridge envelopes

**Files:**
- Modify: `src/shared/protocol.ts`
- Modify: `src/background/index.ts`

**Step 1:** Add optional `requestId` to bridge envelopes.

**Step 2:** Update background bridge responses so command replies echo the incoming `requestId`.

**Step 3:** Keep unsolicited events like `target.register` and `target.unregister` working unchanged.

### Task 3: Add a loopback relay server

**Files:**
- Create: `bin/lib/a2b-relay-server.mjs`
- Create: `bin/lib/a2b-target-selector.mjs`
- Possibly create small helper modules under `bin/lib/`

**Step 1:** Start an HTTP server on loopback only with:
- `GET /healthz`
- `GET /tabs`
- `POST /tabs/open`
- `POST /tabs/focus`
- `POST /cookies`
- `POST /recording`

**Step 2:** Start a WebSocket server at `/ws` for the extension.

**Step 3:** Maintain in-memory state:
- active extension socket
- registered targets
- pending requests by `requestId`

**Step 4:** Support optional bearer token auth for HTTP and WS connections.

### Task 4: Add the real `a2b` CLI

**Files:**
- Create: `bin/a2b.mjs`
- Create: `bin/lib/a2b-help.mjs`
- Create: `bin/lib/a2b-http-client.mjs`
- Modify: `package.json`

**Step 1:** Add executable subcommands:
- `a2b -h`
- `a2b serve`
- `a2b status`
- `a2b tabs`
- `a2b new [url]`
- `a2b select <target>`
- `a2b cookies <target>`
- `a2b log <target>`

**Step 2:** Support CLI flags:
- `--port`
- `--token`
- `--json`

**Step 3:** Add `bin` entry to `package.json`.

### Task 5: Update docs and verify the whole path

**Files:**
- Modify: `README.md`
- Modify: `docs/AI_BRIDGE_PROTOCOL.md`

**Step 1:** Document the new CLI workflow and auth model.

**Step 2:** Run:
- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/extension.spec.ts`

**Step 3:** If practical, run a small local smoke test:
- start `a2b serve`
- load extension
- call `a2b tabs`

