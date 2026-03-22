import { describe, expect, it, vi } from "vitest";
import { createRuntimeStartupHandler } from "./startup";

describe("background startup handler", () => {
  it("reconnects and syncs when browser access is enabled", async () => {
    const ensureBridgeConnection = vi.fn().mockResolvedValue(undefined);
    const syncCurrentWindowTargets = vi.fn().mockResolvedValue(undefined);
    const handler = createRuntimeStartupHandler({
      isBrowserAccessEnabled: () => true,
      ensureBridgeConnection,
      syncCurrentWindowTargets
    });

    await handler();

    expect(ensureBridgeConnection).toHaveBeenCalledTimes(1);
    expect(syncCurrentWindowTargets).toHaveBeenCalledTimes(1);
  });

  it("does nothing when browser access is disabled", async () => {
    const ensureBridgeConnection = vi.fn();
    const syncCurrentWindowTargets = vi.fn();
    const handler = createRuntimeStartupHandler({
      isBrowserAccessEnabled: () => false,
      ensureBridgeConnection,
      syncCurrentWindowTargets
    });

    await handler();

    expect(ensureBridgeConnection).not.toHaveBeenCalled();
    expect(syncCurrentWindowTargets).not.toHaveBeenCalled();
  });
});
