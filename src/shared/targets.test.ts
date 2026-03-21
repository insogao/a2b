import {
  createTargetDescriptor,
  formatTargetDescriptor,
  toBridgeUrl
} from "./targets";

describe("targets", () => {
  it("creates a deterministic descriptor from tab metadata", () => {
    const descriptor = createTargetDescriptor(
      {
        id: 381,
        title: "Gmail",
        url: "https://mail.google.com/mail/u/0/#inbox"
      },
      "session-alpha"
    );

    expect(descriptor).toEqual({
      targetId: "session-alpha-tab-381",
      tabId: 381,
      title: "Gmail",
      origin: "https://mail.google.com",
      url: "https://mail.google.com/mail/u/0/#inbox"
    });
  });

  it("formats a copyable target descriptor for AI tools", () => {
    const text = formatTargetDescriptor(
      {
        targetId: "session-alpha-tab-381",
        tabId: 381,
        title: "Gmail",
        origin: "https://mail.google.com",
        url: "https://mail.google.com/mail/u/0/#inbox"
      },
      "ws://127.0.0.1:46321/ws"
    );

    expect(text).toContain("Bridge: ws://127.0.0.1:46321/ws");
    expect(text).toContain("Target: session-alpha-tab-381");
    expect(text).toContain("Origin: https://mail.google.com");
    expect(text).toContain("Title: Gmail");
  });

  it("normalizes bridge urls from host and port input", () => {
    expect(toBridgeUrl("127.0.0.1:46321")).toBe("ws://127.0.0.1:46321/ws");
    expect(toBridgeUrl("ws://localhost:9000/socket")).toBe(
      "ws://localhost:9000/socket"
    );
  });
});
