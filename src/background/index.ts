import { choosePopupTarget } from "./activeTarget";
import { listBrowsableTargets } from "./browserAccess";
import { BridgeClient } from "./bridgeClient";
import { createBridgeRecoveryScheduler } from "./bridgeRecovery";
import {
  filterCookiesForUrl,
  toCookiesResponse
} from "./cookies";
import { RecordingStore } from "./recordings";
import {
  captureScreenshot,
  runEvalOperation,
  runScriptOperation,
  runSelectorOperation,
  waitForSelector
} from "./operations";
import {
  closeTargetTab,
  goBackInTab,
  goForwardInTab,
  navigateTargetTab,
  reloadTargetTab
} from "./navigation";
import { withTargetLock } from "./targetLocks";
import {
  createDefaultBridgeSettings,
  type BridgeSettings,
  type ExtensionRuntimeState
} from "./state";
import { createRuntimeStartupHandler } from "./startup";
import { resolveTargetById } from "./targetLookup";
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

const bridgeRecovery = createBridgeRecoveryScheduler({
  attemptReconnect: () => {
    void ensureBridgeConnection();
  }
});

const runtimeStartupHandler = createRuntimeStartupHandler({
  isBrowserAccessEnabled,
  ensureBridgeConnection,
  syncCurrentWindowTargets
});

