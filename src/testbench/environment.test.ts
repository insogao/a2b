import { describe, expect, it, vi } from "vitest";
import { createBatchEnvironmentPreflight } from "../../testbench/lib/environment.mjs";

describe("testbench environment preflight", () => {
  it("does nothing when relay and extension are already connected", async () => {
    const readStatus = vi.fn().mockResolvedValue({
      ok: true,
      extensionConnected: true
    });
    const isChromeRunning = vi.fn().mockResolvedValue(true);
    const startRelay = vi.fn();
    const launchChrome = vi.fn();
    const wait = vi.fn();

    const preflight = createBatchEnvironmentPreflight({
      readStatus,
      isChromeRunning,
      startRelay,
      launchChrome,
      wait
    });

    const result = await preflight();

    expect(result).toEqual({
      connected: true,
      relayStarted: false,
      chromeLaunched: false,
      attempts: 1
    });
    expect(startRelay).not.toHaveBeenCalled();
    expect(launchChrome).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });

  it("starts one shared relay and one shared Chrome instance when needed", async () => {
    const readStatus = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ok: true,
        extensionConnected: false
      })
      .mockResolvedValueOnce({
        ok: true,
        extensionConnected: true
      });
    const isChromeRunning = vi.fn().mockResolvedValue(false);
    const startRelay = vi.fn().mockResolvedValue(undefined);
    const launchChrome = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    const preflight = createBatchEnvironmentPreflight({
      readStatus,
      isChromeRunning,
      startRelay,
      launchChrome,
      wait,
      maxAttempts: 3,
      retryDelayMs: 1_000
    });

    const result = await preflight();

    expect(result).toEqual({
      connected: true,
      relayStarted: true,
      chromeLaunched: true,
      attempts: 3
    });
    expect(startRelay).toHaveBeenCalledTimes(1);
    expect(launchChrome).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
