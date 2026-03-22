import type { BridgeStatus } from "./state";

type BridgeRecoveryOptions = {
  attemptReconnect: () => void | Promise<void>;
  retryDelayMs?: number;
};

export function createBridgeRecoveryScheduler(options: BridgeRecoveryOptions) {
  const retryDelayMs = options.retryDelayMs ?? 3000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function clearRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  return {
    onStatusChange(status: BridgeStatus) {
      if (status === "connected") {
        clearRetry();
        return;
      }

      if (status !== "disconnected" || retryTimer) {
        return;
      }

      retryTimer = setTimeout(() => {
        retryTimer = null;
        void options.attemptReconnect();
      }, retryDelayMs);
    },
    dispose() {
      clearRetry();
    }
  };
}
