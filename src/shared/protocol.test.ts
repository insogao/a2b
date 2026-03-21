import {
  isBridgeCommand,
  isBridgeEnvelope,
  type BridgeEnvelope
} from "./protocol";

describe("protocol", () => {
  it("accepts supported bridge envelopes", () => {
    const message: BridgeEnvelope = {
      type: "target.register",
      payload: {
        targetId: "session-alpha-tab-381",
        tabId: 381
      }
    };

    expect(isBridgeEnvelope(message)).toBe(true);
    expect(isBridgeCommand("cookies.get")).toBe(true);
    expect(isBridgeCommand("recording.start")).toBe(true);
  });

  it("rejects unsupported messages", () => {
    expect(isBridgeCommand("unknown.command")).toBe(false);
    expect(isBridgeEnvelope({ nope: true })).toBe(false);
  });
});
