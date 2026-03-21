import { choosePopupTarget } from "./activeTarget";
import { BridgeClient } from "./bridgeClient";
import {
  filterCookiesForUrl,
  toCookiesResponse
} from "./cookies";
import { RecordingStore } from "./recordings";
import {
  createDefaultBridgeSettings,
  type BridgeSettings,
  type ExtensionRuntimeState
} from "./state";
import { isBridgeEnvelope } from "../shared/protocol";
import { createTargetDescriptor, toBridgeUrl } from "../shared/targets";
import type { PopupState } from "../popup/hooks";
import type { RecordingEntry } from "../shared/recording";

const STORAGE_KEY = "bridgeSettings";
const BRIDGE_POLL_ALARM = "bridge-health-poll";
const RECORDINGS_SESSION_KEY = "recordingsState";

const runtimeState: ExtensionRuntimeState = {
  settings: createDefaultBridgeSettings(),
  bridgeStatus: "disconnected",
  targets: new Map(),
  lastTargetTabId: null,
  recordings: new RecordingStore(),
  diagnostics: {
    contentEventsSeen: 0,
    lastEvent: null
  }
};

const bridgeClient = new BridgeClient({
  endpoint: runtimeState.settings.endpoint,
  onStateChange: (status) => {
    runtimeState.bridgeStatus = status;
  },
  onOpen: () => {
    void registerActiveTab();
  },
  onMessage: (payload) => {
    void handleBridgeMessage(payload);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettings();
  chrome.alarms.create(BRIDGE_POLL_ALARM, {
    periodInMinutes: 1
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void handleRuntimeMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      console.error("Runtime message failed", error);
      sendResponse({
        error: error instanceof Error ? error.message : "Unknown runtime error"
      });
    });
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BRIDGE_POLL_ALARM) {
    void ensureBridgeConnection();
  }
});

chrome.tabs.onActivated.addListener(() => {
  void registerActiveTab();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    void registerTab(tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const target = runtimeState.targets.get(tabId);
  if (!target) {
    return;
  }
  runtimeState.targets.delete(tabId);
  if (runtimeState.lastTargetTabId === tabId) {
    runtimeState.lastTargetTabId =
      runtimeState.targets.values().next().value?.tabId ?? null;
  }
  if (bridgeClient.status === "connected") {
    bridgeClient.send({
      type: "target.unregister",
      payload: {
        targetId: target.targetId,
        tabId
      }
    });
  }
});

void bootstrap();

async function bootstrap() {
  runtimeState.settings = await ensureSettings();
  runtimeState.recordings = await loadRecordingStore();
  chrome.alarms.create(BRIDGE_POLL_ALARM, {
    periodInMinutes: 1
  });
  await ensureBridgeConnection();
  await registerActiveTab();
}

async function handleRuntimeMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender
) {
  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.getState"
  ) {
    await ensureBridgeConnection();
    return getPopupState();
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.copyCookies"
  ) {
    return getCookiesForActiveTarget();
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.recording.start"
  ) {
    const target = await getActiveTarget();
    if (!target) {
      return { ok: false };
    }
    runtimeState.recordings.start(target.targetId);
    await persistRecordingStore();
    return { ok: true };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.recording.stop"
  ) {
    const target = await getActiveTarget();
    if (!target) {
      return { ok: false };
    }
    runtimeState.recordings.stop(target.targetId);
    await persistRecordingStore();
    return { ok: true };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "content.recordEvent"
  ) {
    const tab = sender.tab;
    if (!tab) {
      return { ok: false };
    }
    const target = await registerTab(tab);
    if (!target) {
      return { ok: false };
    }
    runtimeState.diagnostics.contentEventsSeen += 1;
    runtimeState.diagnostics.lastEvent = message.payload as RecordingEntry;
    runtimeState.recordings.add(target.targetId, message.payload as RecordingEntry);
    await persistRecordingStore();
    return { ok: true };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "e2e.listTargets"
  ) {
    return Array.from(runtimeState.targets.values());
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "e2e.recording.start"
  ) {
    const targetId = "targetId" in message && typeof message.targetId === "string"
      ? message.targetId
      : null;
    if (!targetId) {
      return { ok: false };
    }
    runtimeState.recordings.start(targetId);
    await persistRecordingStore();
    return { ok: true, targetId };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "e2e.recording.get"
  ) {
    const targetId = "targetId" in message && typeof message.targetId === "string"
      ? message.targetId
      : null;
    if (!targetId) {
      return { ok: false };
    }
    return {
      ok: true,
      active: runtimeState.recordings.isActive(targetId),
      entries: runtimeState.recordings.get(targetId)
    };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "e2e.debugState"
  ) {
    return {
      targets: Array.from(runtimeState.targets.values()),
      recordingSnapshot: runtimeState.recordings.snapshot(),
      diagnostics: runtimeState.diagnostics
    };
  }

  return { ok: false };
}

