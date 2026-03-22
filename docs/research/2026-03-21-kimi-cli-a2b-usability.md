# Kimi CLI A2B Usability Findings

## Goal

Evaluate whether a relatively low-guidance CLI agent can understand and operate A2B correctly from the current Markdown docs alone.

## Test Setup

- Relay started locally with `node ./bin/a2b.mjs serve --port 46321`
- Kimi CLI used in `--yolo --print` mode
- Workspace: `/Users/gaoshizai/work/plugin`
- Primary docs provided to the agent:
  - `README.md`
  - `docs/AI_BRIDGE_PROTOCOL.md`

## Sessions

### Session `a2b-doc-smoke`

Prompt:

> Read README.md and docs/AI_BRIDGE_PROTOCOL.md from the current workspace. In Chinese, summarize A2B in 3 concise bullet points, focusing on what it does and what it does not do.

Outcome:

- Success
- Kimi correctly understood:
  - A2B is a browser bridge, not native CDP
  - `run-js` is a fallback
  - `agent-browser` is the page-snapshot / deeper automation layer

Conclusion:

- The high-level product positioning is understandable from the docs.

### Session `a2b-weather-test`

Prompt:

> Read README.md and docs/AI_BRIDGE_PROTOCOL.md in the workspace. Then use the available A2B workflow to get the current weather summary for Shanghai from a web page in the browser. Prefer A2B high-level commands first, then use run-js only if needed. Return a concise Chinese summary plus the exact commands you used.

Observed behavior:

1. Kimi correctly read the docs
2. Kimi checked `a2b status`
3. Kimi listed tabs with `a2b tabs`
4. Kimi attempted `a2b new`
5. Kimi received `Extension is not connected`
6. Kimi then concluded the extension was unavailable and stopped

Important finding:

- `a2b tabs` can still return cached targets even when the extension is not currently able to execute commands
- from an agent's perspective, this is ambiguous because discovery appears healthy while action commands fail

Secondary finding:

- during local development, if the extension has not been reloaded after a rebuild, newly added commands can time out even though older commands and cached target listing still appear to work

## Main Ambiguities Identified

### 1. Discovery readiness vs command readiness

The docs previously implied that:

- relay health
- target listing

were sufficient indicators that browser actions could proceed.

Observed reality:

- cached targets are not a guarantee that live command execution is available

### 2. Missing explicit extension reload guidance for dev builds

In development, after `npm run build`, the user must reload the unpacked extension in `chrome://extensions`.

Without that:

- the relay may still see older targets
- newly added commands may time out
- a low-guidance AI will misdiagnose the problem as a generic connectivity issue

### 3. Recovery steps were underspecified

When an action command fails with:

- `Extension is not connected`
- `Timed out waiting for ...`

the docs need to tell the agent what to do next, not just how the happy path works.

## Documentation Changes Recommended

1. Explicitly distinguish:
   - relay up
   - cached targets available
   - extension command path actually ready
2. Add a development note:
   - after every local rebuild, reload the unpacked extension
3. Add a recovery playbook:
   - if action commands fail, reload the extension and reopen the popup once
   - then retry
4. Avoid implying that `tabs` alone proves readiness

## Product Implication

The current docs are strong on architecture and command surface, but weaker on operational recovery.

Low-guidance agents can understand the model, but they need a clearer recovery path for:

- stale extension builds
- disconnected bridge sockets
- cached targets without live command execution
