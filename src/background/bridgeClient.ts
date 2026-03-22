import { type BridgeEnvelope } from "../shared/protocol";
import { createTargetDescriptor, toBridgeUrl } from "../shared/targets";
import { type BridgeStatus } from "./state";

type SocketEventHandler = (event?: unknown) => void;

export type BridgeHealth = {
  reachable: boolean;
  extensionConnected: boolean;
};

export type WebSocketLike = {
  addEventListener(type: string, handler: SocketEventHandler): void;
  send(payload: string): void;
  close?: () => void;
};

type BridgeClientOptions = {
  endpoint: string;
  socketFactory?: (url: string) => WebSocketLike;
  onStateChange?: (status: BridgeStatus) => void;
  onMessage?: (message: string) => void;
  onOpen?: () => void;
  healthCheck?: (url: string) => Promise<BridgeHealth | boolean>;
  keepAliveMs?: number;
};

export class BridgeClient {
  readonly endpoint: string;
  readonly socketFactory: (url: string) => WebSocketLike;
  readonly onStateChange?: (status: BridgeStatus) => void;
  readonly onMessage?: (message: string) => void;
  readonly onOpen?: () => void;
  readonly healthCheck: (url: string) => Promise<BridgeHealth | boolean>;
  readonly keepAliveMs: number;
  status: BridgeStatus = "disconnected";
  socket: WebSocketLike | null = null;
  keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: BridgeClientOptions) {
    this.endpoint = normalizeBridgeEndpoint(options.endpoint);
    this.socketFactory =
      options.socketFactory ?? ((url) => new WebSocket(url) as WebSocketLike);
    this.onStateChange = options.onStateChange;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.healthCheck = options.healthCheck ?? probeBridgeHealth;
    this.keepAliveMs = options.keepAliveMs ?? 20_000;
  }

  async start() {
    const health = normalizeBridgeHealth(await this.healthCheck(this.endpoint));
    if (!health.reachable) {
      this.setStatus("disconnected");
      return false;
    }
    this.connect();
    return true;
  }

  async refreshStatus() {
    const health = normalizeBridgeHealth(await this.healthCheck(this.endpoint));

    if (!health.reachable) {
      this.disconnect();
      return health;
    }

    if (this.status === "connected" && !health.extensionConnected) {
      this.disconnect();
    }

    return health;
  }

  connect() {
    if (this.socket && this.status !== "disconnected") {
      return;
    }
    this.setStatus("connecting");
    this.socket = this.socketFactory(this.endpoint);
    this.socket.addEventListener("open", () => {
      this.setStatus("connected");
      this.startKeepAlive();
      this.onOpen?.();
    });
    this.socket.addEventListener("close", () => {
      this.stopKeepAlive();
      this.socket = null;
      this.setStatus("disconnected");
    });
    this.socket.addEventListener("error", () => {
      this.stopKeepAlive();
      this.socket = null;
      this.setStatus("disconnected");
    });
    this.socket.addEventListener("message", (event) => {
      const payload =
        typeof event === "object" &&
        event !== null &&
        "data" in event &&
        typeof event.data === "string"
          ? event.data
          : null;
      if (payload) {
        this.onMessage?.(payload);
      }
    });
  }

  send(message: BridgeEnvelope) {
    if (!this.socket || this.status !== "connected") {
      throw new Error("Bridge socket is not connected");
    }
    this.socket.send(JSON.stringify(message));
  }

  disconnect() {
    this.stopKeepAlive();
    this.socket?.close?.();
    this.socket = null;
    this.setStatus("disconnected");
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (!this.socket || this.status !== "connected") {
        return;
      }
      this.socket.send(JSON.stringify({ type: "ping", payload: {} }));
    }, this.keepAliveMs);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private setStatus(status: BridgeStatus) {
    this.status = status;
    this.onStateChange?.(status);
  }
}

export function normalizeBridgeEndpoint(input: string): string {
  return toBridgeUrl(input);
}

export function buildTargetRegistration(
  tab: Pick<chrome.tabs.Tab, "id" | "title" | "url">,
  sessionId: string
): BridgeEnvelope {
  return {
    type: "target.register",
    payload: createTargetDescriptor(tab, sessionId)
  };
}

export async function probeBridgeHealth(wsUrl: string): Promise<BridgeHealth> {
  const url = new URL(wsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/healthz";

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      return {
        reachable: false,
        extensionConnected: false
      };
    }

    const payload = (await response.json()) as {
      extensionConnected?: unknown;
    };

    return {
      reachable: true,
      extensionConnected: payload.extensionConnected === true
    };
  } catch {
    return {
      reachable: false,
      extensionConnected: false
    };
  }
}

function normalizeBridgeHealth(health: BridgeHealth | boolean): BridgeHealth {
  if (typeof health === "boolean") {
    return {
      reachable: health,
      extensionConnected: false
    };
  }

  return health;
}
