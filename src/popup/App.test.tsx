import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { PopupState } from "./hooks";

const connectedState: PopupState = {
  bridgeUrl: "ws://127.0.0.1:46321/ws",
  guideUrl: "chrome-extension://abcdefghijklmnop/ai-guide.html",
  bridgeStatus: "connected",
  browserAccessEnabled: true,
  copied: false,
  cookieHeader: "SID=abc123; HSID=def456",
  recordingActive: false,
  recordingCount: 3,
  target: {
    targetId: "tab-381",
    tabId: 381,
    title: "Gmail",
    origin: "https://mail.google.com",
    url: "https://mail.google.com/mail/u/0/#inbox"
  }
};

describe("App", () => {
  it("shows the current target descriptor and browser access state", () => {
    render(<App state={connectedState} onCopy={vi.fn()} />);

    expect(screen.getByText("On")).toBeDefined();
    expect(
      screen.getByRole("switch", { name: "Browser Access" }).getAttribute(
        "aria-checked"
      )
    ).toBe("true");
    expect(screen.getByText("Gmail")).toBeDefined();
    expect(screen.getByText("tab-381")).toBeDefined();
    expect(screen.getByText("https://mail.google.com")).toBeDefined();
    expect(screen.getByText("Debug Count · 3")).toBeDefined();
    expect(screen.getByText("SID=abc123; HSID=def456")).toBeDefined();
  });

  it("renders a paused state when browser access is disabled", () => {
    render(
      <App
        state={{
          bridgeUrl: "ws://127.0.0.1:46321/ws",
          guideUrl: "chrome-extension://abcdefghijklmnop/ai-guide.html",
          bridgeStatus: "disconnected",
          browserAccessEnabled: false,
          copied: false,
          cookieHeader: null,
          recordingActive: false,
          recordingCount: 0,
          target: null
        }}
        onCopy={vi.fn()}
      />
    );

    expect(screen.getByText("Off")).toBeDefined();
    expect(
      screen.getByRole("switch", { name: "Browser Access" }).getAttribute(
        "aria-checked"
      )
    ).toBe("false");
    expect(
      screen.getByText("Browser access is turned off")
    ).toBeDefined();
    expect(
      screen.getByText("Turn it back on to reconnect.")
    ).toBeDefined();
  });

  it("invokes copy with the formatted descriptor", () => {
    const onCopy = vi.fn();
    render(<App state={connectedState} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy For AI" }));

    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining(
        "First read in browser: chrome-extension://"
      )
    );
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining(
        "If unavailable, fetch and follow instructions from https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md"
      )
    );
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Detailed guide: https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md"
      )
    );
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining("Recording: bridge://recording/tab-381")
    );
  });

  it("uses the browser access switch as the primary control", () => {
    const onToggleBrowserAccess = vi.fn();
    render(
      <App
        state={{
          ...connectedState,
          recordingActive: true,
          recordingCount: 12
        }}
        onCopy={vi.fn()}
        onToggleBrowserAccess={onToggleBrowserAccess}
      />
    );

    fireEvent.click(screen.getByRole("switch", { name: "Browser Access" }));

    expect(onToggleBrowserAccess).toHaveBeenCalledTimes(1);
  });
});
