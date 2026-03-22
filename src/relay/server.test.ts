import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import {
  createRelayServer,
  isSocketOpen
} from "../../bin/lib/a2b-relay-server.mjs";

type JsonRecord = Record<string, unknown>;

const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanup.length > 0) {
    await cleanup.pop()?.();
  }
});

function waitForOpen(socket: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<JsonRecord>;
}

describe("a2b relay server", () => {
  it("treats only OPEN websocket connections as healthy", () => {
    expect(isSocketOpen(null)).toBe(false);
    expect(isSocketOpen({ readyState: 1, OPEN: 1 })).toBe(true);
    expect(isSocketOpen({ readyState: 2, OPEN: 1 })).toBe(false);
  });

  it("returns registered tabs from the connected extension", async () => {
    const relay = await createRelayServer({ port: 0 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );

    await waitForOpen(extension);
    extension.send(
      JSON.stringify({
        type: "target.register",
        payload: {
          targetId: "tab-381",
          tabId: 381,
          title: "Gmail",
          origin: "https://mail.google.com",
          url: "https://mail.google.com/mail/u/0/#inbox"
        }
      })
    );

    const response = await fetch(`${relay.baseUrl}/tabs`);
    const json = await readJson(response);

    expect(response.ok).toBe(true);
    expect(json.targets).toEqual([
      {
        targetId: "tab-381",
        tabId: 381,
        title: "Gmail",
        origin: "https://mail.google.com",
        url: "https://mail.google.com/mail/u/0/#inbox"
      }
    ]);
  });

  it("exposes extension metadata from the hello handshake in healthz", async () => {
    const relay = await createRelayServer({ port: 0 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );

    await waitForOpen(extension);
    extension.send(
      JSON.stringify({
        type: "hello",
        payload: {
          sessionId: "session-alpha",
          extensionId: "abcdefghijklmnop",
          guideUrl: "chrome-extension://abcdefghijklmnop/ai-guide.html"
        }
      })
    );

    const response = await fetch(`${relay.baseUrl}/healthz`);
    const json = await readJson(response);

    expect(response.ok).toBe(true);
    expect(json.extensionConnected).toBe(true);
    expect(json.sessionId).toBe("session-alpha");
    expect(json.extensionId).toBe("abcdefghijklmnop");
    expect(json.guideUrl).toBe(
      "chrome-extension://abcdefghijklmnop/ai-guide.html"
    );
  });

  it("forwards open requests to the extension", async () => {
    const relay = await createRelayServer({ port: 0 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );
    await waitForOpen(extension);

    extension.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as JsonRecord;
      if (message.type === "tab.create") {
        extension.send(
          JSON.stringify({
            type: "tab.create.result",
            requestId: message.requestId,
            payload: {
              target: {
                targetId: "tab-412",
                tabId: 412,
                title: "Gemini",
                origin: "https://gemini.google.com",
                url: "https://gemini.google.com/app/new"
              }
            }
          })
        );
      }
    });

    const response = await fetch(`${relay.baseUrl}/tabs/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://gemini.google.com/app/new" })
    });
    const json = await readJson(response);

    expect(response.ok).toBe(true);
    expect(json.target).toEqual({
      targetId: "tab-412",
      tabId: 412,
      title: "Gemini",
      origin: "https://gemini.google.com",
      url: "https://gemini.google.com/app/new"
    });
  });

  it("waits for a registered target when tab.create returns null initially", async () => {
    const relay = await createRelayServer({ port: 0, timeoutMs: 1000 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );
    await waitForOpen(extension);

    extension.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as JsonRecord;
      if (message.type === "tab.create") {
        extension.send(
          JSON.stringify({
            type: "tab.create.result",
            requestId: message.requestId,
            payload: {
              target: null
            }
          })
        );

        setTimeout(() => {
          extension.send(
            JSON.stringify({
              type: "target.register",
              payload: {
                targetId: "tab-777",
                tabId: 777,
                title: "Baidu",
                origin: "https://www.baidu.com",
                url: "https://www.baidu.com/"
              }
            })
          );
        }, 50);
      }
    });

    const response = await fetch(`${relay.baseUrl}/tabs/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://www.baidu.com/" })
    });
    const json = await readJson(response);

    expect(response.ok).toBe(true);
    expect(json.target).toEqual({
      targetId: "tab-777",
      tabId: 777,
      title: "Baidu",
      origin: "https://www.baidu.com",
      url: "https://www.baidu.com/"
    });
  });

  it("increments the preferred port when that port is already in use", async () => {
    const first = await createRelayServer({ port: 0 });
    cleanup.push(() => first.close());

    const second = await createRelayServer({ port: first.port });
    cleanup.push(() => second.close());

    expect(second.port).toBeGreaterThan(first.port);
    expect(second.baseUrl).toBe(`http://127.0.0.1:${second.port}`);
  });

  it("resolves target prefixes before focus and cookies commands", async () => {
    const relay = await createRelayServer({ port: 0 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );
    await waitForOpen(extension);

    extension.send(
      JSON.stringify({
        type: "target.register",
        payload: {
          targetId: "tab-381",
          tabId: 381,
          title: "Gmail",
          origin: "https://mail.google.com",
          url: "https://mail.google.com/mail/u/0/#inbox"
        }
      })
    );

    extension.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as JsonRecord;
      if (message.type === "tab.activate") {
        extension.send(
          JSON.stringify({
            type: "tab.activate.result",
            requestId: message.requestId,
            payload: {
              target: {
                targetId: "tab-381",
                tabId: 381,
                title: "Gmail",
                origin: "https://mail.google.com",
                url: "https://mail.google.com/mail/u/0/#inbox"
              }
            }
          })
        );
      }

      if (message.type === "cookies.get") {
        extension.send(
          JSON.stringify({
            type: "cookies.result",
            requestId: message.requestId,
            payload: {
              targetId: "tab-381",
              cookies: [{ name: "SID", value: "abc" }],
              header: "SID=abc"
            }
          })
        );
      }
    });

    const focusResponse = await fetch(`${relay.baseUrl}/tabs/focus`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "tab-3" })
    });
    const focusJson = await readJson(focusResponse);

    expect(focusResponse.ok).toBe(true);
    expect(focusJson.target).toEqual({
      targetId: "tab-381",
      tabId: 381,
      title: "Gmail",
      origin: "https://mail.google.com",
      url: "https://mail.google.com/mail/u/0/#inbox"
    });

    const cookiesResponse = await fetch(`${relay.baseUrl}/cookies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "tab-3" })
    });
    const cookiesJson = await readJson(cookiesResponse);

    expect(cookiesResponse.ok).toBe(true);
    expect(cookiesJson.header).toBe("SID=abc");
  });

  it("forwards page operations and screenshots to the extension", async () => {
    const relay = await createRelayServer({ port: 0 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );
    await waitForOpen(extension);

    extension.send(
      JSON.stringify({
        type: "target.register",
        payload: {
          targetId: "tab-412",
          tabId: 412,
          title: "Gemini",
          origin: "https://gemini.google.com",
          url: "https://gemini.google.com/app/abc"
        }
      })
    );

    extension.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as JsonRecord;

      if (message.type === "operation.click") {
        extension.send(
          JSON.stringify({
            type: "operation.result",
            requestId: message.requestId,
            payload: {
              ok: true,
              selector: "#send"
            }
          })
        );
      }

      if (message.type === "page.screenshot") {
        extension.send(
          JSON.stringify({
            type: "page.screenshot.result",
            requestId: message.requestId,
            payload: {
              ok: true,
              format: "png",
              data: "base64-image"
            }
          })
        );
      }
    });

    const clickResponse = await fetch(`${relay.baseUrl}/click`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "tab-41", selector: "#send" })
    });
    const clickJson = await readJson(clickResponse);

    expect(clickResponse.ok).toBe(true);
    expect(clickJson).toEqual({
      ok: true,
      selector: "#send"
    });

    const screenshotResponse = await fetch(`${relay.baseUrl}/screenshot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "tab-41" })
    });
    const screenshotJson = await readJson(screenshotResponse);

    expect(screenshotResponse.ok).toBe(true);
    expect(screenshotJson).toEqual({
      ok: true,
      format: "png",
      data: "base64-image"
    });
  });

  it("forwards navigation and script execution commands to the extension", async () => {
    const relay = await createRelayServer({ port: 0 });
    cleanup.push(() => relay.close());

    const extension = new WebSocket(relay.wsUrl);
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          extension.close();
          extension.once("close", () => resolve());
        })
    );
    await waitForOpen(extension);

    extension.send(
      JSON.stringify({
        type: "target.register",
        payload: {
          targetId: "tab-500",
          tabId: 500,
          title: "Home",
          origin: "http://example.test",
          url: "http://example.test/"
        }
      })
    );

    extension.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as JsonRecord;

      if (message.type === "tab.goto") {
        extension.send(
          JSON.stringify({
            type: "tab.goto.result",
            requestId: message.requestId,
            payload: {
              ok: true,
              target: {
                targetId: "tab-500",
                tabId: 500,
                title: "Next",
                origin: "http://example.test",
                url: "http://example.test/next"
              }
            }
          })
        );
      }

      if (message.type === "script.run") {
        extension.send(
          JSON.stringify({
            type: "script.run.result",
            requestId: message.requestId,
            payload: {
              ok: true,
              value: "hello"
            }
          })
        );
      }
    });

    const gotoResponse = await fetch(`${relay.baseUrl}/tabs/goto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: "tab-5",
        url: "http://example.test/next"
      })
    });
    const gotoJson = await readJson(gotoResponse);

    expect(gotoResponse.ok).toBe(true);
    expect(gotoJson.ok).toBe(true);

    const runJsResponse = await fetch(`${relay.baseUrl}/run-js`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: "tab-5",
        source: "return 'hello';"
      })
    });
    const runJsJson = await readJson(runJsResponse);

    expect(runJsResponse.ok).toBe(true);
    expect(runJsJson).toEqual({
      ok: true,
      value: "hello"
    });
  });
});
