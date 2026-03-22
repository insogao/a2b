# Kimi Testbench Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated testbench area for AI-driven A2B CLI validation without polluting the release README.

**Architecture:** Create a `testbench/` workspace that holds task manifests, prompt templates, batch-run scripts, and per-run artifacts. Keep reusable runner logic in a small module with unit tests, then provide a CLI wrapper that launches multiple Kimi sessions in parallel and writes a concise summary plus raw logs.

**Tech Stack:** Node.js ESM, Vitest, existing Kimi CLI, Markdown artifacts

---

### Task 1: Add failing tests for testbench runner helpers

**Files:**
- Create: `src/testbench/taskRunner.test.ts`
- Create: `testbench/lib/task-runner.mjs`

**Step 1: Write the failing tests**

Cover:
- manifest loading defaults the report path and slug sanely
- prompt rendering includes required reporting instructions and output path
- summary rendering captures success, duration, and issue notes

**Step 2: Run test to verify it fails**

Run: `npm test -- src/testbench/taskRunner.test.ts`

**Step 3: Write minimal implementation**

Implement helper functions for manifest normalization, prompt rendering, and summary rendering.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/testbench/taskRunner.test.ts`

### Task 2: Build the Kimi batch runner

**Files:**
- Create: `testbench/run-kimi-batch.mjs`
- Modify: `package.json`
- Create: `testbench/tasks/default.json`
- Create: `testbench/prompts/system.md`

**Step 1: Write the failing tests**

Extend `src/testbench/taskRunner.test.ts` to cover runner-side path generation and per-task artifact layout.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/testbench/taskRunner.test.ts`

**Step 3: Write minimal implementation**

Add a script that:
- reads a task manifest
- creates a timestamped run directory under `testbench/runs/`
- writes per-task prompt and raw-output files
- spawns `kimi --yolo --print` in parallel
- writes `summary.md` and `summary.json`

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/testbench/taskRunner.test.ts`

### Task 3: Document testbench usage separately

**Files:**
- Create: `testbench/README.md`
- Modify: `docs/AI_BRIDGE_PROTOCOL.md`

**Step 1: Update docs**

Document:
- what the testbench is for
- how to run it
- where logs and AI-written reports land
- the exact rule that release README stays product-focused and test prompts live in `testbench/`

**Step 2: Verify build and tests**

Run:
- `npm test`
- `npm run build`

