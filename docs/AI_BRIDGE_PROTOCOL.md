# A2B AI Bridge Protocol

This document explains how an AI tool should use the A2B Chrome extension and its local bridge.

## Purpose

The extension exposes the user's current browser page as a target with:

- a stable `targetId`
- the page origin and title
- a cookie snapshot endpoint
- a structured recording log endpoint

The AI bridge runs locally and is separate from Chrome's own CDP port.

## Connection Model

- Bridge endpoint: `ws://127.0.0.1:46321/ws`
- Health check: `http://127.0.0.1:46321/healthz`
- Extension targets are announced through `target.register`

## Important Distinction

`ws://127.0.0.1:46321/ws` is the A2B local bridge endpoint.

It is **not** Chrome's native CDP port.

If deeper browser automation is needed, the AI tool may still use Chrome discovery logic such as `agent-browser --auto-connect`.

## Minimum AI Flow

1. Ensure the local bridge is alive by checking `/healthz`
2. Read the copied bundle from the extension popup
3. Use the included `targetId` as the page identity
4. Request logs or cookies from the bridge for that `targetId`

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

## Install Detection Strategy

Recommended AI-side checks:

1. Probe the local bridge health endpoint
2. Check whether the extension has registered targets
3. If no extension signal is present, direct the user to the Chrome Web Store listing

Do not assume that a running Chrome window means the extension is installed or active.
