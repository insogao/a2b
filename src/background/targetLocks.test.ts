import { describe, expect, it, vi } from "vitest";
import { withTargetLock } from "./targetLocks";

describe("targetLocks", () => {
  it("runs commands for the same target serially", async () => {
    const events: string[] = [];
    let releaseFirst: (() => void) | null = null;

    const first = withTargetLock("tab-1", async () => {
      events.push("first:start");
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      events.push("first:end");
    });

    const second = withTargetLock("tab-1", async () => {
      events.push("second:start");
      events.push("second:end");
    });

    await vi.waitFor(() => {
      expect(events).toEqual(["first:start"]);
    });

    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end"
    ]);
  });

  it("allows different targets to run in parallel", async () => {
    const started: string[] = [];
    let releaseAlpha: (() => void) | null = null;
    let releaseBeta: (() => void) | null = null;

    const alpha = withTargetLock("tab-alpha", async () => {
      started.push("alpha");
      await new Promise<void>((resolve) => {
        releaseAlpha = resolve;
      });
    });

    const beta = withTargetLock("tab-beta", async () => {
      started.push("beta");
      await new Promise<void>((resolve) => {
        releaseBeta = resolve;
      });
    });

    await vi.waitFor(() => {
      expect(started.sort()).toEqual(["alpha", "beta"]);
    });

    releaseAlpha?.();
    releaseBeta?.();
    await Promise.all([alpha, beta]);
  });
});
