# Current Browser Bridge Design

**Date:** 2026-03-21

## Goal

Build a Chrome-first extension that lets an AI application work with the user's currently logged-in browser session without asking the user to relaunch Chrome with a fixed remote debugging port.

## Product Shape

The extension is the browser-side bridge. It does not pretend to be Chrome's native remote debugging endpoint and does not listen on a local port itself.

Instead:

- The AI application starts a local bridge service on a known port.
- The extension connects to that local service over WebSocket.
- The extension registers the current tab as a unique target.
- The AI application can request cookies, target metadata, and recorded user actions through the extension bridge.
- For page automation, the AI application can still use `agent-browser --auto-connect` to discover and connect to the running Chrome instance, while the extension supplies the page identity and browser state helpers that CDP alone does not solve cleanly for this product.

## Why Not "One Port Per Tab"

Ports are the wrong abstraction for identifying user intent. A port identifies a transport endpoint, not a specific page or site context. If the user opens Google in one tab and Gmail in another, both tabs should still map to the same local bridge service, while each tab receives its own unique target identifier.

## MVP Architecture

### 1. Chrome Extension

Chrome MV3 extension with:

- `background` service worker for bridge connection, target registration, cookie access, debugger attach, and log storage
- `popup` UI for current target identity, bridge status, copy helpers, and recording controls
- `content script` recorder for click/input/navigation/form events

### 2. Bridge Protocol

The extension talks to a local AI application over WebSocket using JSON messages.

MVP message families:

- `hello` / `helloAck`
- `target.register`
- `target.unregister`
- `target.list`
- `cookies.get`
- `recording.start`
- `recording.stop`
- `recording.get`
- `recording.clear`
- `debugger.attach`
- `debugger.detach`

Each target is identified by a stable extension session id plus tab id, for example:

```json
{
  "targetId": "tab-381-1732453381205",
  "tabId": 381,
  "origin": "https://mail.google.com",
  "title": "Gmail",
  "url": "https://mail.google.com/mail/u/0/#inbox"
}
```

### 3. AI / CLI Side

The AI application is responsible for:

- starting the local bridge endpoint
- consuming extension messages
- optionally launching `agent-browser --auto-connect`
- mapping `targetId` back to the correct Chrome page

## Reuse Strategy

The implementation should borrow from mature open-source projects instead of inventing every primitive:

- `vercel-labs/agent-browser`
  - reuse the integration model where the AI side auto-discovers the running Chrome instance
- `ruifigueira/playwright-crx`
  - reuse the transport and `chrome.debugger` attachment ideas for extension-side page control
- `checkly/headless-recorder`
  - reuse the recording model for structured click/input/navigation capture

Because these are Apache-2.0 or MIT licensed, any copied or adapted code must keep the relevant notices and document modifications.

## MVP Scope

Included:

- fixed default local bridge address configurable in extension settings
- current-tab target registration
- copyable target descriptor in popup
- cookie export for current site
- structured action logging for the current tab
- lightweight debugger attach/detach controls
- AI-facing README describing how to combine this extension with `agent-browser`

Excluded from MVP:

- replaying actions back into the browser
- multi-browser support
- native messaging
- external website to extension communication
- pretending to expose a real Chrome CDP port

## Risks

- Chrome extension service worker lifecycle can interrupt background connections unless reconnection logic is robust.
- `chrome.debugger` attachment can conflict with DevTools or other debuggers.
- Cookie access must be permission-scoped carefully to avoid over-asking.
- Recorder event quality depends on selector generation quality; start minimal and structured.

## Testing Strategy

- unit tests for protocol routing, target identity generation, cookie formatting, and recorder event normalization
- integration-style tests for background message handlers
- build verification for the extension bundle

## Acceptance Criteria

- User clicks the extension on a tab and sees a unique target descriptor for that page.
- User can copy that descriptor and share it with an AI tool.
- AI bridge can list the registered targets and fetch cookies for the active target.
- User can start and stop a recording session and inspect the resulting structured log.
