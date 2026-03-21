import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

type RuntimeRecording = {
  ok: boolean;
  active: boolean;
  entries: Array<{ kind: string }>;
};

test.describe("A2B extension e2e", () => {
  let server: http.Server;
  let baseUrl: string;
  let context: BrowserContext;
  let page: Page;

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

  test.afterAll(async () => {
    await context?.close();
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
      extensionPage.getByRole("button", { name: "Ready · 0" })
    ).toBeVisible();
    await extensionPage.getByRole("button", { name: "Ready · 0" }).click();
    await expect(
      extensionPage.getByRole("button", { name: "Recording · 0" })
    ).toBeVisible();

    await page.locator("#prompt").fill("hello from e2e");
    await page.locator("#send").click();
    await page.locator("#next").click();
    await expect(page.locator("h1")).toHaveText("Next Page");

    await expect
      .poll(async () => {
        return extensionPage.evaluate(async () => {
          const button = document.querySelector<HTMLButtonElement>(
            'button[aria-label^="Recording ·"]'
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
});
