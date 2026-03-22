# Background Operations Design

**Goal:** Add real browser operation commands to A2B so an AI client can target specific background tabs by `targetId` and perform useful work without relying on the popup UI or forcing the tab to stay foregrounded.

## Context

Today A2B can:

- list tabs
- create tabs
- activate tabs
- fetch cookies
- read recording logs
- attach the debugger

This is enough for discovery and inspection, but not enough for an `agent-browser` style workflow where the client needs to act on a page directly. The missing layer is a stable operations surface that works per-tab and composes with the existing relay/CLI.

## Approaches

### 1. Debugger-first for all operations

Use `chrome.debugger` and CDP commands for everything: DOM lookup, input dispatch, runtime evaluation, and screenshots.

**Pros**

- Strong background-tab story
- Closer to raw CDP behavior
- Easier to express some advanced actions later

**Cons**

- Heavier implementation
- More protocol plumbing
- Harder to debug and iterate on simple DOM actions

### 2. Script injection first, debugger for screenshots

Use `chrome.scripting.executeScript()` for page actions such as eval, click, type, press, and wait-for. Use `chrome.debugger` only for screenshot capture where the scripting API is not enough.

**Pros**

- Smallest MVP
- Straightforward DOM operations
- Good fit for existing extension architecture
- Keeps debugger usage narrow and intentional

**Cons**

- Some sites may still need debugger/CDP later
- Runtime JS execution must be carefully scoped

### 3. Content-script RPC only

Route all actions through a permanently mounted content script and avoid runtime script injection.

**Pros**

- Reuses existing page presence
- Lower API surface

**Cons**

- Less flexible for arbitrary operations
- Harder to evolve into a true browser automation layer
- Requires more custom RPC plumbing than the scripting API path

## Recommendation

Choose **Approach 2**.

It gives us a practical operations layer quickly:

- `eval-js`
- `click`
- `type`
- `press`
- `wait-for`
- `screenshot`

It also preserves the option to move more commands to `chrome.debugger` later if we hit reliability or visibility limits.

## Proposed Command Surface

### CLI

Add these subcommands:

- `a2b screenshot <target> [--path <file>] [--json]`
- `a2b eval-js <target> <expression> [--json]`
- `a2b click <target> <selector> [--json]`
- `a2b type <target> <selector> <text> [--json]`
- `a2b press <target> <selector> <key> [--json]`
- `a2b wait-for <target> <selector> [--timeout-ms <n>] [--json]`

### Relay HTTP routes

Expose a thin HTTP surface so the CLI remains a stateless wrapper:

- `POST /screenshot`
- `POST /eval`
- `POST /click`
- `POST /type`
- `POST /press`
- `POST /wait-for`

All routes resolve the incoming target selector by exact or unique-prefix match.

### Bridge commands

Add new bridge message types:

- `operation.eval` / `operation.result`
- `operation.click` / `operation.result`
- `operation.type` / `operation.result`
- `operation.press` / `operation.result`
- `operation.waitFor` / `operation.result`
- `page.screenshot` / `page.screenshot.result`

These continue using `requestId` so multiple outstanding operations can run safely against different tabs.

## Targeting and Concurrency

The concurrency model stays the same:

- the relay tracks one extension socket
- each outgoing command gets a unique `requestId`
- each command payload includes a `targetId`
- the extension routes by tab-specific target lookup

This means clients can issue parallel requests to different tabs without the popup being open and without using a single global “current tab” pointer.

## Background Execution Semantics

For the MVP:

- `eval-js`, `click`, `type`, `press`, and `wait-for` run through `chrome.scripting.executeScript()`
- `screenshot` uses `chrome.debugger` plus `Page.captureScreenshot`

Important implication:

- most DOM operations should work without forcing the tab to become active
- `screenshot` is implemented separately because `tabs.captureVisibleTab()` only captures the currently visible tab, which is not suitable for background-task semantics

This is based on Chrome’s official extension APIs:

- `chrome.scripting.executeScript()` requires the `scripting` permission and host permissions
- `chrome.debugger` can send CDP commands such as the `Page` domain to a specific tab
- `tabs.captureVisibleTab()` only captures the active visible tab, so it is not the right primitive for background tab screenshots

## Safety and Constraints

The MVP intentionally limits power:

- `eval-js` accepts an expression string and evaluates it inside the page, returning JSON-serializable output when possible
- DOM commands operate on a single selector target
- `wait-for` polls for selector presence up to a timeout
- we do not add file system writes inside the extension; CLI handles optional output paths

## Required Code Changes

- add `"scripting"` permission in the manifest
- extend shared bridge protocol definitions
- add background helpers for executing scripting/debugger operations per target
- extend relay routes and CLI subcommands
- add unit and end-to-end coverage for operation commands

## Testing Strategy

1. Unit tests for selector resolution and relay request routing
2. Background/bridge tests for operation request handling
3. CLI smoke tests for command parsing
4. Playwright extension e2e covering:
   - create target page
   - run `click` / `type` / `wait-for`
   - verify resulting DOM state
   - verify `eval-js` return value
   - verify screenshot result shape

## Non-Goals For This Slice

- full CDP parity with `agent-browser`
- multi-frame or shadow-DOM special handling beyond basic selectors
- HAR/network tracing
- arbitrary script packages or site adapters
