import {
  isBridgeCommand,
  isBridgeEnvelope,
  type BridgeEnvelope
} from "./protocol";

describe("protocol", () => {
  it("accepts supported bridge envelopes", () => {
    const message: BridgeEnvelope = {
      type: "target.register",
      requestId: "req-1",
      payload: {
        targetId: "session-alpha-tab-381",
        tabId: 381
      }
    };

    expect(isBridgeEnvelope(message)).toBe(true);
    expect(isBridgeCommand("ping")).toBe(true);
    expect(isBridgeCommand("cookies.get")).toBe(true);
    expect(isBridgeCommand("recording.start")).toBe(true);
    expect(isBridgeCommand("tab.list")).toBe(true);
    expect(isBridgeCommand("tab.create")).toBe(true);
    expect(isBridgeCommand("tab.activate")).toBe(true);
    expect(isBridgeCommand("operation.eval")).toBe(true);
    expect(isBridgeCommand("operation.click")).toBe(true);
    expect(isBridgeCommand("operation.type")).toBe(true);
    expect(isBridgeCommand("operation.press")).toBe(true);
    expect(isBridgeCommand("operation.waitFor")).toBe(true);
    expect(isBridgeCommand("operation.result")).toBe(true);
    expect(isBridgeCommand("page.screenshot")).toBe(true);
    expect(isBridgeCommand("page.screenshot.result")).toBe(true);
    expect(isBridgeCommand("tab.goto")).toBe(true);
    expect(isBridgeCommand("tab.goto.result")).toBe(true);
    expect(isBridgeCommand("tab.reload")).toBe(true);
    expect(isBridgeCommand("tab.reload.result")).toBe(true);
    expect(isBridgeCommand("tab.back")).toBe(true);
    expect(isBridgeCommand("tab.back.result")).toBe(true);
    expect(isBridgeCommand("tab.forward")).toBe(true);
    expect(isBridgeCommand("tab.forward.result")).toBe(true);
    expect(isBridgeCommand("tab.close")).toBe(true);
    expect(isBridgeCommand("tab.close.result")).toBe(true);
    expect(isBridgeCommand("script.run")).toBe(true);
    expect(isBridgeCommand("script.run.result")).toBe(true);
  });

  it("rejects unsupported messages", () => {
    expect(isBridgeCommand("unknown.command")).toBe(false);
    expect(isBridgeEnvelope({ nope: true })).toBe(false);
  });
});