async function handleBridgeMessage(rawPayload: string) {
  let message: unknown;
  try {
    message = JSON.parse(rawPayload);
  } catch (error) {
    bridgeClient.send({
      type: "error",
      payload: {
        message: error instanceof Error ? error.message : "Invalid JSON"
      }
    });
    return;
  }

  if (!isBridgeEnvelope(message)) {
    bridgeClient.send({
      type: "error",
      payload: {
        message: "Unsupported bridge message"
      }
    });
    return;
  }

  switch (message.type) {
    case "hello":
      bridgeClient.send({
        type: "helloAck",
        payload: {
          sessionId: runtimeState.settings.sessionId
        }
      });
      break;
    case "target.list":
      bridgeClient.send({
        type: "target.list.result",
        payload: Array.from(runtimeState.targets.values())
      });
      break;
    case "cookies.get": {
      const targetId = readTargetId(message.payload);
      if (!targetId) {
        return;
      }
      const target = findTargetById(targetId);
      if (!target) {
        return;
      }
      const response = await getCookiesForTarget(target.targetId, target.url);
      bridgeClient.send({
        type: "cookies.result",
        payload: response
      });
      break;
    }
    case "recording.start":
    case "recording.stop":
    case "recording.get":
    case "recording.clear": {
      const targetId = readTargetId(message.payload);
      if (!targetId) {
        return;
      }
      if (message.type === "recording.start") {
        runtimeState.recordings.start(targetId);
      } else if (message.type === "recording.stop") {
        runtimeState.recordings.stop(targetId);
      } else if (message.type === "recording.clear") {
        runtimeState.recordings.clear(targetId);
      }
      await persistRecordingStore();
      bridgeClient.send({
        type: "recording.result",
        payload: {
          targetId,
          entries: runtimeState.recordings.get(targetId),
          active: runtimeState.recordings.isActive(targetId)
        }
      });
      break;
    }
    case "debugger.attach":
    case "debugger.detach": {
      const targetId = readTargetId(message.payload);
      if (!targetId) {
        return;
      }
      const target = findTargetById(targetId);
      if (!target) {
        return;
      }
      if (message.type === "debugger.attach") {
        await attachDebugger(target.tabId);
      } else {
        await detachDebugger(target.tabId);
      }
      bridgeClient.send({
        type: "debugger.result",
        payload: {
          targetId,
          attached: message.type === "debugger.attach"
        }
      });
      break;
    }
  }
}

async function getPopupState(): Promise<PopupState> {
  const target = await getActiveTarget();
  const cookieResult = target
    ? await getCookiesForTarget(target.targetId, target.url).catch(() => null)
    : null;

  return {
    bridgeUrl: toBridgeUrl(runtimeState.settings.endpoint),
    bridgeStatus: runtimeState.bridgeStatus,
    copied: false,
    cookieHeader: cookieResult?.header ?? null,
    recordingActive: target
      ? runtimeState.recordings.isActive(target.targetId)
      : false,
    recordingCount: target ? runtimeState.recordings.get(target.targetId).length : 0,
    target
  };
}

