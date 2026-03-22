import { describe, expect, it, vi } from "vitest";
import {
  captureScreenshot,
  runEvalOperation,
  runScriptOperation,
  runSelectorOperation,
  waitForSelector
} from "./operations";

describe("background operations", () => {
  it("runs an eval expression in a target tab", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: 42 }]);

    const result = await runEvalOperation(
      { tabId: 7, expression: "40 + 2" },
      { executeScript }
    );

    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 7 },
        args: ["40 + 2"]
      })
    );
    expect(result).toEqual({
      ok: true,
      value: 42
    });
  });

  it("runs a selector-based click operation in a target tab", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: { ok: true } }]);

    const result = await runSelectorOperation(
      { tabId: 8, kind: "click", selector: "#send" },
      { executeScript }
    );

    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 8 },
        args: ["click", "#send", null]
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("waits for a selector in a target tab", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      { result: { ok: true, selector: "#composer" } }
    ]);

    const result = await waitForSelector(
      { tabId: 11, selector: "#composer", timeoutMs: 900 },
      { executeScript }
    );

    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 11 },
        args: ["#composer", 900]
      })
    );
    expect(result).toEqual({
      ok: true,
      selector: "#composer"
    });
  });

  it("captures a screenshot through the debugger for a target tab", async () => {
    const attachDebugger = vi.fn().mockResolvedValue(true);
    const sendDebuggerCommand = vi.fn().mockResolvedValue({
      data: "base64-image",
      format: "png"
    });
    const detachDebugger = vi.fn().mockResolvedValue(undefined);

    const result = await captureScreenshot(
      { tabId: 17 },
      { attachDebugger, sendDebuggerCommand, detachDebugger }
    );

    expect(attachDebugger).toHaveBeenCalledWith(17);
    expect(sendDebuggerCommand).toHaveBeenCalledWith(17, "Page.captureScreenshot", {
      format: "png"
    });
    expect(detachDebugger).toHaveBeenCalledWith(17);
    expect(result).toEqual({
      ok: true,
      data: "base64-image",
      format: "png"
    });
  });

  it("runs script source in a target tab", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      { result: { ok: true, value: "from script" } }
    ]);

    const result = await runScriptOperation(
      { tabId: 13, source: "return 'from script';" },
      { executeScript }
    );

    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 13 },
        args: ["return 'from script';"]
      })
    );
    expect(result).toEqual({
      ok: true,
      value: "from script"
    });
  });
});
