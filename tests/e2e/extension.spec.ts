import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createRelayServer } from "../../bin/lib/a2b-relay-server.mjs";

type RuntimeRecording = {
  ok: boolean;
  active: boolean;
  entries: Array<{ kind: string }>;
};

test.describe("A2B extension e2e", () => {
  let server: http.Server;
  let baseUrl: string;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/next") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(`
          <!doctype html>
          <html>
            <body>
              <h1>Next Page</h1>
              <a id="back" href="/">Back</a>
            </body>
          </html>
        `);
        return;
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`
        <!doctype html>
        <html>
          <body>
            <input id="prompt" name="prompt" />
            <button id="send">Send</button>
            <a id="next" href="/next">Next</a>
          </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to start local test server");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  test.afterEach(async () => {
    await context?.close();
    context = undefined;
    page = undefined;
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test("records input, click, and navigation events in a loaded extension", async () => {
    const extensionPath = path.join(process.cwd(), "dist");
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "a2b-e2e-"));

    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    const serviceWorker =
      context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = serviceWorker.url().split("/")[2];

    page = await context.newPage();
    await page.goto(baseUrl);

    const extensionPage = await context.newPage();
    await extensionPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

    await expect
      .poll(async () => {
        const items = await extensionPage.evaluate(() =>
          chrome.runtime.sendMessage({ type: "e2e.listTargets" })
        );
        return Array.isArray(items)
          ? items.filter((item: { origin: string }) =>
              item.origin.startsWith("http://127.0.0.1:")
            ).length
          : 0;
      })
      .toBeGreaterThan(0);

    const targets = await extensionPage.evaluate(() =>
      chrome.runtime.sendMessage({ type: "e2e.listTargets" })
    );

    const target = targets.find((item: { origin: string }) =>
      item.origin.startsWith("http://127.0.0.1:")
    );

    expect(target).toBeTruthy();

    await expect(
      extensionPage.getByRole("switch", { name: "Browser Access" })
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      extensionPage.getByRole("button", { name: "Debug Count · 0" })
    ).toBeVisible();
    await extensionPage.getByRole("button", { name: "Debug Count · 0" }).click();

    await page.locator("#prompt").fill("hello from e2e");
    await page.locator("#send").click();
    await page.locator("#next").click();
    await expect(page.locator("h1")).toHaveText("Next Page");

    await expect
      .poll(async () => {
        return extensionPage.evaluate(async () => {
          const button = document.querySelector<HTMLButtonElement>(
            'button[aria-label^="Debug Count ·"]'
          );
          if (!button) {
            return -1;
          }
          const label = button.getAttribute("aria-label") ?? "";
          const match = label.match(/(\d+)$/);
          return match ? Number(match[1]) : -1;
        });
      })
      .toBeGreaterThan(0);

    const recording = await extensionPage.evaluate((targetId) => {
      return chrome.runtime.sendMessage({
        type: "e2e.recording.get",
        targetId
      });
    }, target.targetId) as RuntimeRecording;

    expect(recording.active).toBe(true);
    expect(recording.entries.length).toBeGreaterThan(0);
    expect(
      recording.entries.some((entry: { kind: string }) => entry.kind === "input")
    ).toBe(true);
    expect(
      recording.entries.some((entry: { kind: string }) => entry.kind === "click")
    ).toBe(true);
  });

  test("executes relay operations against a registered target tab", async () => {
    const relay = await createRelayServer({ port: 46321 });

    try {
      const extensionPath = path.join(process.cwd(), "dist");
      const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "a2b-e2e-relay-"));

      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`
        ]
      });

      page = await context.newPage();
      await page.goto(baseUrl);

      await expect
        .poll(async () => {
          const response = await fetch(`${relay.baseUrl}/healthz`);
          const json = await response.json();
          return json.extensionConnected && json.targetCount > 0;
        })
        .toBe(true);

      const tabsResponse = await fetch(`${relay.baseUrl}/tabs`);
      const tabsJson = await tabsResponse.json() as {
        targets: Array<{ targetId: string; origin: string }>;
      };
      const target = tabsJson.targets.find((item) =>
        item.origin.startsWith("http://127.0.0.1:")
      );

      expect(target).toBeTruthy();

      const waitResponse = await fetch(`${relay.baseUrl}/wait-for`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId,
          selector: "#prompt",
          timeoutMs: 2000
        })
      });
      expect(waitResponse.ok).toBe(true);

      const typeResponse = await fetch(`${relay.baseUrl}/type`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId,
          selector: "#prompt",
          text: "hello from relay"
        })
      });
      expect(typeResponse.ok).toBe(true);

      const evalResponse = await fetch(`${relay.baseUrl}/eval`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId,
          expression: "document.querySelector('#prompt').value"
        })
      });
      const evalJson = await evalResponse.json() as { ok: boolean; value: string };

      expect(evalResponse.ok).toBe(true);
      expect(evalJson.value).toBe("hello from relay");

      const clickResponse = await fetch(`${relay.baseUrl}/click`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId,
          selector: "#send"
        })
      });
      if (!clickResponse.ok) {
        throw new Error(`click failed: ${await clickResponse.text()}`);
      }

      const screenshotResponse = await fetch(`${relay.baseUrl}/screenshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId
        })
      });
      const screenshotJson = await screenshotResponse.json() as {
        ok: boolean;
        data: string;
      };

      expect(screenshotResponse.ok).toBe(true);
      expect(screenshotJson.ok).toBe(true);
      expect(screenshotJson.data.length).toBeGreaterThan(0);
    } finally {
      await relay.close();
    }
  });

  test("executes relay goto, reload, and run-js commands against a target tab", async () => {
    const relay = await createRelayServer({ port: 46321 });

    try {
      const extensionPath = path.join(process.cwd(), "dist");
      const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "a2b-e2e-nav-"));

      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`
        ]
      });

      page = await context.newPage();
      await page.goto(baseUrl);

      await expect
        .poll(async () => {
          const response = await fetch(`${relay.baseUrl}/tabs`);
          const json = await response.json();
          return Array.isArray(json.targets) && json.targets.length > 0;
        })
        .toBe(true);

      const tabsResponse = await fetch(`${relay.baseUrl}/tabs`);
      const tabsJson = await tabsResponse.json() as {
        targets: Array<{ targetId: string; origin: string }>;
      };
      const target = tabsJson.targets.find((item) =>
        item.origin.startsWith("http://127.0.0.1:")
      );

      expect(target).toBeTruthy();

      const gotoResponse = await fetch(`${relay.baseUrl}/tabs/goto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId,
          url: `${baseUrl}/next`
        })
      });
      expect(gotoResponse.ok).toBe(true);
      await expect(page!.locator("h1")).toHaveText("Next Page");

      const reloadResponse = await fetch(`${relay.baseUrl}/tabs/reload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId
        })
      });
      expect(reloadResponse.ok).toBe(true);
      await expect(page!.locator("h1")).toHaveText("Next Page");

      const scriptPath = path.join(userDataDir, "read-title.js");
      await fs.writeFile(
        scriptPath,
        "return document.querySelector('h1')?.textContent ?? '';"
      );

      const runJsResponse = await fetch(`${relay.baseUrl}/run-js`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target?.targetId,
          source: await fs.readFile(scriptPath, "utf8")
        })
      });
      const runJsJson = await runJsResponse.json() as { ok: boolean; value: string };

      expect(runJsResponse.ok).toBe(true);
      expect(runJsJson.value).toBe("Next Page");
    } finally {
      await relay.close();
    }
  });
});
