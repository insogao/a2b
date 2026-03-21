# Current Browser Bridge

A Chrome-first MV3 extension that helps AI tools work with the user's currently logged-in browser session.

This extension does **not** expose Chrome's native CDP port. Instead, it gives AI tools the missing browser-side context:

- the current tab's unique `targetId`
- site cookies for the active page
- a structured interaction log for the active page
- optional `chrome.debugger` attach and detach from the extension side

The expected pairing is:

1. The user installs this extension.
2. A local AI application starts a WebSocket bridge on `ws://127.0.0.1:46321/ws`.
3. The extension connects to that bridge and registers browser targets.
4. The AI application can also use [`agent-browser`](https://github.com/vercel-labs/agent-browser) with `--auto-connect` to discover the running Chrome instance.

## Why This Exists

For the product goal here, the AI does not just need "a port". It needs to know which live, logged-in page the user means right now.

This extension solves that by turning tabs into explicit targets:

```text
Bridge: ws://127.0.0.1:46321/ws
Target: session-a1b2c3d4-tab-381
Origin: https://mail.google.com
Title: Gmail
URL: https://mail.google.com/mail/u/0/#inbox
```

An AI tool can copy this descriptor from the popup, use the `targetId` to request cookies or logs from the extension bridge, and use `agent-browser --auto-connect` to discover the running Chrome instance when full browser automation is needed.

AI-facing bridge docs live at:

- [`docs/AI_BRIDGE_PROTOCOL.md`](/Users/gaoshizai/work/plugin/docs/AI_BRIDGE_PROTOCOL.md)

## MVP Features

- current active tab target descriptor
- bridge connection status
- copy target descriptor for AI tools
- copy current-site cookies
- start and stop structured recording for the current target
- WebSocket bridge protocol for target listing, cookie access, recording access, and debugger attach/detach

## Load The Extension

1. Run `npm install`
2. Run `npm run build`
3. Open `chrome://extensions`
4. Enable Developer Mode
5. Click "Load unpacked"
6. Select [`dist`](/Users/gaoshizai/work/plugin/dist)

## Default Local Bridge

The extension currently expects a local bridge at:

```text
ws://127.0.0.1:46321/ws
```

Before opening the WebSocket, the extension probes:

```text
http://127.0.0.1:46321/healthz
```

If the probe fails, the popup will show `Disconnected`, but the rest of the popup still works for target identification and local recording state. This keeps the extension quiet when the local AI bridge is not running yet.

## Popup Actions

- `Copy For AI`
  - copies a short AI-ready bundle with the docs URL, bridge URL, target identity, and recording address
- `Copy Cookies`
  - copies the current site's cookies as a normal `Cookie` header string
- `Start Recording` / `Stop Recording`
  - records click, input, and navigation events for the current target

## Runtime Message API

The popup and content script call the background worker with these internal message types:

- `popup.getState`
- `popup.copyCookies`
- `popup.recording.start`
- `popup.recording.stop`
- `content.recordEvent`

## Bridge Protocol

The background worker accepts JSON messages over WebSocket and responds with JSON envelopes.

Supported inbound commands:

- `hello`
- `target.list`
- `cookies.get`
- `recording.start`
- `recording.stop`
- `recording.get`
- `recording.clear`
- `debugger.attach`
- `debugger.detach`

Supported outbound messages:

- `helloAck`
- `target.register`
- `target.unregister`
- `target.list.result`
- `cookies.result`
- `recording.result`
- `debugger.result`
- `error`

## Suggested AI Workflow

1. User opens the site they care about.
2. User opens the extension popup and clicks `Copy For AI`.
3. AI reads the copied descriptor.
4. AI follows the docs URL and queries the local bridge using the copied `targetId`.
5. If browser control is needed, AI launches `agent-browser --auto-connect`.

## Open Source References

This implementation was shaped by these mature open-source projects:

- [`vercel-labs/agent-browser`](https://github.com/vercel-labs/agent-browser)
  - for the AI-side auto-connect model to running Chrome
- [`ruifigueira/playwright-crx`](https://github.com/ruifigueira/playwright-crx)
  - for extension-side `chrome.debugger` transport ideas
- [`checkly/headless-recorder`](https://github.com/checkly/headless-recorder)
  - for recorder structure and event-capture flow

See [`THIRD_PARTY_NOTICES.md`](/Users/gaoshizai/work/plugin/THIRD_PARTY_NOTICES.md) for attribution details.
