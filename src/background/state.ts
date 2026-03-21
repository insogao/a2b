import type { BridgeTargetDescriptor } from "../shared/targets";
import type { RecordingStore } from "./recordings";
import type { RecordingEntry } from "../shared/recording";

export type BridgeStatus = "disconnected" | "connecting" | "connected";

export type BridgeSettings = {
  endpoint: string;
  sessionId: string;
};

export type ExtensionRuntimeState = {
  settings: BridgeSettings;
  bridgeStatus: BridgeStatus;
  targets: Map<number, BridgeTargetDescriptor>;
  lastTargetTabId: number | null;
  recordings: RecordingStore;
  diagnostics: {
    contentEventsSeen: number;
    lastEvent: RecordingEntry | null;
  };
};

export function createDefaultBridgeSettings(): BridgeSettings {
  return {
    endpoint: "127.0.0.1:46321",
    sessionId: "session-local"
  };
}
