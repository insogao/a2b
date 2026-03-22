import { describe, expect, it, vi } from "vitest";
import {
  BridgeClient,
  buildTargetRegistration,
  normalizeBridgeEndpoint
} from "./bridgeClient";

type EventHandler = () => void;

class FakeSocket {
  handlers: Record<string, EventHandler[]> = {};
  sent: string[] = [];
  closed = false;

  addEventListener(type: string, handler: EventHandler) {
    this.handlers[type] ??= [];
    this.handlers[type].push(handler);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.closed = true;
  }

  emit(type: string) {
    for (const handler of this.handlers[type] ?? []) {
      handler();
    }
  }
}

describe("bridgeClient", () => {
  it("normalizes bridge endpoints to websocket urls", () => {
    expect(normalizeBridgeEndpoint("127.0.0.1:46321")).toBe(
      "ws://127.0.0.1:46321/ws"
    );
    expect(normalizeBridgeEndpoint("ws://localhost:7777/socket")).toBe(
      "ws://localhost:7777/socket"
    );
  });

  it("tracks state transitions across websocket lifecycle", () => {
    const socket = new FakeSocket();
    const onStateChange = vi.fn();
    const client = new BridgeClient({
      endpoint: "127.0.0.1:46321",
      socketFactory: () => socket,
      onStateChange
    });

    expect(client.status).toBe("disconnected");

    client.connect();
    expect(client.status).toBe("connecting");

    socket.emit("open");
    expect(client.status).toBe("connected");

    socket.emit("close");
    expect(client.status).toBe("disconnected");
    expect(onStateChange).toHaveBeenCalledWith("connecting");
    expect(onStateChange).toHaveBeenCalledWith("connected");
    expect(onStateChange).toHaveBeenCalledWith("disconnected");
  });

  it("builds the registration payload for an active tab", () => {
    const message = buildTargetRegistration(
      {
        id: 12,
        title: "Google",
        url: "https://www.google.com/search?q=bridge"
      },
      "session-alpha"
    );

    expect(message).toEqual({
      type: "target.register",
      payload: {
        targetId: "tab-12",
        tabId: 12,
        title: "Google",
        origin: "https://www.google.com",
        url: "https://www.google.com/search?q=bridge"
      }
    });
  });

  it("does not open a websocket when the health check says the bridge is down", async () => {
    const socketFactory = vi.fn();
    const client = new BridgeClient({
      endpoint: "127.0.0.1:46321",
      socketFactory,
      healthCheck: vi.fn().mockResolvedValue(false)
    });

    await client.start();

    expect(socketFactory).not.toHaveBeenCalled();
    expect(client.status).toBe("disconnected");
  });

  it("opens a websocket after a successful health check", async () => {
    const socket = new FakeSocket();
    const socketFactory = vi.fn(() => socket);
    const client = new BridgeClient({
      endpoint: "127.0.0.1:46321",
      socketFactory,
      healthCheck: vi.fn().mockResolvedValue(true)
    });

    await client.start();

    expect(socketFactory).toHaveBeenCalledWith("ws://127.0.0.1:46321/ws");
    expect(client.status).toBe("connecting");
  });

  it("disconnects an existing websocket when requested", () => {
    const socket = new FakeSocket();
    const client = new BridgeClient({
      endpoint: "127.0.0.1:46321",
      socketFactory: () => socket
    });

    client.connect();
    client.disconnect();

    expect(socket.closed).toBe(true);
    expect(client.status).toBe("disconnected");
  });

  it("sends websocket keepalive pings while connected", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const client = new BridgeClient({
      endpoint: "127.0.0.1:46321",
      socketFactory: () => socket,
      healthCheck: vi.fn().mockResolvedValue(true)
    });

    await client.start();
    socket.emit("open");

    await vi.advanceTimersByTimeAsync(20_000);

    expect(socket.sent).toContain(JSON.stringify({ type: "ping", payload: {} }));

    client.disconnect();
    vi.useRealTimers();
  });

  it("drops a stale connected state when relay health no longer sees the extension", async () => {
    const socket = new FakeSocket();
    const client = new BridgeClient({
      endpoint: "127.0.0.1:46321",
      socketFactory: () => socket,
      healthCheck: vi
        .fn()
        .mockResolvedValueOnce({ reachable: true, extensionConnected: false })
        .mockResolvedValueOnce({ reachable: true, extensionConnected: false })
    });

    client.connect();
    socket.emit("open");

    expect(client.status).toBe("connected");

    await client.refreshStatus();

    expect(socket.closed).toBe(true);
    expect(client.status).toBe("disconnected");
  });
});
