# Relay Auto Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the extension reconnect to a restarted relay automatically without requiring the user to open the popup or trigger another browser event.

**Architecture:** Add a tiny recovery scheduler in the background service worker. When the bridge drops to `disconnected`, it schedules a short in-memory retry and keeps a 30-second `chrome.alarms` fallback for cases where the service worker sleeps. When the bridge returns to `connected`, it cancels pending retries.

**Tech Stack:** Chrome MV3 extension service worker, `chrome.alarms`, TypeScript, Vitest

---

### Task 1: Add failing tests for recovery scheduling

**Files:**
- Create: `/Users/gaoshizai/work/plugin/src/background/bridgeRecovery.test.ts`
- Create: `/Users/gaoshizai/work/plugin/src/background/bridgeRecovery.ts`

**Step 1: Write failing tests**

Cover:
- a disconnected transition schedules one immediate retry
- duplicate disconnected transitions do not stack duplicate retries
- a connected transition cancels the pending immediate retry

**Step 2: Run test to verify it fails**

Run: `npm test -- src/background/bridgeRecovery.test.ts`

Expected: FAIL because the scheduler does not exist yet.

### Task 2: Implement the recovery scheduler

**Files:**
- Create: `/Users/gaoshizai/work/plugin/src/background/bridgeRecovery.ts`

**Step 1: Add minimal scheduler**

Expose a helper that:
- schedules one `setTimeout` reconnect after a short delay
- avoids duplicate pending retries
- clears the retry when connected again

### Task 3: Wire the scheduler into background connection state

**Files:**
- Modify: `/Users/gaoshizai/work/plugin/src/background/index.ts`

**Step 1: Reduce alarm fallback period**

Use the Chrome 120+ minimum `0.5` minutes for the bridge poll alarm.

**Step 2: Connect scheduler to bridge status**

On `disconnected`:
- schedule an immediate retry

On `connected`:
- cancel any pending retry

**Step 3: Reuse existing `ensureBridgeConnection()`**

Do not duplicate reconnect logic; have the scheduler call the existing connection path.

### Task 4: Verify

**Step 1: Run targeted tests**

Run:
- `npm test -- src/background/bridgeRecovery.test.ts src/background/bridgeClient.test.ts`

**Step 2: Run build**

Run:
- `npm run build`

Expected:
- tests pass
- build succeeds
