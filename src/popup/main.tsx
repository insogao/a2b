import { StrictMode } from "react";
import { createElement, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { getDefaultPopupState, type PopupState } from "./hooks";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Popup root element not found");
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  console.info("Clipboard API unavailable", value);
}

async function requestPopupState(): Promise<PopupState> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "popup.getState"
    });

    return {
      ...getDefaultPopupState(),
      ...response
    } satisfies PopupState;
  } catch (error) {
    console.warn("Failed to load popup state", error);
    return getDefaultPopupState();
  }
}

async function sendRuntimeMessage<T>(type: string): Promise<T> {
  return chrome.runtime.sendMessage({ type }) as Promise<T>;
}

function PopupRoot() {
  const [state, setState] = useState<PopupState>(getDefaultPopupState());

  useEffect(() => {
    void requestPopupState().then(setState);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void requestPopupState().then(setState);
    }, state.browserAccessEnabled && state.recordingActive ? 800 : 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [state.recordingActive]);

  return createElement(App, {
    state,
    onCopy: (value: string) => {
      void copyToClipboard(value).then(() => {
        setState((current) => ({ ...current, copied: true }));
      });
    },
    onCopyCookies: () => {
      void sendRuntimeMessage<{ header: string }>("popup.copyCookies").then(
        (response) => {
          void copyToClipboard(response.header);
          void requestPopupState().then(setState);
        }
      );
    },
    onToggleBrowserAccess: () => {
      const action = state.browserAccessEnabled
        ? "popup.browserAccess.disable"
        : "popup.browserAccess.enable";
      void sendRuntimeMessage(action).then(() => {
        void requestPopupState().then(setState);
      });
    },
    onToggleRecording: () => {
      const action = state.recordingActive
        ? "popup.recording.stop"
        : "popup.recording.start";
      void sendRuntimeMessage(action).then(() => {
        void requestPopupState().then(setState);
      });
    }
  });
}

createRoot(rootElement).render(
  <StrictMode>
    <PopupRoot />
  </StrictMode>
);
