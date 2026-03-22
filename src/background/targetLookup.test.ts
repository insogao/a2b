import { describe, expect, it, vi } from "vitest";
import { resolveTargetById } from "./targetLookup";

const reutersTarget = {
  targetId: "tab-1316569957",
  tabId: 1316569957,
  title: "reuters.com",
  origin: "https://www.reuters.com",
  url: "https://www.reuters.com/world/"
};

describe("targetLookup", () => {
  it("returns an already-known target without refreshing", async () => {
    const targets = new Map([[reutersTarget.tabId, reutersTarget]]);
    const refreshTargets = vi.fn();

    const result = await resolveTargetById(
      reutersTarget.targetId,
      targets,
      refreshTargets
    );

    expect(result).toEqual(reutersTarget);
    expect(refreshTargets).not.toHaveBeenCalled();
  });

  it("refreshes targets once when the in-memory map is stale", async () => {
    const targets = new Map<number, typeof reutersTarget>();
    const refreshTargets = vi.fn(async () => [reutersTarget]);

    const result = await resolveTargetById(
      reutersTarget.targetId,
      targets,
      refreshTargets
    );

    expect(refreshTargets).toHaveBeenCalledTimes(1);
    expect(result).toEqual(reutersTarget);
  });

  it("returns null when the target is still missing after a refresh", async () => {
    const refreshTargets = vi.fn(async () => []);

    const result = await resolveTargetById(
      "tab-missing",
      new Map(),
      refreshTargets
    );

    expect(refreshTargets).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
