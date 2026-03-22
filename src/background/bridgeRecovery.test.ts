import { describe, expect, it, vi } from "vitest";
import { createBridgeRecoveryScheduler } from "./bridgeRecovery";

describe("bridgeRecovery", () => {
  it("schedules one immediate retry when the bridge disconnects", () => {
    vi.useFakeTimers();
    const attemptReconnect = vi.fn();
    const scheduler = createBridgeRecoveryScheduler({
      attemptReconnect,
      retryDelayMs: 3000
    });

    scheduler.onStatusChange("disconnected");

    expect(attemptReconnect).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(attemptReconnect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does not stack duplicate retries while one is already pending", () => {
    vi.useFakeTimers();
    const attemptReconnect = vi.fn();
    const scheduler = createBridgeRecoveryScheduler({
      attemptReconnect,
      retryDelayMs: 3000
    });

    scheduler.onStatusChange("disconnected");
    scheduler.onStatusChange("disconnected");

    vi.advanceTimersByTime(3000);

    expect(attemptReconnect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cancels the pending retry once the bridge reconnects", () => {
    vi.useFakeTimers();
    const attemptReconnect = vi.fn();
    const scheduler = createBridgeRecoveryScheduler({
      attemptReconnect,
      retryDelayMs: 3000
    });

    scheduler.onStatusChange("disconnected");
    scheduler.onStatusChange("connected");

    vi.advanceTimersByTime(3000);

    expect(attemptReconnect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
