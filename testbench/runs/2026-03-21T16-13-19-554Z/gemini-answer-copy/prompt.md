# A2B Testbench Task

Use the local A2B CLI and browser bridge to execute this task.

## Simulated Copy For AI
First read: https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md
Browser Access: On
Bridge: ws://127.0.0.1:46321/ws
Target: choose the most relevant existing tab or create a new one if needed

Task: Gemini 提问并复制答案

## Shared Instructions
Use the simulated Copy For AI bootstrap first. Record every disconnect, timeout, stale target, retry, workaround, or ambiguity truthfully. If the browser task succeeds, still record any odd behavior. Prefer A2B high-level commands first, then eval-js, then run-js only if necessary.

## Task Prompt
Use the existing Google Gemini tab if available. Ask Gemini a concise question in Chinese about today's most important AI product trends, wait for the answer to finish, then copy the final answer text into the report. Record the exact commands that mattered and whether any waiting or retries were needed.

## Environment Hints
- Relay command: node ./bin/a2b.mjs serve
- Bridge docs: https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md

## Required Execution Rules
1. First run `node ./bin/a2b.mjs status --json`.
2. Do not start a second relay if `a2b status --json` already works.
3. If `status` fails, start exactly one relay with `node ./bin/a2b.mjs serve --port 46321`.
4. Do not read `bin/a2b.mjs` unless the CLI help is insufficient.
5. Use `node ./bin/a2b.mjs -h` for command discovery before opening source files.
6. Update the report file early, then keep appending findings as you work.
7. Within your first 3 commands, replace at least one `Pending` bullet in the report with a real observation.
8. Do not create todo lists, planning artifacts, or a custom harness unless the task explicitly requires it.

## Required Deliverable
Write a Markdown report to: /Users/gaoshizai/work/plugin/testbench/runs/2026-03-21T16-13-19-554Z/gemini-answer-copy/report.md
Use exactly that Markdown path. Do not substitute JSON for the main report file.

Your report must explicitly cover:
1. Whether the flow felt smooth
2. Any interruptions, disconnects, ambiguity, or manual recovery
3. The exact commands or actions that mattered
4. The final outcome
5. Any unresolved issue that should be investigated later

Prefer direct A2B CLI use over building a custom harness.
If you do create any extra helper files, mention that explicitly in the report.

Even if the task eventually succeeds, record every abnormal event honestly.