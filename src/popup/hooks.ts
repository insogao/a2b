import {
  formatTargetDescriptor,
  type BridgeTargetDescriptor
} from "../shared/targets";
import { createDefaultBridgeSettings, type BridgeStatus } from "../background/state";

export type PopupState = {
  bridgeUrl: string;
  bridgeStatus: BridgeStatus;
  copied: boolean;
  cookieHeader: string | null;
  recordingActive: boolean;
  recordingCount: number;
  target: BridgeTargetDescriptor | null;
};

const DOCS_URL =
  "https://github.com/insogao/a2b/blob/main/docs/AI_BRIDGE_PROTOCOL.md";

export function getDefaultPopupState(): PopupState {
  const settings = createDefaultBridgeSettings();

  return {
    bridgeUrl: `ws://${settings.endpoint}/ws`,
    bridgeStatus: "disconnected",
    copied: false,
    cookieHeader: null,
    recordingActive: false,
    recordingCount: 0,
    target: null
  };
}

export function buildCopyText(state: PopupState): string {
  if (!state.target) {
    return `Bridge: ${state.bridgeUrl}\nStatus: ${state.bridgeStatus}`;
  }

  return formatTargetDescriptor(state.target, state.bridgeUrl);
}

export function buildAiBundleText(state: PopupState): string {
  if (!state.target) {
    return `Docs: ${DOCS_URL}\nBridge: ${state.bridgeUrl}\nStatus: ${state.bridgeStatus}`;
  }

  return [
    `Docs: ${DOCS_URL}`,
    formatTargetDescriptor(state.target, state.bridgeUrl),
    `Recording: bridge://recording/${state.target.targetId}`,
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
