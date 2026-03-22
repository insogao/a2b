import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { resolveTargetSelector } from "./a2b-target-selector.mjs";

export function isSocketOpen(socket) {
  return Boolean(socket) && socket.readyState === socket.OPEN;
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function normalizeToken(value) {
  const token = typeof value === "string" ? value.trim() : "";
  return token || undefined;
}

function readBearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== "string") {
    return undefined;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

function isAuthorized(request, token) {
  if (!token) {
    return true;
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  return readBearerToken(request) === token || url.searchParams.get("token") === token;
}

export async function createRelayServer({
  host = "127.0.0.1",
  port = 46321,
  token,
  timeoutMs = 5000,
  autoIncrementPort = true
} = {}) {
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("A2B relay server must bind to loopback");
  }

  const authToken = normalizeToken(token);
  const state = {
    extensionSocket: null,
    extensionMeta: null,
    targets: new Map(),
    pending: new Map()
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${host}:${resolved.port || port}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      json(response, 200, {
        ok: true,
        extensionConnected: isSocketOpen(state.extensionSocket),
        targetCount: state.targets.size,
        sessionId: state.extensionMeta?.sessionId,
        extensionId: state.extensionMeta?.extensionId,
        guideUrl: state.extensionMeta?.guideUrl
      });
      return;
    }

    if (!isAuthorized(request, authToken)) {
      json(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      if (request.method === "GET" && url.pathname === "/tabs") {
        const targets = await listTargets();
        json(response, 200, { targets });
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/open") {
        const body = await readBody(request);
        const result = await sendCommand("tab.create", { url: body.url });
        const target =
          result.payload?.target ??
          (await waitForRegisteredTarget(body.url).catch(() => null));
        json(response, 200, {
          ...result.payload,
          target
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/focus") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("tab.activate", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/goto") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("tab.goto", { targetId, url: body.url });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/reload") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("tab.reload", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/back") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("tab.back", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/forward") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("tab.forward", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/tabs/close") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("tab.close", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/cookies") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("cookies.get", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/recording") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("recording.get", { targetId });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/eval") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("operation.eval", {
          targetId,
          expression: body.expression
        });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/click") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("operation.click", {
          targetId,
          selector: body.selector
        });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/type") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("operation.type", {
          targetId,
          selector: body.selector,
          text: body.text
        });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/press") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("operation.press", {
          targetId,
          selector: body.selector,
          key: body.key
        });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/wait-for") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("operation.waitFor", {
          targetId,
          selector: body.selector,
          timeoutMs: body.timeoutMs
        });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/screenshot") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("page.screenshot", {
          targetId
        });
        json(response, 200, result.payload);
        return;
      }

      if (request.method === "POST" && url.pathname === "/run-js") {
        const body = await readBody(request);
        const targetId = await resolveTargetId(body.target);
        const result = await sendCommand("script.run", {
          targetId,
          source: body.source
        });
        json(response, 200, result.payload);
        return;
      }

      json(response, 404, { error: "not_found" });
    } catch (error) {
      json(response, 500, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${host}:${resolved.port || port}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    if (!isAuthorized(request, authToken)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (socket) => {
    state.extensionSocket?.close();
    state.extensionSocket = socket;
    state.extensionMeta = null;

    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());

      if (message.type === "hello") {
        const payload = message.payload ?? {};
        state.extensionMeta = {
          sessionId:
            typeof payload.sessionId === "string" ? payload.sessionId : undefined,
          extensionId:
            typeof payload.extensionId === "string" ? payload.extensionId : undefined,
          guideUrl:
            typeof payload.guideUrl === "string" ? payload.guideUrl : undefined
        };
        return;
      }

      if (message.type === "target.register") {
        state.targets.set(message.payload.targetId, message.payload);
        return;
      }

      if (message.type === "target.unregister") {
        const targetId = message.payload?.targetId;
        if (typeof targetId === "string") {
          state.targets.delete(targetId);
          return;
        }
      }

      if (message.type === "ping") {
        return;
      }

      if (typeof message.requestId === "string" && state.pending.has(message.requestId)) {
        const pending = state.pending.get(message.requestId);
        clearTimeout(pending.timeoutId);
        state.pending.delete(message.requestId);
        if (message.type === "error") {
          pending.reject(new Error(message.payload?.message || "Bridge request failed"));
        } else {
          pending.resolve(message);
        }
      }
    });

    socket.on("close", () => {
      if (state.extensionSocket === socket) {
        state.extensionSocket = null;
        state.extensionMeta = null;
      }
    });
  });

  const resolved = await listenWithFallback(server, {
    host,
    port,
    autoIncrementPort
  });

  async function listTargets() {
    if (!state.extensionSocket) {
      return Array.from(state.targets.values());
    }

    if (state.targets.size > 0) {
      return Array.from(state.targets.values());
    }

    try {
      const result = await sendCommand("tab.list", {});
      const targets = Array.isArray(result.payload) ? result.payload : [];
      state.targets.clear();
      for (const target of targets) {
        state.targets.set(target.targetId, target);
      }
      return targets;
    } catch (error) {
      if (state.targets.size > 0) {
        return Array.from(state.targets.values());
      }
      throw error;
    }
  }

  async function resolveTargetId(input) {
    const targets = await listTargets();
    const resolution = resolveTargetSelector(input, targets);
    if (!resolution.ok) {
      throw new Error(
        resolution.reason === "ambiguous"
          ? `Ambiguous target: ${resolution.matches.join(", ")}`
          : "Target not found"
      );
    }
    return resolution.targetId;
  }

  function sendCommand(type, payload) {
    if (!isSocketOpen(state.extensionSocket)) {
      return Promise.reject(new Error("Extension is not connected"));
    }

    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        state.pending.delete(requestId);
        reject(new Error(`Timed out waiting for ${type}`));
      }, timeoutMs);

      state.pending.set(requestId, { resolve, reject, timeoutId });
      state.extensionSocket.send(JSON.stringify({ type, requestId, payload }));
    });
  }

  async function waitForRegisteredTarget(url) {
    const comparableUrl = normalizeComparableUrl(url);
    if (!comparableUrl) {
      return null;
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const match = Array.from(state.targets.values()).find((target) => {
        return normalizeComparableUrl(target.url) === comparableUrl;
      });

      if (match) {
        return match;
      }

      await delay(50);
    }

    return null;
  }

  async function close() {
    for (const pending of state.pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error("Relay server closed"));
    }
    state.pending.clear();

    for (const client of wss.clients) {
      client.close();
    }
    state.extensionSocket = null;

    await new Promise((resolve) => {
      wss.close(() => resolve());
    });

    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  return {
    port: resolved.port,
    baseUrl: `http://${host}:${resolved.port}`,
    wsUrl: `ws://${host}:${resolved.port}/ws${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`,
    close
  };
}

function normalizeComparableUrl(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listenWithFallback(server, { host, port, autoIncrementPort }) {
  let candidate = port;

  while (true) {
    try {
      const boundPort = await listenOnce(server, host, candidate);
      return {
        server,
        port: boundPort
      };
    } catch (error) {
      if (
        autoIncrementPort &&
        candidate > 0 &&
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EADDRINUSE"
      ) {
        candidate += 1;
        continue;
      }
      throw error;
    }
  }
}

function listenOnce(server, host, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onListening = () => {
      cleanup();
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : port);
    };

    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}
