import { type BridgeEnvelope } from "../shared/protocol";
import { createTargetDescriptor, toBridgeUrl } from "../shared/targets";
import { type BridgeStatus } from "./state";

type SocketEventHandler = (event?: unknown) => void;

export type WebSocketLike = {
  addEventListener(type: string, handler: SocketEventHandler): void;
  send(payload: string): void;
};

type BridgeClientOptions = {
  endpoint: string;
  socketFactory?: (url: string) => WebSocketLike;
  onStateChange?: (status: BridgeStatus) => void;
  onMessage?: (message: string) => void;
  onOpen?: () => void;
  healthCheck?: (url: string) => Promise<boolean>;
};

export class BridgeClient {
  readonly endpoint: string;
  readonly socketFactory: (url: string) => WebSocketLike;
  readonly onStateChange?: (status: BridgeStatus) => void;
  readonly onMessage?: (message: string) => void;
  readonly onOpen?: () => void;
  readonly healthCheck: (url: string) => Promise<boolean>;
  status: BridgeStatus = "disconnected";
  socket: WebSocketLike | null = null;

  constructor(options: BridgeClientOptions) {
    this.endpoint = normalizeBridgeEndpoint(options.endpoint);
    this.socketFactory =
      options.socketFactory ?? ((url) => new WebSocket(url) as WebSocketLike);
    this.onStateChange = options.onStateChange;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.healthCheck = options.healthCheck ?? probeBridgeHealth;
  }

  async start() {
    const healthy = await this.healthCheck(this.endpoint);
    if (!healthy) {
      this.setStatus("disconnected");
      return false;
    }
    this.connect();
    return true;
  }

  connect() {
    if (this.socket && this.status !== "disconnected") {
      return;
    }
    this.setStatus("connecting");
    this.socket = this.socketFactory(this.endpoint);
    this.socket.addEventListener("open", () => {
      this.setStatus("connected");
      this.onOpen?.();
    });
    this.socket.addEventListener("close", () => {
      this.socket = null;
      this.setStatus("disconnected");
    });
    this.socket.addEventListener("error", () => {
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

export async function probeBridgeHealth(wsUrl: string): Promise<boolean> {
  const url = new URL(wsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/healthz";

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store"
    });
    return response.ok;
  } catch {
    return false;
  }
}