const bridgeClient = new BridgeClient({
  endpoint: runtimeState.settings.endpoint,
  onStateChange: (status) => {
    runtimeState.bridgeStatus = status;
    bridgeRecovery.onStatusChange(status);
  },
  onOpen: () => {
    bridgeClient.send({
      type: "hello",
      payload: {
        sessionId: runtimeState.settings.sessionId,
        extensionId: chrome.runtime.id,
        guideUrl: chrome.runtime.getURL("ai-guide.html")
      }
    });
    void syncCurrentWindowTargets();
  },
  onMessage: (payload) => {
    void handleBridgeMessage(payload);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettings();
  chrome.alarms.create(BRIDGE_POLL_ALARM, {
    periodInMinutes: 0.5
  });
});

chrome.runtime.onStartup.addListener(() => {
  void runtimeStartupHandler();
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
  if (!isBrowserAccessEnabled()) {
    return;
  }
  void registerActiveTab();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!isBrowserAccessEnabled()) {
    return;
  }
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
    periodInMinutes: 0.5
  });
  if (isBrowserAccessEnabled()) {
    await ensureBridgeConnection();
    await syncCurrentWindowTargets();
  } else {
    clearRuntimeTargets();
  }
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
    if (isBrowserAccessEnabled()) {
      await ensureBridgeConnection();
      await syncCurrentWindowTargets();
    }
    return getPopupState();
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.copyCookies"
  ) {
    if (!isBrowserAccessEnabled()) {
      return { cookies: [], header: "" };
    }
    return getCookiesForActiveTarget();
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.browserAccess.enable"
  ) {
    await setBrowserAccessEnabled(true);
    return { ok: true };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.browserAccess.disable"
  ) {
    await setBrowserAccessEnabled(false);
    return { ok: true };
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "popup.recording.start"
  ) {
    if (!isBrowserAccessEnabled()) {
      return { ok: false };
    }
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
    if (!isBrowserAccessEnabled()) {
      return { ok: false };
    }
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
    if (!isBrowserAccessEnabled()) {
      return { ok: false };
    }
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
    await syncCurrentWindowTargets();
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

  try {
    switch (message.type) {
      case "hello":
        sendBridgeResponse(
          "helloAck",
          {
            sessionId: runtimeState.settings.sessionId
          },
          readRequestId(message)
        );
        break;
      case "target.list":
      case "tab.list": {
        const targets = await syncCurrentWindowTargets();
        sendBridgeResponse(
          message.type === "tab.list" ? "tab.list.result" : "target.list.result",
          targets,
          readRequestId(message)
        );
        break;
      }
      case "tab.create": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const createdTab = await createBrowserTab(readOptionalUrl(message.payload));
        const descriptor = createdTab ? await registerTab(createdTab) : null;
        sendBridgeResponse(
          "tab.create.result",
          {
            target: descriptor
          },
          readRequestId(message)
        );
        break;
      }
      case "tab.activate": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const target = await activateBrowserTarget(message.payload);
        sendBridgeResponse(
          "tab.activate.result",
          {
            target
          },
          readRequestId(message)
        );
        break;
      }
      case "tab.goto":
      case "tab.reload":
      case "tab.back":
      case "tab.forward":
      case "tab.close": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const targetId = readTargetId(message.payload);
        if (!targetId) {
          return;
        }
        const target = await resolveTargetById(
          targetId,
          runtimeState.targets,
          syncCurrentWindowTargets
        );
        if (!target) {
          sendBridgeResponse(
            "error",
            {
              message: `Target not found: ${targetId}`
            },
            readRequestId(message)
          );
          return;
        }
        await withTargetLock(targetId, async () => {
          if (message.type === "tab.goto") {
            const result = await navigateTargetTab(
              {
                tabId: target.tabId,
                url: readRequiredString(message.payload, "url")
              },
              { updateTab }
            );
            const updatedTab =
              typeof result.tab?.id === "number"
                ? await registerTab(result.tab as chrome.tabs.Tab)
                : target;
            sendBridgeResponse(
              "tab.goto.result",
              {
                ok: true,
                target: updatedTab
              },
              readRequestId(message)
            );
            return;
          }

          if (message.type === "tab.reload") {
            const result = await reloadTargetTab({ tabId: target.tabId }, { reloadTab });
            sendBridgeResponse("tab.reload.result", result, readRequestId(message));
            return;
          }

          if (message.type === "tab.back") {
            const result = await goBackInTab({ tabId: target.tabId }, { goBack });
            sendBridgeResponse("tab.back.result", result, readRequestId(message));
            return;
          }

          if (message.type === "tab.forward") {
            const result = await goForwardInTab({ tabId: target.tabId }, { goForward });
            sendBridgeResponse("tab.forward.result", result, readRequestId(message));
            return;
          }

          const result = await closeTargetTab({ tabId: target.tabId }, { removeTab });
          runtimeState.targets.delete(target.tabId);
          sendBridgeResponse("tab.close.result", result, readRequestId(message));
        });
        break;
      }
      case "operation.eval":
      case "operation.click":
      case "operation.type":
      case "operation.press":
      case "operation.waitFor":
      case "page.screenshot": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const targetId = readTargetId(message.payload);
        if (!targetId) {
          return;
        }
        const target = await resolveTargetById(
          targetId,
          runtimeState.targets,
          syncCurrentWindowTargets
        );
        if (!target) {
          sendBridgeResponse(
            "error",
            {
              message: `Target not found: ${targetId}`
            },
            readRequestId(message)
          );
          return;
        }
        await withTargetLock(targetId, async () => {
          if (message.type === "operation.eval") {
            const result = await runEvalOperation(
              {
                tabId: target.tabId,
                expression: readRequiredString(message.payload, "expression")
              },
              {
                executeScript
              }
            );
            sendBridgeResponse("operation.result", result, readRequestId(message));
            return;
          }

          if (message.type === "operation.waitFor") {
            const result = await waitForSelector(
              {
                tabId: target.tabId,
                selector: readRequiredString(message.payload, "selector"),
                timeoutMs: readTimeoutMs(message.payload)
              },
              {
                executeScript
              }
            );
            sendBridgeResponse("operation.result", result, readRequestId(message));
            return;
          }

          if (message.type === "page.screenshot") {
            const result = await captureScreenshot(
              {
                tabId: target.tabId
              },
              {
                attachDebugger,
                sendDebuggerCommand,
                detachDebugger
              }
            );
            sendBridgeResponse("page.screenshot.result", result, readRequestId(message));
            return;
          }

          const result = await runSelectorOperation(
            {
              tabId: target.tabId,
              kind: message.type === "operation.click"
                ? "click"
                : message.type === "operation.type"
                  ? "type"
                  : "press",
              selector: readRequiredString(message.payload, "selector"),
              value: readOptionalTextValue(message.payload)
            },
            {
              executeScript
            }
          );
          sendBridgeResponse("operation.result", result, readRequestId(message));
        });
        break;
      }
      case "script.run": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const targetId = readTargetId(message.payload);
        if (!targetId) {
          return;
        }
        const target = await resolveTargetById(
          targetId,
          runtimeState.targets,
          syncCurrentWindowTargets
        );
        if (!target) {
          sendBridgeResponse(
            "error",
            {
              message: `Target not found: ${targetId}`
            },
            readRequestId(message)
          );
          return;
        }
        await withTargetLock(targetId, async () => {
          const result = await runScriptOperation(
            {
              tabId: target.tabId,
              source: readRequiredString(message.payload, "source")
            },
            {
              executeScript
            }
          );
          sendBridgeResponse("script.run.result", result, readRequestId(message));
        });
        break;
      }
      case "cookies.get": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const targetId = readTargetId(message.payload);
        if (!targetId) {
          return;
        }
        const target = await resolveTargetById(
          targetId,
          runtimeState.targets,
          syncCurrentWindowTargets
        );
        if (!target) {
          sendBridgeResponse(
            "error",
            {
              message: `Target not found: ${targetId}`
            },
            readRequestId(message)
          );
          return;
        }
        const response = await getCookiesForTarget(target.targetId, target.url);
        sendBridgeResponse("cookies.result", response, readRequestId(message));
        break;
      }
      case "recording.start":
      case "recording.stop":
      case "recording.get":
      case "recording.clear": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
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
        sendBridgeResponse(
          "recording.result",
          {
            targetId,
            entries: runtimeState.recordings.get(targetId),
            active: runtimeState.recordings.isActive(targetId)
          },
          readRequestId(message)
        );
        break;
      }
      case "debugger.attach":
      case "debugger.detach": {
        if (!isBrowserAccessEnabled()) {
          return;
        }
        const targetId = readTargetId(message.payload);
        if (!targetId) {
          return;
        }
        const target = await resolveTargetById(
          targetId,
          runtimeState.targets,
          syncCurrentWindowTargets
        );
        if (!target) {
          sendBridgeResponse(
            "error",
            {
              message: `Target not found: ${targetId}`
            },
            readRequestId(message)
          );
          return;
        }
        await withTargetLock(targetId, async () => {
          if (message.type === "debugger.attach") {
            await attachDebugger(target.tabId);
          } else {
            await detachDebugger(target.tabId);
          }
          sendBridgeResponse(
            "debugger.result",
            {
              targetId,
              attached: message.type === "debugger.attach"
            },
            readRequestId(message)
          );
        });
        break;
      }
    }
  } catch (error) {
    sendBridgeResponse(
      "error",
      {
        message: error instanceof Error ? error.message : String(error)
      },
      readRequestId(message)
    );
  }
}

