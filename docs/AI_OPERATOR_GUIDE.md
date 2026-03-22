# A2B AI Operator Guide

Read this guide before using A2B.

Bootstrap shortcut:

`Fetch and follow instructions from https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md`

The preferred bootstrap page is the extension-local guide URL copied by the plugin,
for example `chrome-extension://<extension-id>/ai-guide.html`.

If the local extension guide is unavailable, use the GitHub copy of this guide.
If both are unavailable, do not block on doc fetching. Continue with
`node ./bin/a2b.mjs -h`, `node ./bin/a2b.mjs status --json`, and the command ladder below.

## Required Order

1. Run `a2b status --json`
2. If `status` succeeds, do not start another relay
3. Run `a2b tabs --json`
4. Reuse an existing target tab when possible
5. Use A2B high-level commands first
6. Use `a2b run-js` only if high-level commands are not enough

## Doc Fallback

Use this order:

1. Read the extension-local guide URL from the `Copy For AI` bundle
2. If that local guide is unavailable, fetch and follow the raw GitHub bootstrap at `.codex/INSTALL.md`
3. If that bootstrap is still unavailable, read the GitHub guide
4. If GitHub returns `429`, `404`, or another fetch failure, continue without docs and use:
   - `node ./bin/a2b.mjs -h`
   - `node ./bin/a2b.mjs status --json`
   - `node ./bin/a2b.mjs tabs --json`

Documentation is a bootstrap aid, not a required network dependency.

## Do Not Do These First

- Do not read source code unless the guide is insufficient
- Do not start a second relay if one is already healthy
- Do not build a custom harness unless the task is blocked without it

## Command Ladder

1. `a2b status --json`
2. `a2b tabs --json`
3. `a2b select <target>`
4. One of:
   - `a2b goto <target> <url>`
   - `a2b wait-for <target> <selector>`
   - `a2b click <target> <selector>`
   - `a2b type <target> <selector> <text>`
   - `a2b eval-js <target> <expression>`
   - `a2b screenshot <target> --path <file>`
5. `a2b run-js <target> <file>` only when needed

## Reliable Interaction Patterns

- Prefer `a2b select <target>` before `a2b goto <target> <url>`. This is the most reliable navigation pattern.
- Do not assume the immediate `goto` response proves the page finished navigating. Confirm with `a2b tabs --json`, `a2b wait-for`, or `a2b eval-js`.
- If `a2b press <target> <selector> Enter` does not submit a search or form, retry with an explicit submit-button `click`.
- Prefer high-level commands over `run-js` even when a first attempt needs a small retry or a different selector.

## Recovery

If you hit:

- `Extension is not connected`
- `Timed out waiting for tab.goto`
- `Timed out waiting for operation.*`
- `Timed out waiting for script.run`

Use this order:

1. Keep `a2b serve` running
2. Reload the unpacked extension
3. Wait a few seconds for the extension to reconnect automatically
4. Re-run `a2b status --json`
5. Retry the failed command

## Output Discipline

- Record disconnects and retries truthfully
- Prefer concise command execution over long planning narration
- If you are asked to write a report, update the report file early and keep it current
