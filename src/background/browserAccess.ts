import {
  createTargetDescriptor,
  type BridgeTargetDescriptor
} from "../shared/targets";

export function isBrowsableTab(tab: chrome.tabs.Tab): boolean {
  return Boolean(tab.id && tab.url && /^https?:/.test(tab.url));
}

export function listBrowsableTargets(
  tabs: chrome.tabs.Tab[],
  sessionId: string,
  browserAccessEnabled: boolean
): BridgeTargetDescriptor[] {
  if (!browserAccessEnabled) {
    return [];
  }

  return tabs
    .filter(isBrowsableTab)
    .map((tab) => createTargetDescriptor(tab, sessionId));
}
