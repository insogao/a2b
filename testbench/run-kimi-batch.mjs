#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  clearRunRoot,
  normalizeTasks,
  renderInitialReport,
  renderRunSummary,
  renderTaskPrompt
} from "./lib/task-runner.mjs";

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    manifest: path.resolve("testbench/tasks/default.json"),
    concurrency: 2,
    timeoutMs: 120_000
  };

  while (args.length > 0) {
    const value = args.shift();
    if (value === "--manifest") {
      options.manifest = path.resolve(args.shift() ?? options.manifest);
      continue;
    }
    if (value === "--concurrency") {
      options.concurrency = Number(args.shift() ?? "2");
      continue;
    }
    if (value === "--timeout-ms") {
      options.timeoutMs = Number(args.shift() ?? "120000");
      continue;
    }
  }

  return options;
}

function timestampId() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function runTask(task, context) {
  await ensureDir(task.taskDir);
  const initialReport = renderInitialReport(task);
  await fs.writeFile(task.reportPath, initialReport, "utf8");

  const prompt = renderTaskPrompt(task, {
    relayCommand: "node ./bin/a2b.mjs serve",
    docsPath: "https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md",
    installPath: "https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md"
  });
  await fs.writeFile(task.compiledPromptPath, prompt, "utf8");

  const rawChunks = [];
  const startedAt = Date.now();

  const child = spawn(
    "kimi",
    [
      "--yolo",
      "--print",
      "--output-format",
      "text",
      "--work-dir",
      process.cwd(),
      "--session",
      `testbench-${context.runId}-${task.slug}`,
      "--prompt",
      prompt
    ],
    {
      cwd: process.cwd(),
      env: process.env
    }
  );

  child.stdout.on("data", (chunk) => {
    rawChunks.push(chunk);
  });

  child.stderr.on("data", (chunk) => {
    rawChunks.push(chunk);
  });

  const exitCode = await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      resolve("timeout");
    }, context.timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeoutId);
      resolve(code ?? 0);
    });
  });

  const rawOutput = Buffer.concat(rawChunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  await fs.writeFile(task.rawOutputPath, rawOutput, "utf8");

  const artifacts = (await fs.readdir(task.taskDir)).sort();
  let notes = "";
  try {
    const reportContents = await fs.readFile(task.reportPath, "utf8");
    notes =
      reportContents === initialReport
        ? "Report file was never updated beyond the initial scaffold."
        : reportContents;
  } catch {
    notes = `Expected report.md missing. Found artifacts: ${artifacts.join(", ")}`;
  }

  return {
    name: task.name,
    slug: task.slug,
    status: exitCode === 0 ? "passed" : exitCode === "timeout" ? "timed_out" : "failed",
    exitCode: exitCode === "timeout" ? -1 : exitCode,
    durationMs: Date.now() - startedAt,
    reportPath: task.reportPath,
    notes: notes.split("\n").find((line) => line.trim().length > 0) ?? notes,
    artifacts
  };
}

async function runWithConcurrency(tasks, worker, concurrency) {
  const results = [];
  let cursor = 0;

  async function consume() {
    while (cursor < tasks.length) {
      const current = tasks[cursor];
      cursor += 1;
      results.push(await worker(current));
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, tasks.length || 1)) },
    () => consume()
  );
  await Promise.all(workers);
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await readJson(options.manifest);
  const runId = timestampId();
  const runRoot = path.resolve("testbench/runs");
  const runDir = path.resolve(runRoot, runId);

  await clearRunRoot(runRoot);
  await ensureDir(runDir);

  const tasks = normalizeTasks(manifest.tasks ?? [], {
    runDir,
    sharedInstructions: manifest.sharedInstructions ?? ""
  });

  const results = await runWithConcurrency(
    tasks,
    (task) => runTask(task, { runId, timeoutMs: options.timeoutMs }),
    options.concurrency
  );

  const summaryMarkdown = renderRunSummary({
    runId,
    manifestPath: options.manifest,
    tasks: results
  });

  await fs.writeFile(path.join(runDir, "summary.md"), summaryMarkdown, "utf8");
  await fs.writeFile(
    path.join(runDir, "summary.json"),
    JSON.stringify(
      {
        runId,
        manifestPath: options.manifest,
        tasks: results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        runDir,
        taskCount: results.length
      },
      null,
      2
    )
  );
}

await main();
