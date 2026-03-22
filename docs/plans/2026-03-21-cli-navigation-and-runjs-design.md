# CLI Navigation And Run-JS Design

**Goal:** Extend A2B with a small set of high-level browser navigation commands plus a script-fallback command so AI tools can stay concise by default and only drop to custom code when needed.

## Product Position

A2B should remain:

- a browser bridge for the user's current logged-in Chrome session
- a high-level CLI action layer for common tasks
- a script fallback executor for site-specific gaps

A2B should **not** try to fully replace `agent-browser`.

Recommended layering:

1. Use A2B high-level commands first
2. Use A2B script execution when the high-level command set is insufficient
3. Use `agent-browser` for more advanced flows or deeper automation

## Approaches

### 1. High-level commands only

Add navigation commands and refuse arbitrary scripts.

**Pros**

- Small surface area
- Easier to reason about

**Cons**

- Forces AI back into custom tool-specific work too early
- Weak site-specific adaptability

### 2. High-level commands plus `run-js` fallback

Add common navigation commands and a script file executor that runs against a target tab.

**Pros**

- Matches the intended product model
- Keeps common workflows short
- Still gives an escape hatch

**Cons**

- Needs careful result/error shaping
- Adds a modest amount of complexity

### 3. General script mode only

Expose `run-js` and let AI implement everything as scripts.

**Pros**

- Extremely flexible

**Cons**

- Worse UX
- More code generation burden for AI
- Higher chance of token waste

## Recommendation

Choose **Approach 2**.

That gives us a clean split:

- `goto`, `reload`, `back`, `forward`, `close` for common navigation
- `run-js` for fallback logic

## Proposed Command Surface

### High-level navigation

- `a2b goto <target> <url>`
- `a2b reload <target>`
- `a2b back <target>`
- `a2b forward <target>`
- `a2b close <target>`

### Script fallback

- `a2b run-js <target> <file>`

`run-js` reads a local JS file from disk, sends the source through the relay, and executes it in the page context of the target tab.

## Execution Model

### Navigation commands

These operate through tab-specific Chrome APIs:

- `goto` uses `chrome.tabs.update`
- `reload` uses `chrome.tabs.reload`
- `back` uses `chrome.tabs.goBack`
- `forward` uses `chrome.tabs.goForward`
- `close` uses `chrome.tabs.remove`

These commands are target-specific and do not depend on the popup UI.

### Run-JS

`run-js` sends file contents to the extension and executes the source inside the target page using `chrome.scripting.executeScript()`.

We will treat the script as a function body and run it through `new Function(...)` inside the page context. This keeps the CLI easy to use while still allowing the script to return a value.

MVP constraints:

- the script file is plain JavaScript
- the return value should be JSON-serializable when possible
- errors return a shaped `{ ok: false, error }` payload

## Protocol Additions

Add bridge commands for:

- `tab.goto` / `tab.goto.result`
- `tab.reload` / `tab.reload.result`
- `tab.back` / `tab.back.result`
- `tab.forward` / `tab.forward.result`
- `tab.close` / `tab.close.result`
- `script.run` / `script.run.result`

These continue to use `requestId` so multiple target operations can stay concurrent.

## Relay Routes

Add HTTP routes:

- `POST /tabs/goto`
- `POST /tabs/reload`
- `POST /tabs/back`
- `POST /tabs/forward`
- `POST /tabs/close`
- `POST /run-js`

All routes accept either a full target id or a unique prefix through `target`.

## Testing Strategy

1. Unit tests for protocol command names
2. Relay route tests for new navigation and script commands
3. Background helper tests for tab navigation and script execution
4. CLI help/command coverage
5. Playwright e2e covering:
   - `goto`
   - `back`
   - `forward`
   - `run-js`

## Non-Goals

- remote script package registries
- multi-file script bundles
- site adapter registry in this slice
