# A2B AI Market Guide

Use the market when the AI needs site-specific hints or tool references beyond the core A2B operator guide.

## Purpose

The market is a GitHub-backed index of:

- site-specific usage notes
- external tool references
- future community-contributed skills and recipes

The market is not a second automation engine. In the first version, it is a browseable guide and link catalog.

## Update First

```bash
node ./bin/a2b.mjs market update
```

This syncs the current market index from `a2b-market` into the local cache.

## Browse Flow

Use this order:

1. `node ./bin/a2b.mjs market categories --json`
2. `node ./bin/a2b.mjs market list <category> --json`
3. `node ./bin/a2b.mjs market show <entry> --json`
4. `node ./bin/a2b.mjs market search <keyword> --json`

Examples:

```bash
node ./bin/a2b.mjs market categories --json
node ./bin/a2b.mjs market list search --json
node ./bin/a2b.mjs market show search/baidu --json
node ./bin/a2b.mjs market search yt-dlp --json
```

## Content Types

Current market entries can be:

- `local_doc`
  - cached markdown maintained in `a2b-market`
- `external_github`
  - external GitHub documentation or skill repos
- `external_tool`
  - external tools such as `yt-dlp`
  - may still include cached markdown notes in `market show` when the market repo provides a local guide

## Execution Rule

Read the market entry first, then decide whether to:

- continue with A2B high-level commands
- use `run-js` as a fallback
- hand the task to an external tool or project link

Do not assume a market entry is directly executable unless it says so.
