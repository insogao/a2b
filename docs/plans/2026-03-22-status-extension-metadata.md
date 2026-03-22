# Status Extension Metadata Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `a2b status --json` return the connected extension's `extensionId`, `guideUrl`, and `sessionId` so AI tools can discover the local guide automatically.

**Architecture:** Reuse the existing `hello` bridge message as a metadata handshake sent from the extension after the WebSocket opens. Store that metadata in relay memory beside the extension socket, return it from `/healthz`, and leave all existing tab/cookie/operation routes unchanged.

**Tech Stack:** Chrome MV3 extension, Node relay server, WebSocket bridge, Vitest

---

### Task 1: Add failing relay metadata tests

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/relay/server.test.ts`

**Step 1: Write the failing test**

Add a test that:
- starts the relay
- opens an extension websocket
- sends a `hello` message with `sessionId`, `extensionId`, and `guideUrl`
- fetches `/healthz`
- expects those fields in the JSON payload

**Step 2: Run test to verify it fails**

Run: `npm test -- src/relay/server.test.ts`

Expected: FAIL because `/healthz` currently only returns `ok`, `extensionConnected`, and `targetCount`.

### Task 2: Teach the relay to persist extension metadata

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/bin/lib/a2b-relay-server.mjs`

**Step 1: Add metadata state**

Track `sessionId`, `extensionId`, and `guideUrl` next to the active extension socket.

**Step 2: Handle `hello`**

When a websocket message of type `hello` arrives, save the metadata if present.

**Step 3: Expose metadata from `/healthz`**

Return the stored metadata from the health response.

**Step 4: Clear metadata on disconnect**

If the active extension socket closes, clear the stored metadata with it.

### Task 3: Send metadata from the extension

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/background/index.ts`

**Step 1: Send a `hello` payload on open**

Inside the bridge `onOpen` path, send:
- `sessionId`
- `extensionId` from `chrome.runtime.id`
- `guideUrl` from `chrome.runtime.getURL("ai-guide.html")`

**Step 2: Keep existing target sync**

After sending `hello`, continue current target registration behavior.

### Task 4: Verify status output

**Files:**
- No new code expected unless verification reveals a gap

**Step 1: Run tests**

Run:
- `npm test -- src/relay/server.test.ts`

Expected: PASS

**Step 2: Run broader safety verification**

Run:
- `npm test -- src/relay/server.test.ts src/background/bridgeClient.test.ts`
- `npm run build`

Expected:
- all tests pass
- build succeeds