async function getCookiesForActiveTarget() {
  const target = await getActiveTarget();
  if (!target) {
    return { cookies: [], header: "" };
  }
  return getCookiesForTarget(target.targetId, target.url);
}

async function getCookiesForTarget(targetId: string, url: string) {
  const cookies = await getAllCookies(url);
  const filtered = filterCookiesForUrl(cookies, url);
  return toCookiesResponse(targetId, filtered);
}

async function registerActiveTab() {
  await ensureBridgeConnection();
  const tab = await getActiveTab();
  if (!tab) {
    return null;
  }
  return registerTab(tab);
}

async function registerTab(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) {
    return null;
  }

  const descriptor = createTargetDescriptor(tab, runtimeState.settings.sessionId);
  runtimeState.targets.set(tab.id, descriptor);
  runtimeState.lastTargetTabId = tab.id;
  if (bridgeClient.status === "connected") {
    bridgeClient.send({
      type: "target.register",
      payload: descriptor
    });
  }
  return descriptor;
}

async function ensureBridgeConnection() {
  if (bridgeClient.status === "connected" || bridgeClient.status === "connecting") {
    return;
  }
  await bridgeClient.start();
}

async function getActiveTarget() {
  const activeTab = await getActiveTab();
  const activeTarget = activeTab?.id
    ? runtimeState.targets.get(activeTab.id) ?? (await registerTab(activeTab))
    : null;

  if (activeTarget) {
    return activeTarget;
  }

  return choosePopupTarget({
    activeTabId: activeTab?.id ?? null,
    lastTargetTabId: runtimeState.lastTargetTabId,
    targets: runtimeState.targets
  });
}

async function getActiveTab() {
  const tabs = await queryTabs({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

function findTargetById(targetId: string) {
  return Array.from(runtimeState.targets.values()).find(
    (target) => target.targetId === targetId
  );
}

function readTargetId(payload: Record<string, unknown>) {
  const targetId = payload.targetId;
  return typeof targetId === "string" ? targetId : null;
}

async function ensureSettings(): Promise<BridgeSettings> {
  const stored = await storageGet<BridgeSettings>(STORAGE_KEY);
  if (stored?.endpoint && stored.sessionId) {
    runtimeState.settings = stored;
    return stored;
  }

  const settings = {
    ...createDefaultBridgeSettings(),
    sessionId: `session-${crypto.randomUUID().slice(0, 8)}`
  };
  await storageSet(STORAGE_KEY, settings);
  runtimeState.settings = settings;
  return settings;
}

async function loadRecordingStore(): Promise<RecordingStore> {
  const snapshot = await sessionStorageGet(RECORDINGS_SESSION_KEY);
  return RecordingStore.fromSnapshot(snapshot);
}

async function persistRecordingStore(): Promise<void> {
  await sessionStorageSet(
    RECORDINGS_SESSION_KEY,
    runtimeState.recordings.snapshot()
  );
}

async function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

async function storageSet<T>(key: string, value: T): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

async function sessionStorageGet<T>(key: string): Promise<T | undefined> {
  const store = chrome.storage.session ?? chrome.storage.local;
  return new Promise((resolve) => {
    store.get([key], (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

async function sessionStorageSet<T>(key: string, value: T): Promise<void> {
  const store = chrome.storage.session ?? chrome.storage.local;
  await new Promise<void>((resolve) => {
    store.set({ [key]: value }, () => resolve());
  });
}

async function queryTabs(queryInfo: chrome.tabs.QueryInfo) {
  return new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query(queryInfo, resolve);
  });
}

async function getAllCookies(url: string) {
  return new Promise<chrome.cookies.Cookie[]>((resolve) => {
    chrome.cookies.getAll({ url }, resolve);
  });
}

async function attachDebugger(tabId: number) {
  await new Promise<void>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function detachDebugger(tabId: number) {
  await new Promise<void>((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}
