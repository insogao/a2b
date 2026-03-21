export type BridgeTargetDescriptor = {
  targetId: string;
  tabId: number;
  title: string;
  origin: string;
  url: string;
};

type MinimalTab = Pick<chrome.tabs.Tab, "id" | "title" | "url">;

export function createTargetDescriptor(
  tab: MinimalTab,
  _sessionId: string
): BridgeTargetDescriptor {
  if (!tab.id) {
    throw new Error("Cannot create a target descriptor without a tab id");
  }
  if (!tab.url) {
    throw new Error("Cannot create a target descriptor without a tab url");
  }

  const parsedUrl = new URL(tab.url);

  return {
    targetId: `tab-${tab.id}`,
    tabId: tab.id,
    title: tab.title ?? parsedUrl.hostname,
    origin: parsedUrl.origin,
    url: tab.url
  };
}

export function formatTargetDescriptor(
  descriptor: BridgeTargetDescriptor,
  bridgeUrl: string
): string {
  return [
    `Bridge: ${bridgeUrl}`,
    `Target: ${descriptor.targetId}`,
    `Origin: ${descriptor.origin}`,
    `Title: ${descriptor.title}`,
    `URL: ${descriptor.url}`
  ].join("\n");
}

export function toBridgeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed;
  }
  return `ws://${trimmed.replace(/\/+$/, "")}/ws`;
}
