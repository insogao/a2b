# Current Browser Bridge

A Chrome-first MV3 extension plus local CLI/relay that helps AI tools work with the user's currently logged-in browser session.

The intended layering is:

- A2B high-level commands first
- A2B `run-js` fallback second
- `agent-browser` for page snapshot, refs, and deeper browser automation

This extension does **not** expose Chrome's native CDP port. Instead, it gives AI tools the missing browser-side context:

- the current tab's unique `targetId`
- site cookies for the active page
- a structured interaction log for the active page
- page actions such as goto, reload, eval, click, type, press, wait-for, and screenshot
- optional `chrome.debugger` attach and detach from the extension side

The expected pairing is:

1. The user installs this extension.
2. `a2b serve` starts a local relay on `ws://127.0.0.1:46321/ws`.
3. The extension connects to that relay and registers browser targets.
4. The AI application can call `a2b tabs`, `a2b new`, `a2b select`, `a2b cookies`, `a2b log`, and the page operation commands.
5. The AI application can also use [`agent-browser`](https://github.com/vercel-labs/agent-browser) with `--auto-connect` to discover the running Chrome instance.

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
- GitHub bootstrap: [`.codex/INSTALL.md`](https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md)

## AI Bootstrap

The shortest GitHub handoff is:

```text
Fetch and follow instructions from https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md
```

The three supported AI entry points are:

1. `Copy For AI` from the popup
2. The GitHub bootstrap line above
3. `node ./bin/a2b.mjs status --json`, which returns `extensionId`, `guideUrl`, and `sessionId` after the extension connects

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
7. After every local rebuild with `npm run build`, click `Reload` for the unpacked extension in `chrome://extensions`

## CLI

The repo now includes a real `a2b` CLI:

```bash
node ./bin/a2b.mjs -h
node ./bin/a2b.mjs serve
node ./bin/a2b.mjs tabs
node ./bin/a2b.mjs new https://gemini.google.com
node ./bin/a2b.mjs select tab-3
node ./bin/a2b.mjs goto tab-3 https://gemini.google.com
node ./bin/a2b.mjs reload tab-3
node ./bin/a2b.mjs cookies tab-3
node ./bin/a2b.mjs log tab-3
node ./bin/a2b.mjs wait-for tab-3 "#prompt"
node ./bin/a2b.mjs type tab-3 "#prompt" "hello from a2b"
node ./bin/a2b.mjs click tab-3 "#send"
node ./bin/a2b.mjs eval-js tab-3 "document.title"
node ./bin/a2b.mjs run-js tab-3 ./script.js
node ./bin/a2b.mjs screenshot tab-3 --path ./page.png
```

When installed as a package, the executable name is `a2b`.

## Default Local Bridge

The extension and CLI use a local relay at:

```text
ws://127.0.0.1:46321/ws
```

Before opening the WebSocket, the extension probes:

```text
http://127.0.0.1:46321/healthz
```

If the probe fails, the popup stays available, but browser automation commands will not work until `a2b serve` is running.

## Recommended Use

- Prefer A2B high-level commands for common tasks such as selecting a tab, navigating, waiting, clicking, typing, and taking screenshots.
- Use `a2b run-js` when the built-in action set is not enough for a site-specific task.
- Use `agent-browser snapshot` when you need a structured view of the page, interactive refs, or a richer automation planning surface.
- Use `agent-browser` more broadly only when you need a stronger browser automation engine than the A2B bridge surface provides.

## Readiness Checks

Before asking an AI agent to do real work:

1. Make sure `a2b serve` is running
2. Make sure the unpacked Chrome extension has been reloaded after the latest local build
3. Wait a few seconds for the extension to reconnect automatically
4. Run `node ./bin/a2b.mjs status`
5. Run `node ./bin/a2b.mjs tabs`

Important:

- `tabs` may still show cached targets even when live commands cannot execute yet
- if a real action command returns `Extension is not connected` or `Timed out waiting for ...`, treat that as a recovery signal, not as a successful ready state

## Recovery Steps

If an AI agent hits:

- `Extension is not connected`
- `Timed out waiting for tab.goto`
- `Timed out waiting for operation.*`
- `Timed out waiting for script.run`

use this recovery order:

1. Keep `a2b serve` running
2. Reload the unpacked extension in `chrome://extensions`
3. Wait a few seconds for the extension to reconnect
4. Re-run `node ./bin/a2b.mjs status`
5. Retry the failed command

## Popup Actions

- `Copy For AI`
  - copies a short AI-ready bundle with the docs URL, bridge URL, target identity, and recording address
- `Copy Cookies`
  - copies the current site's cookies as a normal `Cookie` header string
- `Debug Count`
  - shows development-time recording count for the current target

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
- `tab.list`
- `tab.create`
- `tab.activate`
- `tab.goto`
- `tab.reload`
- `tab.back`
- `tab.forward`
- `tab.close`
- `operation.eval`
- `operation.click`
- `operation.type`
- `operation.press`
- `operation.waitFor`
- `page.screenshot`
- `script.run`
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
- `tab.list.result`
- `tab.create.result`
- `tab.activate.result`
- `tab.goto.result`
- `tab.reload.result`
- `tab.back.result`
- `tab.forward.result`
- `tab.close.result`
- `operation.result`
- `page.screenshot.result`
- `script.run.result`
- `cookies.result`
- `recording.result`
- `debugger.result`
- `error`

## Suggested AI Workflow

1. User opens the site they care about.
2. User opens the extension popup and clicks `Copy For AI`.
3. AI reads the copied descriptor.
4. AI starts `a2b serve` if the relay is not already running.
5. AI can query `a2b tabs` or call the HTTP relay directly using the copied `targetId`.
6. AI verifies action readiness, not just tab discovery.
7. AI can drive the selected page through `goto`, `reload`, `wait-for`, `type`, `click`, `eval-js`, `run-js`, and `screenshot`.
8. If the built-in action surface is not enough, AI uses `run-js` as the fallback.
9. If AI needs a structured page-state view, it uses `agent-browser snapshot --json` after connecting to the right browser context.
10. If deeper browser control is needed after that, AI launches `agent-browser --auto-connect`.

## Open Source References

This implementation was shaped by these mature open-source projects:

- [`vercel-labs/agent-browser`](https://github.com/vercel-labs/agent-browser)
  - for the AI-side auto-connect model to running Chrome
- [`ruifigueira/playwright-crx`](https://github.com/ruifigueira/playwright-crx)
  - for extension-side `chrome.debugger` transport ideas
- [`checkly/headless-recorder`](https://github.com/checkly/headless-recorder)
  - for recorder structure and event-capture flow

See [`THIRD_PARTY_NOTICES.md`](/Users/gaoshizai/work/plugin/THIRD_PARTY_NOTICES.md) for attribution details.
