import path from "node:path";
import fs from "node:fs/promises";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "task";
}

export function normalizeTasks(tasks, { runDir, sharedInstructions = "" }) {
  return tasks.map((task, index) => {
    const slug = slugify(task.slug || task.name || `task-${index + 1}`);
    const taskDir = path.join(runDir, slug);
    return {
      ...task,
      slug,
      sharedInstructions,
      taskDir,
      reportPath: task.reportPath || path.join(taskDir, "report.md"),
      rawOutputPath: task.rawOutputPath || path.join(taskDir, "raw-output.txt"),
      compiledPromptPath: task.compiledPromptPath || path.join(taskDir, "prompt.md")
    };
  });
}

export function renderTaskPrompt(task, { relayCommand, docsPath, installPath }) {
  return [
    "# A2B Testbench Task",
    "",
    "Use the local A2B CLI and browser bridge to execute this task.",
    "",
    "## Simulated Copy For AI",
    "First read in browser: use the extension-local guide URL from the real Copy For AI bundle when available.",
    `If unavailable, fetch and follow instructions from ${installPath}`,
    `Detailed guide: ${docsPath}`,
    "If the local extension guide is unavailable, use the GitHub bootstrap and keep going.",
    "Browser Access: On",
    "Bridge: ws://127.0.0.1:46321/ws",
    "Target: choose the most relevant existing tab or create a new one if needed",
    "",
    `Task: ${task.name}`,
    "",
    "## Shared Instructions",
    task.sharedInstructions || "Record all disconnects, retries, and ambiguity truthfully.",
    "",
    "## Task Prompt",
    task.prompt,
    "",
    "## Environment Hints",
    `- Relay command: ${relayCommand}`,
    `- Install bootstrap: ${installPath}`,
    `- Bridge docs: ${docsPath}`,
    "",
    "## Required Execution Rules",
    "1. The runner already prepared one shared relay and one shared Chrome instance when possible.",
    "2. First run `node ./bin/a2b.mjs status --json`.",
    "3. Do not start another relay if `a2b status --json` already works.",
    "4. Do not launch Google Chrome yourself. Reuse the shared browser instance.",
    "5. Do not read `bin/a2b.mjs` unless the CLI help is insufficient.",
    "6. Use `node ./bin/a2b.mjs -h` for command discovery before opening source files.",
    "7. Update the report file early, then keep appending findings as you work.",
    "8. Within your first 3 commands, replace at least one `Pending` bullet in the report with a real observation.",
    "9. Do not create todo lists, planning artifacts, or a custom harness unless the task explicitly requires it.",
    "",
    "## Required Deliverable",
    `Write a Markdown report to: ${task.reportPath}`,
    "Use exactly that Markdown path. Do not substitute JSON for the main report file.",
    "",
    "Your report must explicitly cover:",
    "1. Whether the flow felt smooth",
    "2. Any interruptions, disconnects, ambiguity, or manual recovery",
    "3. The exact commands or actions that mattered",
    "4. The final outcome",
    "5. Any unresolved issue that should be investigated later",
    "",
    "Prefer direct A2B CLI use over building a custom harness.",
    "If you do create any extra helper files, mention that explicitly in the report.",
    "",
    "Even if the task eventually succeeds, record every abnormal event honestly."
  ].join("\n");
}

export function renderInitialReport(task) {
  return [
    `# ${task.name}`,
    "",
    "## Smoothness",
    "- Pending",
    "",
    "## Interruptions And Recovery",
    "- Pending",
    "",
    "## Commands And Actions",
    "- Pending",
    "",
    "## Final Outcome",
    "- Pending",
    "",
    "## Unresolved Issues",
    "- Pending",
    ""
  ].join("\n");
}

export function renderRunSummary({ runId, manifestPath, tasks }) {
  const lines = [
    "# Testbench Run Summary",
    "",
    `- Run ID: ${runId}`,
    `- Manifest: ${manifestPath}`,
    ""
  ];

  for (const task of tasks) {
    lines.push(`## ${task.name}`);
    lines.push(`- Slug: ${task.slug}`);
    lines.push(`- Status: ${task.status}`);
    lines.push(`- Exit Code: ${task.exitCode}`);
    lines.push(`- Duration Ms: ${task.durationMs}`);
    lines.push(`- Report: ${task.reportPath}`);
    if (Array.isArray(task.artifacts) && task.artifacts.length > 0) {
      lines.push(`- Artifacts: ${task.artifacts.join(", ")}`);
    }
    if (task.notes) {
      lines.push(`- Notes: ${task.notes}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function clearRunRoot(runRoot) {
  await fs.mkdir(runRoot, { recursive: true });
  const entries = await fs.readdir(runRoot);
  await Promise.all(
    entries.map((entry) => fs.rm(path.join(runRoot, entry), { recursive: true, force: true }))
  );
}
