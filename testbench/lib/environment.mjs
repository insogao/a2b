import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { spawn } from "node:child_process";

const execFileAsync = promisify(execFile);

export function createBatchEnvironmentPreflight({
  readStatus,
  isChromeRunning,
  startRelay,
  launchChrome,
  wait,
  maxAttempts = 8,
  retryDelayMs = 1_000
}) {
  return async function preflight() {
    let relayStarted = false;
    let chromeLaunched = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const status = await readStatus();
      if (status?.ok && status.extensionConnected) {
        return {
          connected: true,
          relayStarted,
          chromeLaunched,
          attempts: attempt
        };
      }

      if (attempt === 1 && !status) {
        await startRelay();
        relayStarted = true;
      }

      if (attempt === 1) {
        const chromeRunning = await isChromeRunning();
        if (!chromeRunning) {
          await launchChrome();
          chromeLaunched = true;
        }
      }

      if (attempt < maxAttempts) {
        await wait(retryDelayMs);
      }
    }

    return {
      connected: false,
      relayStarted,
      chromeLaunched,
      attempts: maxAttempts
    };
  };
}

export function createDefaultBatchEnvironmentPreflight({
  cwd,
  profileDirectory = "Default",
  relayPort = 46321
}) {
  return createBatchEnvironmentPreflight({
    readStatus: () => readRelayStatus({ cwd }),
    isChromeRunning: () => detectChromeRunning(),
    startRelay: () => startSharedRelay({ cwd, relayPort }),
    launchChrome: () => launchSharedChrome({ profileDirectory }),
    wait: (ms) => delay(ms)
  });
}

async function readRelayStatus({ cwd }) {
  try {
    const { stdout } = await execFileAsync(
      "node",
      ["./bin/a2b.mjs", "status", "--json"],
      { cwd }
    );
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function detectChromeRunning() {
  try {
    await execFileAsync("pgrep", [
      "-f",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    ]);
    return true;
  } catch {
    return false;
  }
}

async function startSharedRelay({ cwd, relayPort }) {
  const child = spawn(
    "node",
    ["./bin/a2b.mjs", "serve", "--port", String(relayPort)],
    {
      cwd,
      detached: true,
      stdio: "ignore"
    }
  );
  child.unref();
}

async function launchSharedChrome({ profileDirectory }) {
  await execFileAsync("open", [
    "-na",
    "Google Chrome",
    "--args",
    `--profile-directory=${profileDirectory}`
  ]);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
