import { describe, expect, it, vi } from "vitest";
import {
  closeTargetTab,
  goBackInTab,
  goForwardInTab,
  navigateTargetTab,
  reloadTargetTab
} from "./navigation";

describe("background navigation", () => {
  it("navigates a target tab to a new url", async () => {
    const updateTab = vi.fn().mockResolvedValue({
      id: 7,
      title: "Next Page",
      url: "http://example.test/next"
    });

    const result = await navigateTargetTab(
      {
        tabId: 7,
        url: "http://example.test/next"
      },
      { updateTab }
    );

    expect(updateTab).toHaveBeenCalledWith(7, { url: "http://example.test/next" });
    expect(result).toEqual({
      ok: true,
      tab: {
        id: 7,
        title: "Next Page",
        url: "http://example.test/next"
      }
    });
  });

  it("reloads a target tab", async () => {
    const reloadTab = vi.fn().mockResolvedValue(undefined);

    const result = await reloadTargetTab({ tabId: 7 }, { reloadTab });

    expect(reloadTab).toHaveBeenCalledWith(7);
    expect(result).toEqual({ ok: true });
  });

  it("goes back and forward in a target tab", async () => {
    const goBack = vi.fn().mockResolvedValue(undefined);
    const goForward = vi.fn().mockResolvedValue(undefined);

    const backResult = await goBackInTab({ tabId: 8 }, { goBack });
    const forwardResult = await goForwardInTab({ tabId: 8 }, { goForward });

    expect(goBack).toHaveBeenCalledWith(8);
    expect(goForward).toHaveBeenCalledWith(8);
    expect(backResult).toEqual({ ok: true });
    expect(forwardResult).toEqual({ ok: true });
  });

  it("closes a target tab", async () => {
    const removeTab = vi.fn().mockResolvedValue(undefined);

    const result = await closeTargetTab({ tabId: 9 }, { removeTab });

    expect(removeTab).toHaveBeenCalledWith(9);
    expect(result).toEqual({ ok: true });
  });
});
