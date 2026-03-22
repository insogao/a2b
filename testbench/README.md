# A2B Testbench

This directory is for internal AI-driven validation only.

It is intentionally separate from the release [`README.md`](/Users/gaoshizai/work/plugin/README.md), so product-facing docs stay clean while test prompts and run artifacts live here.

## What Lives Here

- task manifests for batch AI runs
- prompt templates for test agents
- scripts that launch multiple CLI sessions in parallel
- per-run artifacts such as raw output, generated prompts, and AI-written reports

## Default Layout

- [`testbench/tasks/default.json`](/Users/gaoshizai/work/plugin/testbench/tasks/default.json)
- [`testbench/prompts/system.md`](/Users/gaoshizai/work/plugin/testbench/prompts/system.md)
- `testbench/runs/<timestamp>/`

Each task run writes:

- `prompt.md`
- `raw-output.txt`
- `report.md`

Each batch run also writes:

- `summary.md`
- `summary.json`

## Running The Batch

```bash
node ./testbench/run-kimi-batch.mjs
```

Optional flags:

```bash
node ./testbench/run-kimi-batch.mjs --manifest ./testbench/tasks/default.json --concurrency 2
```

The runner feeds each agent a prompt that starts with a simulated `Copy For AI` bootstrap, then appends the specific test task. That keeps batch tests closer to the real user handoff path.

## Reporting Rules

Every AI task report must explicitly cover:

1. Whether the flow felt smooth
2. Any interruptions, disconnects, ambiguity, or manual recovery
3. The exact commands or actions that mattered
4. The final outcome
5. Any unresolved issue worth investigating later

Even if the task succeeds in the end, abnormal behavior still needs to be recorded.

The runner also pre-creates a `report.md` scaffold before launching the AI task.
This lowers the chance that the model forgets to create the file and makes it easier to diff what it actually updated.
