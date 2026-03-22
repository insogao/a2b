type TabShape = Pick<chrome.tabs.Tab, "id" | "title" | "url">;

type NavigationDependencies = {
  updateTab: (
    tabId: number,
    updateProperties: chrome.tabs.UpdateProperties
  ) => Promise<TabShape>;
  reloadTab: (tabId: number) => Promise<void>;
  goBack: (tabId: number) => Promise<void>;
  goForward: (tabId: number) => Promise<void>;
  removeTab: (tabId: number) => Promise<void>;
};

export async function navigateTargetTab(
  input: { tabId: number; url: string },
  dependencies: Pick<NavigationDependencies, "updateTab">
) {
  const tab = await dependencies.updateTab(input.tabId, { url: input.url });
  return {
    ok: true,
    tab
  };
}

export async function reloadTargetTab(
  input: { tabId: number },
  dependencies: Pick<NavigationDependencies, "reloadTab">
) {
  await dependencies.reloadTab(input.tabId);
  return { ok: true };
}

export async function goBackInTab(
  input: { tabId: number },
  dependencies: Pick<NavigationDependencies, "goBack">
) {
  await dependencies.goBack(input.tabId);
  return { ok: true };
}

export async function goForwardInTab(
  input: { tabId: number },
  dependencies: Pick<NavigationDependencies, "goForward">
) {
  await dependencies.goForward(input.tabId);
  return { ok: true };
}

export async function closeTargetTab(
  input: { tabId: number },
  dependencies: Pick<NavigationDependencies, "removeTab">
) {
  await dependencies.removeTab(input.tabId);
  return { ok: true };
}
