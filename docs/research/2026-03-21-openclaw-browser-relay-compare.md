# OpenClaw Browser Relay Comparison

## Sources

- Official repo: `https://github.com/openclaw/openclaw`
- Official Chrome extension doc: `docs/zh-CN/tools/chrome-extension.md`
- Official browser tool doc: `docs/tools/browser.md`
- Official browser bridge server: `src/browser/bridge-server.ts`
- Official browser tabs routes: `src/browser/routes/tabs.ts`
- Official target id helper: `src/browser/target-id.ts`
- Official bridge auth registry: `src/browser/bridge-auth-registry.ts`

## What OpenClaw Already Has

### 1. Two browser modes, not one

OpenClaw has two distinct paths:

- `openclaw` profile: dedicated, isolated browser profile managed by OpenClaw
- `user` / `chrome` / extension path: attach to an existing signed-in Chrome session

This is a product advantage because it gives users a safe default and a high-power mode.

### 2. A proper local browser bridge service

OpenClaw’s browser relay is not just an extension popup. It includes:

- a loopback-only browser bridge server
- auth enforcement on that bridge
- route-based tab operations
- profile-aware browser sessions

From `src/browser/bridge-server.ts`:

- binds to loopback host only
- requires either an auth token or auth password
- installs common middleware and auth middleware
- registers browser routes

This is more mature than our current direct extension bridge because it treats the relay as a first-class control service.

### 3. Full tab management API

From `src/browser/routes/tabs.ts`, OpenClaw already exposes:

- `GET /tabs`
- `POST /tabs/open`
- `POST /tabs/focus`
- `DELETE /tabs/:targetId`
- `POST /tabs/action` with `list`, `new`, `close`, `select`

This matches the direction we just started implementing in A2B.

### 4. Better target id resolution UX

From `src/browser/target-id.ts`, OpenClaw supports:

- exact target id match
- prefix match
- ambiguity detection

This is useful because users and agents do not always want to paste full target ids.

### 5. Clear security framing

Their extension doc is strong on risk messaging:

- existing-session attach is high risk
- attached tabs are explicitly selected by the user
- relay should stay loopback-only
- auth is required

This is very relevant for Chrome Web Store review and user trust.

## OpenClaw’s Main Browser Relay Model

From the official extension doc:

- the relay controls existing Chrome tabs
- the user explicitly attaches or detaches a tab using the toolbar button
- badge states include `ON`, `…`, `!`
- default relay URL is `http://127.0.0.1:18792`

Key architectural idea:

1. AI/tool talks to browser control service
2. local relay bridges control service to extension
3. extension uses `chrome.debugger` on the explicitly attached tab

This is safer than “always all tabs attached”, but also more manual.

## Where A2B Is Better Right Now

### 1. Simpler user mental model

Our current direction is easier to understand:

- one extension
- one `Browser Access` master switch
- tabs become visible automatically when access is on
- no separate “attach this exact tab” toolbar ritual required

For everyday AI-assisted browsing, this is more fluid than OpenClaw’s manual attach model.

### 2. Stronger current-browser/session-state orientation

A2B is explicitly optimized for:

- current logged-in browser reuse
- cookie extraction
- lightweight action recording
- handing target metadata directly to an AI tool

OpenClaw is a much broader browser-control system; our product is more focused on “connect to the browser the user is already using”.

### 3. Better “copy for AI” affordance

Our popup already produces a direct handoff bundle for AI. OpenClaw is more CLI/profile oriented.

That means our onboarding into AI-assisted workflows can be smoother, especially for non-technical users.

## Where OpenClaw Is Ahead

### 1. Security hardening

OpenClaw is clearly ahead on:

- loopback-only bridge enforcement
- token/password auth on bridge server
- explicit attach semantics
- clearer threat-model language

This is the biggest gap we should close.

### 2. Mature browser service abstraction

OpenClaw’s browser layer is a real service with:

- route separation
- profile context
- browser reachability checks
- error mapping
- tab operation endpoints

We currently have a more extension-centric architecture. Their service abstraction is more scalable.

### 3. Isolated managed-browser mode

OpenClaw can say:

- use isolated browser by default
- use existing-session only when needed

That is a strong trust and safety story we do not yet have.

## Code and Ideas Worth Borrowing

### Must borrow soon

1. Loopback-only + auth model

Borrow the product idea and service pattern from:

- `src/browser/bridge-server.ts`
- `src/browser/bridge-auth-registry.ts`

We should add:

- loopback-only enforcement for our local bridge
- required auth token between AI app and browser bridge
- clearer offline/auth failure states in the popup

2. Tab routes shape

Borrow the route semantics from:

- `src/browser/routes/tabs.ts`

Their route set is practical and already battle-tested:

- list
- open
- focus
- close
- select

3. Target id prefix resolution

Borrow the idea from:

- `src/browser/target-id.ts`

We should support:

- exact target id
- short prefix target id
- ambiguity response

This will make AI prompts and manual debugging much nicer.

### Borrow carefully, not blindly

1. Manual attach button model

OpenClaw requires explicit attach via toolbar click. This is safer, but it may hurt our desired product experience.

Recommendation:

- do not copy this as the default UX
- keep our automatic tab visibility model
- optionally add a future “explicit attach only” privacy mode

2. Large profile/service system

OpenClaw’s browser stack is significantly broader than our current product needs.

Recommendation:

- borrow concepts, not the whole abstraction
- avoid importing their whole profile model right now

## Recommended Product Direction For A2B

### Near-term

1. Keep our current default UX

- `Browser Access` master switch
- tabs visible automatically when on
- lightweight popup handoff to AI

2. Add OpenClaw-style hardening

- authenticated local bridge
- loopback-only enforcement
- stronger error states and trust messaging

3. Finish the tab control surface

- `tab.list`
- `tab.create`
- `tab.activate`
- `tab.close`
- target-id prefix resolution

### Mid-term

Add two operating modes:

1. `Simple mode`
- our current automatic tab discovery model

2. `Strict mode`
- OpenClaw-style explicit tab attach/allowlist behavior

This would let us keep our UX advantage while gaining a better privacy story.

## Bottom Line

OpenClaw is not ahead because of popup polish; it is ahead because its browser relay is a more complete and security-aware service.

What we should borrow:

- loopback-only authenticated relay
- mature tab routes
- target-id resolution logic
- stronger security/onboarding language

What we should keep from A2B:

- simpler “turn it on and use current browser” workflow
- direct AI handoff bundle
- cookie + current-session orientation
- lower-friction UX than explicit per-tab attach