async function getPopupState(): Promise<PopupState> {
  if (!isBrowserAccessEnabled()) {
    return {
      bridgeUrl: toBridgeUrl(runtimeState.settings.endpoint),
      guideUrl: chrome.runtime.getURL("ai-guide.html"),
      bridgeStatus: "disconnected",
      browserAccessEnabled: false,
      copied: false,
      cookieHeader: null,
      recordingActive: false,
      recordingCount: 0,
      target: null
    };
  }

  const target = await getActiveTarget();
  const cookieResult = target
    ? await getCookiesForTarget(target.targetId, target.url).catch(() => null)
    : null;

  return {
    bridgeUrl: toBridgeUrl(runtimeState.settings.endpoint),
    guideUrl: chrome.runtime.getURL("ai-guide.html"),
    bridgeStatus: runtimeState.bridgeStatus,
    browserAccessEnabled: runtimeState.settings.browserAccessEnabled,
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
  if (!isBrowserAccessEnabled()) {
    return null;
  }
  await ensureBridgeConnection();
  const tab = await getActiveTab();
  if (!tab) {
    return null;
  }
  return registerTab(tab);
}

async function registerTab(tab: chrome.tabs.Tab) {
  if (!isBrowserAccessEnabled()) {
    return null;
  }
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
  if (!isBrowserAccessEnabled()) {
    bridgeClient.disconnect();
    return;
  }
  if (bridgeClient.status === "connecting") {
    return;
  }
  await bridgeClient.refreshStatus();
  if (bridgeClient.status === "connected") {
    return;
  }
  await bridgeClient.start();
}

async function getActiveTarget() {
  if (!isBrowserAccessEnabled()) {
    return null;
  }
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

function readRequestId(message: { requestId?: unknown }) {
  return typeof message.requestId === "string" ? message.requestId : undefined;
}

function sendBridgeResponse(
  type: string,
  payload: Record<string, unknown> | Record<string, unknown>[] | unknown[],
  requestId?: string
) {
  bridgeClient.send(
    requestId
      ? {
          type: type as never,
          requestId,
          payload
        }
      : {
          type: type as never,
          payload
        }
  );
}

async function ensureSettings(): Promise<BridgeSettings> {
  const stored = await storageGet<BridgeSettings>(STORAGE_KEY);
  if (stored?.endpoint && stored.sessionId) {
    const settings = {
      ...createDefaultBridgeSettings(),
      ...stored,
      browserAccessEnabled: stored.browserAccessEnabled ?? true
    };
    runtimeState.settings = settings;
    return settings;
  }

  const settings = {
    ...createDefaultBridgeSettings(),
    sessionId: `session-${crypto.randomUUID().slice(0, 8)}`
  };
  await storageSet(STORAGE_KEY, settings);
  runtimeState.settings = settings;
  return settings;
}

function readOptionalUrl(payload: Record<string, unknown>) {
  return typeof payload.url === "string" && payload.url.length > 0
    ? payload.url
    : undefined;
}

function readRequiredString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

function readOptionalTextValue(payload: Record<string, unknown>) {
  const text = payload.text;
  if (typeof text === "string") {
    return text;
  }
  const key = payload.key;
  return typeof key === "string" ? key : undefined;
}

function readTimeoutMs(payload: Record<string, unknown>) {
  const value = payload.timeoutMs;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 5000;
}

function isBrowserAccessEnabled() {
  return runtimeState.settings.browserAccessEnabled;
}

function clearRuntimeTargets() {
  runtimeState.targets.clear();
  runtimeState.lastTargetTabId = null;
}

async function setBrowserAccessEnabled(enabled: boolean) {
  runtimeState.settings = {
    ...runtimeState.settings,
    browserAccessEnabled: enabled
  };
  await storageSet(STORAGE_KEY, runtimeState.settings);

  if (!enabled) {
    clearRuntimeTargets();
    bridgeClient.disconnect();
    runtimeState.bridgeStatus = "disconnected";
    return;
  }

  await ensureBridgeConnection();
  await syncCurrentWindowTargets();
}

async function syncCurrentWindowTargets() {
  const tabs = await queryTabs({ currentWindow: true });
  const targets = listBrowsableTargets(
    tabs,
    runtimeState.settings.sessionId,
    runtimeState.settings.browserAccessEnabled
  );

  clearRuntimeTargets();
  for (const target of targets) {
    runtimeState.targets.set(target.tabId, target);
    runtimeState.lastTargetTabId ??= target.tabId;
    if (bridgeClient.status === "connected") {
      bridgeClient.send({
        type: "target.register",
        payload: target
      });
    }
  }

  return targets;
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

async function createBrowserTab(url?: string) {
  return new Promise<chrome.tabs.Tab>((resolve) => {
    chrome.tabs.create({ url, active: true }, resolve);
  });
}

async function updateTab(
  tabId: number,
  updateProperties: chrome.tabs.UpdateProperties
) {
  return new Promise<chrome.tabs.Tab>((resolve) => {
    chrome.tabs.update(tabId, updateProperties, resolve);
  });
}

async function reloadTab(tabId: number) {
  await new Promise<void>((resolve) => {
    chrome.tabs.reload(tabId, {}, () => resolve());
  });
}

async function goBack(tabId: number) {
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.goBack(tabId, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function goForward(tabId: number) {
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.goForward(tabId, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function removeTab(tabId: number) {
  await new Promise<void>((resolve) => {
    chrome.tabs.remove(tabId, () => resolve());
  });
}

async function executeScript(options: Record<string, unknown>) {
  return new Promise<Array<{ result: unknown }>>((resolve, reject) => {
    chrome.scripting.executeScript(
      options as chrome.scripting.ScriptInjection<unknown[], unknown>,
      (results) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve((results ?? []) as Array<{ result: unknown }>);
      }
    );
  });
}

async function activateBrowserTarget(payload: Record<string, unknown>) {
  const targetId = readTargetId(payload);
  const targetById = targetId ? findTargetById(targetId) : null;
  const tabId =
    targetById?.tabId ??
    (typeof payload.tabId === "number" ? payload.tabId : null);

  if (!tabId) {
    return null;
  }

  const tab = await new Promise<chrome.tabs.Tab>((resolve) => {
    chrome.tabs.update(tabId, { active: true }, resolve);
  });

  return registerTab(tab);
}

async function getAllCookies(url: string) {
  return new Promise<chrome.cookies.Cookie[]>((resolve) => {
    chrome.cookies.getAll({ url }, resolve);
  });
}

async function attachDebugger(tabId: number) {
  return new Promise<boolean>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        if (lastError.message.includes("already attached")) {
          resolve(false);
          return;
        }
        reject(new Error(lastError.message));
        return;
      }
      resolve(true);
    });
  });
}

async function sendDebuggerCommand(
  tabId: number,
  method: string,
  params?: Record<string, unknown>
) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve((result ?? {}) as Record<string, unknown>);
    });
  });
}

async function detachDebugger(tabId: number) {
  await new Promise<void>((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}
