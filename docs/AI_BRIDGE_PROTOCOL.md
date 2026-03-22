# A2B AI Bridge Protocol

This document explains how an AI tool should use the A2B Chrome extension, local relay, and CLI.

For internal AI validation prompts, manifests, and batch-run scripts, use the dedicated [`testbench/`](/Users/gaoshizai/work/plugin/testbench) area instead of adding test-agent instructions to the release README.

Recommended command ladder:

1. Use A2B high-level commands first
2. Use `run-js` when the built-in action set is insufficient
3. Use `agent-browser snapshot` when you need structured page state and refs
4. Use `agent-browser` more broadly only when deeper automation is still required

## Purpose

The extension exposes the user's current browser page as a target with:

- a stable `targetId`
- the page origin and title
- a cookie snapshot endpoint
- a structured recording log endpoint
- a tab-targeted operations surface for DOM actions and screenshots

The A2B relay runs locally and is separate from Chrome's own CDP port.

## Connection Model

- Bridge endpoint: `ws://127.0.0.1:46321/ws`
- Health check: `http://127.0.0.1:46321/healthz`
- Extension targets are announced through `target.register`
- Official CLI executable: `a2b`

## Important Distinction

`ws://127.0.0.1:46321/ws` is the A2B local relay endpoint.

It is **not** Chrome's native CDP port.

If deeper browser automation is needed, the AI tool may still use Chrome discovery logic such as `agent-browser --auto-connect`.

For page-state extraction, prefer `agent-browser snapshot` rather than rebuilding a parallel snapshot system in A2B.

## Minimum AI Flow

1. Ensure the local relay is alive by checking `/healthz`
2. Read the copied bundle from the extension popup
3. Use the included `targetId` as the page identity
4. Request tabs, cookies, or logs from the relay for that `targetId`
5. If the task needs page structure, refs, or a full page-state snapshot, hand off to `agent-browser snapshot --json`

## Development Reload Rule

When working against a local unpacked extension build:

1. Run `npm run build`
2. Go to `chrome://extensions`
3. Click `Reload` on the unpacked A2B extension
4. Open the popup once before expecting action commands to work

If you skip reload after a local rebuild, old commands may still appear to work while newly added commands can time out.

## Readiness And Recovery

Do not treat `tabs` output alone as proof that the browser is fully ready for action commands.

Possible states:

- relay is up
- cached targets exist
- the extension can actually execute commands

These are not always the same thing during development.

If an action command fails with:

- `Extension is not connected`
- `Timed out waiting for tab.goto`
- `Timed out waiting for operation.*`
- `Timed out waiting for script.run`

follow this order:

1. Keep `a2b serve` running
2. Reload the unpacked extension
3. Open the popup once
4. Re-run `a2b status`
5. Retry the failed command

## CLI

```bash
a2b -h
a2b serve
a2b status
a2b tabs
a2b new https://gemini.google.com
a2b select tab-3
a2b goto tab-3 https://gemini.google.com/app
a2b reload tab-3
a2b back tab-3
a2b forward tab-3
a2b close tab-3
a2b cookies tab-3
a2b log tab-3
a2b wait-for tab-3 "#prompt"
a2b type tab-3 "#prompt" "hello from a2b"
a2b click tab-3 "#send"
a2b eval-js tab-3 "document.title"
a2b run-js tab-3 ./script.js
a2b screenshot tab-3 --path ./page.png
```

Notes:

- `tab-3` can be a full target id or a unique prefix.
- The relay resolves prefixes and returns an error if the prefix is ambiguous.

## Example Copied Bundle

```text
Docs: https://github.com/insogao/a2b/blob/main/docs/AI_BRIDGE_PROTOCOL.md
Bridge: ws://127.0.0.1:46321/ws
Target: session-aa8af632-tab-482670830
Origin: https://gemini.google.com
Title: Google Gemini
URL: https://gemini.google.com/app/123
Recording: bridge://recording/session-aa8af632-tab-482670830
```

## Bridge Commands

### Get Cookies

```json
{
  "type": "cookies.get",
  "payload": {
    "targetId": "session-aa8af632-tab-482670830"
  }
}
```

### Get Recording Log

```json
{
  "type": "recording.get",
  "payload": {
    "targetId": "session-aa8af632-tab-482670830"
  }
}
```

### Start Recording

```json
{
  "type": "recording.start",
  "payload": {
    "targetId": "session-aa8af632-tab-482670830"
  }
}
```

### Stop Recording

```json
{
  "type": "recording.stop",
  "payload": {
    "targetId": "session-aa8af632-tab-482670830"
  }
}
```

### List Tabs

```json
{
  "type": "tab.list",
  "payload": {}
}
```

### Create Tab

```json
{
  "type": "tab.create",
  "payload": {
    "url": "https://gemini.google.com"
  }
}
```

### Activate Tab

```json
{
  "type": "tab.activate",
  "payload": {
    "targetId": "tab-381"
  }
}
```

### Navigate Tab

```json
{
  "type": "tab.goto",
  "payload": {
    "targetId": "tab-381",
    "url": "https://gemini.google.com/app"
  }
}
```

### Reload Tab

```json
{
  "type": "tab.reload",
  "payload": {
    "targetId": "tab-381"
  }
}
```

### Run Script Source

```json
{
  "type": "script.run",
  "payload": {
    "targetId": "tab-381",
    "source": "return document.querySelector('h1')?.textContent ?? '';"
  }
}
```

### Eval In Page

```json
{
  "type": "operation.eval",
  "payload": {
    "targetId": "tab-381",
    "expression": "document.title"
  }
}
```

### Click Element

```json
{
  "type": "operation.click",
  "payload": {
    "targetId": "tab-381",
    "selector": "#send"
  }
}
```

### Type Into Element

```json
{
  "type": "operation.type",
  "payload": {
    "targetId": "tab-381",
    "selector": "#prompt",
    "text": "hello from a2b"
  }
}
```

### Press A Key

```json
{
  "type": "operation.press",
  "payload": {
    "targetId": "tab-381",
    "selector": "#prompt",
    "key": "Enter"
  }
}
```

### Wait For Selector

```json
{
  "type": "operation.waitFor",
  "payload": {
    "targetId": "tab-381",
    "selector": "#prompt",
    "timeoutMs": 5000
  }
}
```

### Capture Screenshot

```json
{
  "type": "page.screenshot",
  "payload": {
    "targetId": "tab-381"
  }
}
```

## HTTP Relay Routes

The local relay mirrors the common browser actions over HTTP:

- `GET /tabs`
- `POST /tabs/open`
- `POST /tabs/focus`
- `POST /tabs/goto`
- `POST /tabs/reload`
- `POST /tabs/back`
- `POST /tabs/forward`
- `POST /tabs/close`
- `POST /cookies`
- `POST /recording`
- `POST /eval`
- `POST /run-js`
- `POST /click`
- `POST /type`
- `POST /press`
- `POST /wait-for`
- `POST /screenshot`

All action routes accept either a full `targetId` or a unique prefix via the `target` field.

## Install Detection Strategy

Recommended AI-side checks:

1. Probe the local relay health endpoint
2. Check whether the extension has registered targets
3. If no extension signal is present, direct the user to the Chrome Web Store listing

Do not assume that a running Chrome window means the extension is installed or active.
