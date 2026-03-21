import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { PopupState } from "./hooks";

const connectedState: PopupState = {
  bridgeUrl: "ws://127.0.0.1:46321/ws",
  bridgeStatus: "connected",
  copied: false,
  cookieHeader: "SID=abc123; HSID=def456",
  recordingActive: false,
  recordingCount: 3,
  target: {
    targetId: "session-alpha-tab-381",
    tabId: 381,
    title: "Gmail",
    origin: "https://mail.google.com",
    url: "https://mail.google.com/mail/u/0/#inbox"
  }
};

describe("App", () => {
  it("shows the current target descriptor and connection status", () => {
    render(<App state={connectedState} onCopy={vi.fn()} />);

    expect(screen.getByText("Connected")).toBeDefined();
    expect(screen.getByText("Gmail")).toBeDefined();
    expect(screen.getByText("session-alpha-tab-381")).toBeDefined();
    expect(screen.getByText("https://mail.google.com")).toBeDefined();
    expect(screen.getByText("Ready · 3")).toBeDefined();
    expect(screen.getByText("SID=abc123; HSID=def456")).toBeDefined();
  });

  it("renders a disconnected state when no bridge is active", () => {
    render(
      <App
        state={{
          bridgeUrl: "ws://127.0.0.1:46321/ws",
          bridgeStatus: "disconnected",
          copied: false,
          cookieHeader: null,
          recordingActive: false,
          recordingCount: 0,
          target: null
        }}
        onCopy={vi.fn()}
      />
    );

    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText("Waiting for target...")).toBeDefined();
    expect(
      screen.getByText(
        "Open a normal web page to register a target. Data snapshot will appear here."
      )
    ).toBeDefined();
  });

  it("invokes copy with the formatted descriptor", () => {
    const onCopy = vi.fn();
    render(<App state={connectedState} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy For AI" }));

    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Docs: https://github.com/insogao/a2b/blob/main/docs/AI_BRIDGE_PROTOCOL.md"
      )
    );
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining("Recording: bridge://recording/session-alpha-tab-381")
    );
  });

  it("uses the recording pill as the toggle control", () => {
    const onToggleRecording = vi.fn();
    render(
      <App
        state={{
          ...connectedState,
          recordingActive: true,
          recordingCount: 12
        }}
        onCopy={vi.fn()}
        onToggleRecording={onToggleRecording}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Recording · 12" }));

    expect(onToggleRecording).toHaveBeenCalledTimes(1);
  });
});
