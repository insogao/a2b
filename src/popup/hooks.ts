import {
  formatTargetDescriptor,
  type BridgeTargetDescriptor
} from "../shared/targets";
import { createDefaultBridgeSettings, type BridgeStatus } from "../background/state";

export type PopupState = {
  bridgeUrl: string;
  guideUrl: string | null;
  bridgeStatus: BridgeStatus;
  browserAccessEnabled: boolean;
  copied: boolean;
  cookieHeader: string | null;
  recordingActive: boolean;
  recordingCount: number;
  target: BridgeTargetDescriptor | null;
};

const DOCS_URL =
  "https://github.com/insogao/a2b/blob/main/docs/AI_OPERATOR_GUIDE.md";
const INSTALL_URL =
  "https://raw.githubusercontent.com/insogao/a2b/main/.codex/INSTALL.md";

export function getDefaultPopupState(): PopupState {
  const settings = createDefaultBridgeSettings();

  return {
    bridgeUrl: `ws://${settings.endpoint}/ws`,
    guideUrl: null,
    bridgeStatus: "disconnected",
    browserAccessEnabled: settings.browserAccessEnabled,
    copied: false,
    cookieHeader: null,
    recordingActive: false,
    recordingCount: 0,
    target: null
  };
}

export function buildCopyText(state: PopupState): string {
  if (!state.browserAccessEnabled) {
    return "Browser Access: Off";
  }

  if (!state.target) {
    return `Browser Access: On\nBridge: ${state.bridgeUrl}`;
  }

  return formatTargetDescriptor(state.target, state.bridgeUrl);
}

export function buildAiBundleText(state: PopupState): string {
  const guideLines = state.guideUrl
    ? [
        `First read in browser: ${state.guideUrl}`,
        `If unavailable, fetch and follow instructions from ${INSTALL_URL}`,
        `Detailed guide: ${DOCS_URL}`
      ]
    : [
        `Fetch and follow instructions from ${INSTALL_URL}`,
        `Detailed guide: ${DOCS_URL}`
      ];

  if (!state.browserAccessEnabled) {
    return [
      ...guideLines,
      "Browser Access: Off"
    ].join("\n");
  }

  if (!state.target) {
    return [
      ...guideLines,
      "Browser Access: On",
      `Bridge: ${state.bridgeUrl}`
    ].join("\n");
  }

  return [
    ...guideLines,
    "Browser Access: On",
    formatTargetDescriptor(state.target, state.bridgeUrl),
    `Recording: bridge://recording/${state.target.targetId}`
  ].join("\n");
}

export function previewCookieHeader(cookieHeader: string | null): string {
  if (!cookieHeader) {
    return "No cookie snapshot yet";
  }
  return cookieHeader.length > 68
    ? `${cookieHeader.slice(0, 68).trimEnd()}...`
    : cookieHeader;
}
