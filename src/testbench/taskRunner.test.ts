import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  clearRunRoot,
  normalizeTasks,
  renderInitialReport,
  renderTaskPrompt,
  renderRunSummary
} from "../../testbench/lib/task-runner.mjs";

describe("testbench task runner helpers", () => {
  it("normalizes task slugs and report paths", () => {
    const tasks = normalizeTasks(
      [
        {
          name: "Weather Search",
          prompt: "Find today's weather."
        }
      ],
      {
        runDir: "/tmp/testbench/run-1"
      }
    );

    expect(tasks).toEqual([
      expect.objectContaining({
        name: "Weather Search",
        slug: "weather-search",
        reportPath: "/tmp/testbench/run-1/weather-search/report.md",
        rawOutputPath: "/tmp/testbench/run-1/weather-search/raw-output.txt",
        compiledPromptPath: "/tmp/testbench/run-1/weather-search/prompt.md"
      })
    ]);
  });

  it("renders prompts with explicit reporting instructions", () => {
    const [task] = normalizeTasks(
      [
        {
          name: "Finance Crawl",
          prompt: "Collect finance headlines."
        }
      ],
      {
        runDir: "/tmp/testbench/run-2",
        sharedInstructions: "Always record unexpected failures."
      }
    );

    const prompt = renderTaskPrompt(task, {
      relayCommand: "node ./bin/a2b.mjs serve",
      docsPath: "https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md",
      installPath: "https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md"
    });

    expect(prompt).toContain("## Simulated Copy For AI");
    expect(prompt).toContain("First read in browser: use the extension-local guide URL from the real Copy For AI bundle when available.");
    expect(prompt).toContain("If unavailable, fetch and follow instructions from https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md");
    expect(prompt).toContain("Detailed guide: https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md");
    expect(prompt).toContain("Bridge: ws://127.0.0.1:46321/ws");
    expect(prompt).toContain("Always record unexpected failures.");
    expect(prompt).toContain("Collect finance headlines.");
    expect(prompt).toContain(task.reportPath);
    expect(prompt).toContain("1. Whether the flow felt smooth");
    expect(prompt).toContain("2. Any interruptions, disconnects, ambiguity, or manual recovery");
    expect(prompt).toContain("Do not start a second relay if `a2b status --json` already works");
    expect(prompt).toContain("Do not read `bin/a2b.mjs` unless the CLI help is insufficient");
    expect(prompt).toContain("Update the report file early");
    expect(prompt).toContain("Within your first 3 commands, replace at least one `Pending` bullet");
    expect(prompt).toContain("Do not create todo lists");
    expect(prompt).toContain("If the local extension guide is unavailable, use the GitHub bootstrap and keep going");
  });

  it("renders an initial markdown report scaffold", () => {
    const [task] = normalizeTasks(
      [
        {
          name: "Weather Search",
          prompt: "Find today's weather."
        }
      ],
      {
        runDir: "/tmp/testbench/run-4"
      }
    );

    const report = renderInitialReport(task);

    expect(report).toContain("# Weather Search");
    expect(report).toContain("## Smoothness");
    expect(report).toContain("## Interruptions And Recovery");
    expect(report).toContain("## Commands And Actions");
    expect(report).toContain("## Final Outcome");
    expect(report).toContain("## Unresolved Issues");
  });

  it("renders a markdown summary for completed tasks", () => {
    const summary = renderRunSummary({
      runId: "run-3",
      manifestPath: "/Users/gaoshizai/work/plugin/testbench/tasks/default.json",
      tasks: [
        {
          name: "Weather Search",
          slug: "weather-search",
          status: "passed",
          exitCode: 0,
          durationMs: 1520,
          reportPath: "/tmp/testbench/run-3/weather-search/report.md",
          notes: "No disconnects observed."
        },
        {
          name: "Finance Crawl",
          slug: "finance-crawl",
          status: "failed",
          exitCode: 1,
          durationMs: 900,
          reportPath: "/tmp/testbench/run-3/finance-crawl/report.md",
          notes: "Extension is not connected after retry."
        }
      ]
    });

    expect(summary).toContain("# Testbench Run Summary");
    expect(summary).toContain("Weather Search");
    expect(summary).toContain("passed");
    expect(summary).toContain("Finance Crawl");
    expect(summary).toContain("Extension is not connected after retry.");
  });

  it("clears previous run directories before a new batch", async () => {
    const rootDir = "/tmp/testbench-run-root";
    await fs.mkdir(`${rootDir}/old-run-a`, { recursive: true });
    await fs.mkdir(`${rootDir}/old-run-b`, { recursive: true });
    await fs.writeFile(`${rootDir}/old-run-a/file.txt`, "old", "utf8");

    await clearRunRoot(rootDir);

    const entries = await fs.readdir(rootDir);
    expect(entries).toEqual([]);
  });
});
